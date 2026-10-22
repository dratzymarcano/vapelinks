import type { APIRoute } from 'astro';
import productsRaw from '../data/products.json';
import disposableVapes from '../data/disposable-vapes.json';
import collections from '../data/collections.json';
import pagesData from '../data/pages.json';
import blogPosts from '../data/blog-posts.json';

export const prerender = true;

const SITE = 'https://mrnicevape.com';
const BUILD_DATE = '2026-10-20';

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export const GET: APIRoute = () => {
  const urls: { loc: string; lastmod: string }[] = [];

  // Core static pages (canonical, 200 OK, indexable)
  const staticPaths = [
    '/',
    '/about',
    '/contact',
    '/faq',
    '/blog',
    '/collections',
    '/collections/shop',
  ];
  for (const p of staticPaths) {
    urls.push({ loc: `${SITE}${p}`, lastmod: BUILD_DATE });
  }

  // Indexable informational & legal pages
  for (const page of pagesData as any[]) {
    if (!page?.handle) continue;
    const lastmod = page.updated_at ? page.updated_at.split('T')[0] : BUILD_DATE;
    urls.push({ loc: `${SITE}/pages/${page.handle}`, lastmod });
  }

  // Non-empty collections
  for (const col of collections as any[]) {
    if (!col?.handle || (col.products_count ?? 0) <= 0) continue;
    urls.push({ loc: `${SITE}/collections/${col.handle}`, lastmod: BUILD_DATE });
  }

  // Blog posts
  for (const post of blogPosts as any[]) {
    if (!post?.slug) continue;
    urls.push({ loc: `${SITE}/blog/${post.slug}`, lastmod: post.date || BUILD_DATE });
  }

  // Products & Disposables
  const allProducts = [...(productsRaw as any[]), ...(disposableVapes as any[])];
  for (const prod of allProducts) {
    if (!prod?.handle) continue;
    urls.push({ loc: `${SITE}/products/${prod.handle}`, lastmod: BUILD_DATE });
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${escapeXml(u.loc)}</loc>
    <lastmod>${escapeXml(u.lastmod)}</lastmod>
  </url>`
  )
  .join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
