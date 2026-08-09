import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * The timeline is the whole site, and it is meant to grow: adding a new job,
 * paper or project later should be creating one Markdown file here, nothing more.
 *
 * Timeline views sort entries by their most recent active date.
 */
const timeline = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/timeline' }),
  schema: z.object({
    /** Headline shown collapsed, e.g. "C++ Software Developer". */
    title: z.string(),
    /** Institution or company. Omit for self-directed work. */
    org: z.string().optional(),
    category: z.enum(['work', 'education', 'project', 'award']),
    startDate: z.coerce.date(),
    /** Omit for a point-in-time event such as an award. */
    endDate: z.coerce.date().optional(),
    /** Renders as "— Present". Takes precedence over endDate. */
    ongoing: z.boolean().default(false),
    /** One-line teaser shown while the entry is collapsed. */
    summary: z.string(),
    tech: z.array(z.string()).default([]),
    links: z
      .array(
        z.object({
          label: z.string(),
          url: z.string().url(),
        }),
      )
      .default([]),
    /** Featured entries get a brighter marker on the spine. */
    featured: z.boolean().default(false),
    /**
     * Optional grade shown as a filled meter on the collapsed entry. Structured
     * rather than a string so the bar can be drawn from the number: a reader who
     * has never seen Polish grading still sees "nearly full" and understands it.
     */
    grade: z
      .object({
        value: z.number(),
        /** Top of the scale. Poland marks out of 5. */
        of: z.number().default(5),
        /** Distinguishes a running average from a single mark, e.g. "avg". */
        label: z.string().optional(),
      })
      .optional(),
    /**
     * Set when the date is a placeholder rather than a confirmed fact, so the
     * unverified ones stay visible instead of quietly becoming canon.
     */
    dateApproximate: z.boolean().default(false),
  }),
});

export const collections = { timeline };
