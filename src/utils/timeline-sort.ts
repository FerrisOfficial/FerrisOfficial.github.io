export type TimelineDatedEntry = {
  data: {
    startDate: Date;
  };
};

/** Newest-first means newest start date, regardless of range end date. */
export function compareTimelineNewest(a: TimelineDatedEntry, b: TimelineDatedEntry): number {
  return b.data.startDate.getTime() - a.data.startDate.getTime();
}
