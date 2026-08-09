// WebAssembly entry point for the CatanAPI engine.
//
// The engine's own CLI (runs/run.cpp) owns argument parsing, logging and
// stdout formatting, none of which are useful in a browser. This exposes just
// the part the page needs: run a batch of games between two bots and hand back
// the tally.
//
// Work is deliberately chunked. The caller runs many small batches rather than
// one big one, so the worker can report progress as the win rate converges and
// can be stopped between chunks.

#include <emscripten/emscripten.h>

#include <algorithm>
#include <cstdint>
#include <memory>
#include <string>
#include <vector>

#include "game_simulation/game.hpp"
#include "players/itPlayers/it1Player.hpp"
#include "players/itPlayers/it2Player.hpp"
#include "players/itPlayers/it3Player.hpp"
#include "players/itPlayers/it4Player.hpp"
#include "players/itPlayers/it5Player.hpp"
#include "players/oneTacticPlayers/alphaBetaPlayer.hpp"
#include "players/oneTacticPlayers/cityRushPlayer.hpp"
#include "players/oneTacticPlayers/devPlayer.hpp"
#include "players/oneTacticPlayers/oneResourcePlayer.hpp"
#include "players/playerHelpers.hpp"
#include "players/randomPlayer.hpp"
#include "players/roadPlayer.hpp"
#include "utils/randomDevice.hpp"

namespace {

using PlayerHelpers::effective_vp;

// Mirrors make_player_from_flag() in runs/run.cpp, minus the parametric bots:
// those read tuned weights off disk, which there is no sensible way to ship
// into a browser sandbox.
std::unique_ptr<IPlayer> make_player(const std::string& flag) {
    if (flag == "rp") return std::make_unique<RandomPlayer>();
    if (flag == "it1") return std::make_unique<It1Player>();
    if (flag == "it2") return std::make_unique<It2Player>();
    if (flag == "it3") return std::make_unique<It3Player>();
    if (flag == "it4") return std::make_unique<It4Player>();
    if (flag == "it5") return std::make_unique<It5Player>();
    if (flag == "ab") return std::make_unique<AlphaBetaPlayer>();
    if (flag == "or") return std::make_unique<OneResourcePlayer>();
    if (flag == "dev") return std::make_unique<DevPlayer>();
    if (flag == "road") return std::make_unique<RoadPlayer>();
    if (flag == "cr") return std::make_unique<CityRushPlayer>();
    return nullptr;
}

// Returned strings must outlive the call so JS can read them out of the heap.
std::string g_out;

const char* actionLabel(ActionType t) {
    switch (t) {
        case ActionType::RollDice: return "Roll";
        case ActionType::EndTurn: return "End turn";
        case ActionType::MoveRobber: return "Move robber";
        case ActionType::StealResource: return "Steal";
        case ActionType::DiscardResources: return "Discard";
        case ActionType::BuildRoad: return "Road";
        case ActionType::BuildSettlement: return "Settlement";
        case ActionType::BuildCity: return "City";
        case ActionType::BuyDevCard: return "Buy dev card";
        case ActionType::PlayDevCardKnight: return "Knight";
        case ActionType::PlayDevCardRoadBuilding: return "Road building";
        case ActionType::PlayDevCardYearOfPlenty: return "Year of plenty";
        case ActionType::PlayDevCardMonopoly: return "Monopoly";
        case ActionType::TradeBank: return "Bank trade";
        case ActionType::ReceiveResources: return "Receive";
        case ActionType::PlaceInitialStructures: return "Initial placement";
        case ActionType::Place2InitialStructures: return "Second placement";
        default: return "—";
    }
}

/**
 * One frame of a replay: only the parts of the board a viewer can see change.
 * Kept deliberately small because a full game runs to several hundred frames.
 */
struct Frame {
    uint8_t nodeCell[NODE_COUNT];  // structure << 2 | owner
    uint8_t edgeCell[EDGE_COUNT];  // 0 = no road, else owner + 1
    uint8_t robber = 0;
    uint8_t currentPlayer = 0;
    uint16_t turn = 0;
    uint8_t vp[2] = {0, 0};
    ActionType action = ActionType::NoAction;
    uint8_t actionPlayer = 0;
    uint8_t dice = 0;
};

Frame captureFrame(const Board::BoardState& b) {
    Frame f;
    for (int i = 0; i < NODE_COUNT; ++i) {
        f.nodeCell[i] =
            static_cast<uint8_t>(static_cast<uint8_t>(Board::Node::unpackStructure(b.nodes[i])) << 2 |
                                 static_cast<uint8_t>(Board::Node::unpackOwner(b.nodes[i])));
    }
    for (int i = 0; i < EDGE_COUNT; ++i) {
        f.edgeCell[i] =
            Board::Edge::unpackHasRoad(b.edges[i])
                ? static_cast<uint8_t>(static_cast<uint8_t>(Board::Edge::unpackOwner(b.edges[i])) + 1)
                : 0;
    }
    f.robber = b.robberPosition;
    f.currentPlayer = static_cast<uint8_t>(b.currentPlayer);
    f.turn = b.currentTurn;
    f.vp[0] = static_cast<uint8_t>(effective_vp(&b, PlayerId::Player0));
    f.vp[1] = static_cast<uint8_t>(effective_vp(&b, PlayerId::Player1));
    return f;
}

}  // namespace

