// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap, { ChangeFreqEnum } from '@astrojs/sitemap';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  site: 'https://mrnicevape.com',
  output: 'server',
  adapter: cloudflare(),
  integrations: [
    sitemap({
      filter: (page) =>
        !page.includes('/cart') &&
        !page.includes('/checkout') &&
        !page.includes('/order-confirmation') &&
        !page.includes('/search') &&
        !page.includes('/404'),
      serialize(item) {
        const url = item.url;
        // Homepage
        if (url === 'https://mrnicevape.com/' || url === 'https://mrnicevape.com') {
          item.priority = 1.0;
          item.changefreq = ChangeFreqEnum.DAILY;
        }
        // Collection pages
        else if (url.includes('/collections/')) {
          item.priority = 0.8;
          item.changefreq = ChangeFreqEnum.DAILY;
        }
        // Product pages
        else if (url.includes('/products/')) {
          item.priority = 0.6;
          item.changefreq = ChangeFreqEnum.WEEKLY;
        }
        // Info/legal pages
        else if (url.includes('/pages/')) {
          item.priority = 0.4;
          item.changefreq = ChangeFreqEnum.MONTHLY;
        }
        // Everything else
        else {
          item.priority = 0.5;
          item.changefreq = ChangeFreqEnum.WEEKLY;
        }
        item.lastmod = new Date().toISOString();
        return item;
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()]
  },
  build: {
    inlineStylesheets: 'auto',
  },
  compressHTML: true,
});