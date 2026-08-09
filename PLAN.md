# Portfolio Site — Maciej Stempniak

## Context

Maciej needs a personal portfolio site to represent himself professionally. His Nokia
C++ role ran Oct 2025 – Apr 2026, so this site is going out into a job search and needs
to work on a recruiter who gives it thirty seconds, as well as on an engineer who
actually reads it.

Source material is his CV (`C:\Users\Maciej\Downloads\STAŻ.pdf`): BSc Computer Science
at University of Wrocław (2022–2026), C++20 / Python / ML focus, two Nokia roles working
on 5G RAN energy efficiency, four substantial projects (a C++ game engine + AI simulation
thesis, two YOLOv8 medical-imaging research papers, a .NET 10 API), and a set of
competition and scholarship achievements.

The organizing idea, from Maciej: **the front page is one vertical timeline you scroll
through.** Each entry is a headline plus a date ("C++ Software Developer at Nokia ·
Oct 2025 – Apr 2026"), clickable to expand into detail. The bottom of the timeline does
not just stop — it visibly continues, signalling that the career is still being written.

`C:\Users\Maciej\Repos\My-Site` is currently empty. This is a greenfield build.

## Decisions already made

| Question | Decision |
|---|---|
| Stack | Astro (requires installing Node.js) |
| Theme | Light + dark toggle, follows system preference by default |
| Structure | Single-page chronological timeline; projects interleaved, no separate grid |
| Motion | Rich but controlled |
| Hosting | GitHub Pages, auto-deploy on push |
| Contact | Email, GitHub, LinkedIn (`https://www.linkedin.com/in/stempniak-maciej/`). No phone. |

## Why Astro

The timeline is the whole site, and it is designed to grow. In Astro each entry is one
Markdown file in a content collection with typed frontmatter, so adding next year's job
is creating `2026-09-newrole.md` — not editing a wall of HTML. Astro also ships static
files with zero JavaScript by default (only the theme toggle, accordions and scroll
animations get any), which keeps a heavily-animated page genuinely fast, and it bundles
fonts and icons properly instead of relying on pasted CDN tags.

---

## Phase 0 — Environment

Node.js is not installed. Verified absent: no `node`/`npm` on PATH, nothing in Program
Files, LOCALAPPDATA, fnm or volta. `winget` and the GitHub CLI **are** available, and
git is installed but has **no global `user.name` / `user.email` configured** — that must
be set before any commit.

```bash
winget install OpenJS.NodeJS.LTS
```

Then restart the shell so PATH picks it up, and verify `node -v` / `npm -v`.

## Phase 1 — Scaffold

Create a minimal Astro project in `C:\Users\Maciej\Repos\My-Site`, then add:

- `@fontsource-variable/inter` and `@fontsource-variable/jetbrains-mono` — self-hosted,
  no Google Fonts request. Inter for prose, JetBrains Mono for dates, tech tags and
  labels. The mono accents are what make it read as an engineer's site rather than a
  designer's.
- `astro-icon` + `@iconify-json/lucide` — icons inlined as SVG at build time, zero runtime cost.
- `motion` (Motion One, ~5kb) — for the scroll-linked spine progress and entry reveals.
- `@astrojs/sitemap`.

**No CSS framework.** Hand-written CSS with custom properties. At this size Tailwind adds
config and class noise without paying for itself, and theming is cleaner with tokens.

## Phase 2 — Content model

`src/content.config.ts` defines a `timeline` collection (Astro 5 glob loader) with a Zod
schema:

```ts
{
  title: string,
  org: string | undefined,
  category: 'work' | 'education' | 'project' | 'award',
  startDate: Date,
  endDate: Date | undefined,      // absent = ongoing
  summary: string,                // the one-line teaser shown collapsed
  tech: string[],
  links: { label: string, url: string }[],
  featured: boolean,
}
```

The Markdown body is the expanded detail. Entries sort by `startDate`.

### Entries to author (`src/content/timeline/`)

Ordered oldest → newest, so the bottom of the page is the present:

1. **CLVII Secondary School, Warsaw** — Maths & CS profile · 2019–2022 · education
2. **Honorable mention, Polish Olympiad in Informatics** · award · *(date needed)*
3. **University of Wrocław, BSc Computer Science** · 2022–2026 · education
4. **Scientific Scholarship, University of Wrocław** · award · *(date needed)*
5. **ML Glaucoma Detection** — YOLOv8, PASCAL VOC / PAPILA dataset, research paper · project · *(date needed)*
6. **AI Histopathology Analysis — Melanoma Detection** — YOLOv8, MIARP Research Group, research paper · project · *(date needed)*
7. **HackNation 2025 · AI × Science Hackathon (Google × BeeARD)** · 2025 · award
8. **Summer Internship, Nokia** · Jul 2025 – Oct 2025 · work
9. **C++ Software Developer, Nokia** — 5G RAN energy saving, power efficiency in critical telecom infrastructure · Oct 2025 – Apr 2026 · work
10. **SpaceX Launch Data & Recommendation API** — .NET 10 Minimal API, SQLite, WatchScore ranking engine · project · *(date needed; .NET 10 shipped Nov 2025, so assuming late 2025 / early 2026)*
11. **Catan Game Engine & AI Simulation Platform** — Bachelor thesis, C++ engine + custom AI framework, 7 benchmarked agents · 2026 · project

> **Dates I need from you.** The CV gives no dates for the Olympiad, the scholarship,
> both research papers, or the SpaceX API. I will fill these with clearly-marked
> placeholder dates and list them so you can correct them in one pass — each is a
> one-line frontmatter edit.

## Phase 3 — Build the page

### Layout

```
src/
  layouts/Base.astro            head, meta, JSON-LD Person, theme bootstrap
  components/
    Nav.astro                   sticky, minimal, scroll-progress bar + theme toggle
    Hero.astro
    Timeline.astro              the <ol> spine, category filter chips
    TimelineEntry.astro         one accordion entry
    TimelineEnd.astro           the "still expanding" terminus
    Skills.astro
    Contact.astro
  scripts/  theme.ts, timeline.ts, motion.ts
  styles/   tokens.css, global.css
```

### Hero

Name, a one-line identity ("C++ and systems engineer — 5G RAN energy efficiency,
high-performance simulation, applied ML"), and a current-status line. This matters
because the timeline runs oldest-first: the hero is what guarantees a recruiter sees the
recent, senior-sounding work immediately without scrolling to the bottom. Contact links
sit here too.

### Timeline

A single left-hand rail — not alternating left/right sides. Alternating looks impressive
in a screenshot but hurts scanability and turns into a responsive mess; a single rail
behaves identically on phone and desktop and reads faster.

Each entry collapsed shows: a mono date pill, a category chip, the title, the org, and
the one-line summary. The whole header is a `<button aria-expanded>` that expands the
body — detail bullets, tech tags, and any links (GitHub, papers).

Above the timeline, filter chips (All / Work / Education / Projects / Awards) animate
entries in and out.

### The terminus — "it still expands"

Past the final entry the spine does not terminate in a hard stop. It continues as a
gradient that fades toward transparent, punctuated by progressively fainter dots, ending
in a single softly-pulsing marker. Alongside it: "the story continues" and an
availability line with the contact call-to-action. This is the element Maciej
specifically asked for, and it doubles as the page's closing CTA.

### Motion (the "rich but controlled" budget)

- Spine progress line fills as you scroll; dots illuminate as they are passed.
- Entries fade and slide in on first view, staggered, via `IntersectionObserver`.
- Accordion expands with a real height transition, not a snap.
- Theme toggle morphs sun ⇄ moon.
- Hover lifts on entries, animated underlines on links.
- The terminus marker pulses continuously — the one thing on the page that moves at rest.

Everything is scroll- or interaction-driven. No parallax, no particle background, no
character-by-character text effects.

### Theme

Tokens in `:root`, overridden under `[data-theme="dark"]`. Default follows
`prefers-color-scheme`; a manual toggle persists to `localStorage`. A tiny **blocking
inline script in `<head>`** applies the stored theme before first paint, which is the
only way to avoid a white flash on load for dark-mode visitors.

### Accessibility

`prefers-reduced-motion: reduce` disables every animation, including the pulse.
Semantic `<ol>` for the timeline, genuine `<button>` + `aria-expanded` accordions
(keyboard-operable, and entries readable with JS disabled), a skip link, visible
`:focus-visible` rings, and WCAG AA contrast verified in both themes.

## Phase 4 — Metadata & assets

Open Graph and Twitter card tags, a generated OG image, an SVG favicon, `robots.txt`,
sitemap, and JSON-LD `Person` structured data wired to the LinkedIn and GitHub profiles.

> **CV download — off by default.** A "Download CV" button is the obvious thing to add,
> but `STAŻ.pdf` contains your phone number, and you chose to keep that off the public
> site. Publishing the PDF would publish the number. I am leaving the button out. If you
> want it, give me a phone-free version of the CV and I will wire it in.

## Phase 5 — Deploy

Recommend naming the repo **`FerrisOfficial.github.io`** — a user site serves from the
domain root, avoiding the `base` path configuration that trips up project-repo Pages
sites. Set `site` in `astro.config.mjs` accordingly.

Add `.github/workflows/deploy.yml` using the official `withastro/action`, so every push
to `main` rebuilds and deploys.

> **Requires your explicit go-ahead.** Creating the GitHub repo and pushing makes this
> public. I will build and show you the site locally first, and will not create the repo
> or push until you confirm. Git also needs `user.name` / `user.email` set before the
> first commit.

## Verification

1. `npm run dev`, open the preview, and walk the full page.
2. **Both themes** — toggle and confirm contrast, then hard-reload in dark mode to
   confirm there is no white flash before paint.
3. **Responsive** — check at mobile (375px), tablet (768px) and desktop widths.
4. **Keyboard only** — tab through nav, filter chips and every accordion; confirm focus
   is always visible and expansion works via Enter/Space.
5. **Reduced motion** — enable the OS setting and confirm the page is completely static,
   pulse included.
6. **Content accuracy** — read every entry against the CV; confirm no phone number
   appears anywhere in the built output.
7. `npm run build` clean, then `npm run preview` on the production bundle.
8. Check the browser console for errors and confirm no external network requests are
   made (fonts and icons should all be local).

## Open items for Maciej

1. The five missing dates listed in Phase 2.
2. Whether you want a phone-free CV published as a download.
3. Links for the two research papers and any public repos for the projects, if they
   exist — the entries have a `links` field ready for them.
