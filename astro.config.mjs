// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import icon from 'astro-icon';

// https://astro.build/config
export default defineConfig({
  site: 'https://maciejstempniak.com',
  integrations: [icon(), sitemap()],
  build: {
    // Inline small stylesheets to cut a render-blocking request on a one-page site.
    inlineStylesheets: 'auto',
  },
  prefetch: false,
});