extern "C" {

// JSON array of the bots this build can run, so the UI never has to keep its
// own copy of the roster in sync with the engine.
EMSCRIPTEN_KEEPALIVE
const char* catan_bots() {
    g_out = R"([
{"flag":"rp","name":"Random","blurb":"Legal moves, chosen at random","tier":"baseline"},
{"flag":"it1","name":"Iterative 1","blurb":"First pass: basic heuristics","tier":"easy"},
{"flag":"it2","name":"Iterative 2","blurb":"Better placement and robber play","tier":"medium"},
{"flag":"it3","name":"Iterative 3","blurb":"Adds development card management","tier":"medium"},
{"flag":"it4","name":"Iterative 4","blurb":"Optimised development card play","tier":"hard"},
{"flag":"it5","name":"Iterative 5","blurb":"Full strategy, the strongest heuristic bot","tier":"hard"},
{"flag":"ab","name":"Alpha-Beta","blurb":"Adversarial search. Strong, and much slower","tier":"expert"},
{"flag":"cr","name":"City Rush","blurb":"Rushes cities over everything else","tier":"hard"},
{"flag":"dev","name":"Dev Cards","blurb":"Builds around development cards","tier":"hard"},
{"flag":"or","name":"One Resource","blurb":"Corners a single resource","tier":"medium"},
{"flag":"road","name":"Road Builder","blurb":"Chases the longest road","tier":"medium"}
])";
    return g_out.c_str();
}

/**
 * Play `games` games of `flagA` against `flagB`.
 *
 * swapSeats alternates who moves first, because the first player in Catan has
 * a real advantage — without it a matchup measures seating as much as skill.
 * Results are always reported per bot, not per seat.
 *
 * `seedBase` keeps runs reproducible: game i is always seeded seedBase + i.
 */
EMSCRIPTEN_KEEPALIVE
const char* catan_run(const char* flagA, const char* flagB, int games,
                      unsigned int seedBase, int swapSeats) {
    const std::string a = flagA ? flagA : "";
    const std::string b = flagB ? flagB : "";

    if (!make_player(a) || !make_player(b)) {
        g_out = R"({"error":"unknown bot flag"})";
        return g_out.c_str();
    }
    if (games <= 0) {
        g_out = R"({"error":"games must be positive"})";
        return g_out.c_str();
    }

    long long winsA = 0, winsB = 0, draws = 0;
    long long totalTurns = 0, vpTotalA = 0, vpTotalB = 0;

    for (int i = 1; i <= games; ++i) {
        const bool swapped = swapSeats && (i % 2 == 0);
        RandomDevice::seed(seedBase + static_cast<unsigned>(i));

        auto seat0 = make_player(swapped ? b : a);
        auto seat1 = make_player(swapped ? a : b);

        Game game(*seat0, *seat1);
        game.setDumpEnabled(false);  // no logging: keeps this pure computation

        const PlayerId winner = game.runGame();

        totalTurns += static_cast<long long>(game.boardState.currentTurn);

        const int vpSeat0 = effective_vp(&game.boardState, PlayerId::Player0);
        const int vpSeat1 = effective_vp(&game.boardState, PlayerId::Player1);
        vpTotalA += swapped ? vpSeat1 : vpSeat0;
        vpTotalB += swapped ? vpSeat0 : vpSeat1;

        if (winner == PlayerId::NoPlayer) {
            ++draws;
        } else {
            // Map the winning seat back to a bot. seat0 is bot A only when the
            // seats were not swapped this game.
            const bool seat0Won = (winner == PlayerId::Player0);
            const bool seat0IsA = !swapped;
            if (seat0Won == seat0IsA) {
                ++winsA;
            } else {
                ++winsB;
            }
        }
    }

    g_out = "{\"games\":" + std::to_string(games) +
            ",\"winsA\":" + std::to_string(winsA) +
            ",\"winsB\":" + std::to_string(winsB) +
            ",\"draws\":" + std::to_string(draws) +
            ",\"turns\":" + std::to_string(totalTurns) +
            ",\"vpA\":" + std::to_string(vpTotalA) +
            ",\"vpB\":" + std::to_string(vpTotalB) + "}";
    return g_out.c_str();
}

