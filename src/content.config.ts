import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * The timeline is the whole site, and it is meant to grow: adding a new job,
 * paper or project later should be creating one Markdown file here, nothing more.
 *
 * Entries sort by `startDate`, oldest first, so the bottom of the page is the present.
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
    /** Optional grade/GPA badge shown on the collapsed entry, e.g. "4.8 avg" or "5/5". */
    grade: z.string().optional(),
    /** Embeds an interactive demo in the expanded entry. */
    demo: z.enum(['catan']).optional(),
    /**
     * Set when the date is a placeholder rather than a confirmed fact, so the
     * unverified ones stay visible instead of quietly becoming canon.
     */
    dateApproximate: z.boolean().default(false),
  }),
});

export const collections = { timeline };
