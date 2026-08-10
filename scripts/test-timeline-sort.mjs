import assert from 'node:assert/strict';
import { compareTimelineNewest } from '../src/utils/timeline-sort.ts';

const entry = (id, startDate, endDate, approximate = false) => ({
  id,
  data: { startDate: new Date(startDate), endDate: endDate ? new Date(endDate) : undefined, approximate },
});

const mixedDates = [
  entry('year-only', '2025-01-01', undefined, true),
  entry('range', '2025-10-01', '2026-04-30'),
  entry('full-date', '2025-12-01'),
].sort(compareTimelineNewest);

assert.deepEqual(
  mixedDates.map(({ id }) => id),
  ['full-date', 'range', 'year-only'],
  'full dates, ranges and year-only entries must sort by start date',
);

const projectRegression = [
  entry('bot-arena', '2023-11-01', '2024-06-30', true),
  entry('glaucoma', '2024-03-01', undefined, true),
].sort(compareTimelineNewest);

assert.deepEqual(
  projectRegression.map(({ id }) => id),
  ['glaucoma', 'bot-arena'],
  'a 2024 project must not appear below a project that started in 2023',
);

console.log('Timeline newest-first sorting checks passed.');