/**
 * Records one complete game so the page can replay it move by move.
 *
 * Pass the tournament's seedBase + 1 to get exactly its first game: catan_run
 * seeds game i with seedBase + i, and seat swapping only applies on even i, so
 * game 1 always has bot A in seat 0.
 *
 * States are captured by playing the game out and then walking it backwards
 * with undoLastAction(). Re-applying the queued actions forwards would not
 * work: applyAction() resolves randomness and packs undo metadata into the
 * action as it goes, so replaying a stored action re-rolls it. Undo is the
 * engine's own exact-restore path and is covered by its test suite.
 *
 * The board geometry is emitted once; frames after the first carry only the
 * cells that changed.
 */
EMSCRIPTEN_KEEPALIVE
const char* catan_replay(const char* flagA, const char* flagB,
                         unsigned int seed) {
    const std::string a = flagA ? flagA : "";
    const std::string b = flagB ? flagB : "";

    auto p0 = make_player(a);
    auto p1 = make_player(b);
    if (!p0 || !p1) {
        g_out = R"({"error":"unknown bot flag"})";
        return g_out.c_str();
    }

    RandomDevice::seed(seed);
    Game game(*p0, *p1);
    game.setDumpEnabled(false);
    const PlayerId winner = game.runGame();

    // Unwind the finished game, collecting states newest-first.
    Board::BoardState cur = game.boardState;
    std::vector<Frame> frames;
    std::vector<Action::PackedAction> actions;
    frames.push_back(captureFrame(cur));
    while (!cur.actionQueue.empty()) {
        actions.push_back(cur.actionQueue.back());
        cur.undoLastAction();
        frames.push_back(captureFrame(cur));
    }
    std::reverse(frames.begin(), frames.end());
    std::reverse(actions.begin(), actions.end());

    // frames[i + 1] is the state after actions[i].
    for (size_t i = 0; i < actions.size() && i + 1 < frames.size(); ++i) {
        const auto act = actions[i];
        frames[i + 1].action = Action::unpackType(act);
        frames[i + 1].actionPlayer = static_cast<uint8_t>(Action::unpackPlayerID(act));
        if (frames[i + 1].action == ActionType::RollDice) {
            frames[i + 1].dice = Action::unpackArg1(act);
        }
    }

    const Board::BoardState& board = game.boardState;
    std::string o;
    o.reserve(96 * 1024);

    o += "{\"seed\":" + std::to_string(seed);
    o += ",\"winner\":" +
         std::string(winner == PlayerId::NoPlayer
                         ? "-1"
                         : (winner == PlayerId::Player0 ? "0" : "1"));
    o += ",\"turns\":" + std::to_string(board.currentTurn);

    // --- static geometry -----------------------------------------------
    o += ",\"hexes\":[";
    for (int i = 0; i < HEX_COUNT; ++i) {
        if (i) o += ',';
        o += "[" + std::to_string(static_cast<int>(Board::Hex::unpackResource(board.hexes[i]))) +
             "," + std::to_string(Board::Hex::unpackCatanNumber(board.hexes[i])) + "]";
    }
    o += "],\"nodes\":[";
    for (int i = 0; i < NODE_COUNT; ++i) {
        if (i) o += ',';
        o += "[[";
        for (int j = 0; j < 3; ++j) {
            if (j) o += ',';
            const auto h = Board::Node::unpackAdjacentHex(board.nodes[i], static_cast<uint8_t>(j));
            o += (h == HexIdNone) ? "-1" : std::to_string(h);
        }
        o += "],";
        o += std::to_string(static_cast<int>(Board::Node::unpackPortType(board.nodes[i])));
        o += "]";
    }
    // Ports, straight from the engine's own constants. Nine harbours: four
    // generic 3:1 and one 2:1 per resource, each occupying the two ends of a
    // single coastal edge. Deriving the pairs by looking for edges whose
    // endpoints share a port type does not work — all four 3:1 harbours carry
    // the same type, so nodes belonging to different harbours can be paired.
    o += "],\"ports\":[";
    {
        bool first = true;
        auto port = [&](NodeId a, NodeId b, PortType type) {
            if (!first) o += ',';
            first = false;
            o += "[" + std::to_string(a) + "," + std::to_string(b) + "," +
                 std::to_string(static_cast<int>(type)) + "]";
        };
        port(brickPortsNodes[0], brickPortsNodes[1], PortType::BrickPort);
        port(lumberPortsNodes[0], lumberPortsNodes[1], PortType::LumberPort);
        port(woolPortsNodes[0], woolPortsNodes[1], PortType::WoolPort);
        port(grainPortsNodes[0], grainPortsNodes[1], PortType::GrainPort);
        port(orePortsNodes[0], orePortsNodes[1], PortType::OrePort);
        for (int i = 0; i < 8; i += 2) {
            port(threeForOnePortsNodes[i], threeForOnePortsNodes[i + 1],
                 PortType::ThreeForOne);
        }
    }

    o += "],\"edges\":[";
    for (int i = 0; i < EDGE_COUNT; ++i) {
        if (i) o += ',';
        o += "[" + std::to_string(Board::Edge::unpackAdjacentNode(board.edges[i], 0)) + "," +
             std::to_string(Board::Edge::unpackAdjacentNode(board.edges[i], 1)) + "]";
    }
    o += "]";

    // --- frames ---------------------------------------------------------
    o += ",\"frames\":[";
    for (size_t i = 0; i < frames.size(); ++i) {
        const Frame& f = frames[i];
        if (i) o += ',';
        o += "{\"t\":" + std::to_string(f.turn);
        o += ",\"p\":" + std::to_string(f.currentPlayer);
        o += ",\"rb\":" + std::to_string(f.robber);
        o += ",\"vp\":[" + std::to_string(f.vp[0]) + "," + std::to_string(f.vp[1]) + "]";
        o += ",\"a\":\"" + std::string(actionLabel(f.action)) + "\"";
        o += ",\"ap\":" + std::to_string(f.actionPlayer);
        if (f.dice) o += ",\"d\":" + std::to_string(f.dice);

        // Frame 0 carries the whole board; the rest carry only differences.
        o += ",\"dn\":[";
        bool first = true;
        for (int n = 0; n < NODE_COUNT; ++n) {
            if (i && f.nodeCell[n] == frames[i - 1].nodeCell[n]) continue;
            if (i == 0 && f.nodeCell[n] == 0) continue;
            if (!first) o += ',';
            first = false;
            o += "[" + std::to_string(n) + "," + std::to_string(f.nodeCell[n]) + "]";
        }
        o += "],\"de\":[";
        first = true;
        for (int e = 0; e < EDGE_COUNT; ++e) {
            if (i && f.edgeCell[e] == frames[i - 1].edgeCell[e]) continue;
            if (i == 0 && f.edgeCell[e] == 0) continue;
            if (!first) o += ',';
            first = false;
            o += "[" + std::to_string(e) + "," + std::to_string(f.edgeCell[e]) + "]";
        }
        o += "]}";
    }
    o += "]}";

    g_out = std::move(o);
    return g_out.c_str();
}

}  // extern "C"
