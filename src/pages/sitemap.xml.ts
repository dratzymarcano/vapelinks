import type { APIRoute } from 'astro';
import productsRaw from '../data/products.json';
import disposableVapes from '../data/disposable-vapes.json';
import collectionsData from '../data/collections.json';
import blogPosts from '../data/blog-posts.json';
import pagesData from '../data/pages.json';

export const prerender = true;

const SITE = 'https://mrnicevape.com';

function normalizePath(pathname: string) {
  if (!pathname) return '/';
  if (!pathname.startsWith('/')) return `/${pathname}`;
  return pathname;
}

function hasLowQualitySlug(pathname: string) {
  const lower = pathname.toLowerCase();
  return (
    lower.includes('/copy-of-') ||
    lower.includes('healthcabinhealthcabin') ||
    lower.includes('/products/copy-of-') ||
    lower.length > 180
  );
}

function isIndexablePath(pathname: string) {
  if (!pathname) return false;
  if (hasLowQualitySlug(pathname)) return false;
  return true;
}

const INDEXABLE_PAGE_HANDLES = new Set([
  'about-us',
  'battery-info',
  'brands',
  'vape-brands',
  'vape-shop-koeln',
  'disposable-vapes-deutschland',
  'e-liquid-online-shop-deutschland',
  'nikotin-vape-juice-deutschland',
  'terms-conditions',
  'privacy-policy',
  'refund-policy',
  'shipping-policy',
  'cookies-policy',
]);

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export const GET: APIRoute = () => {
  const today = new Date().toISOString().split('T')[0];

  const staticRoutes = [
    '/',
    '/about',
    '/contact',
    '/faq',
    '/blog',
    '/collections',
    '/collections/shop',
  ];

  const collectionRoutes = (collectionsData as any[])
    .map((collection) => collection?.handle)
    .filter(Boolean)
    .map((handle) => `/collections/${handle}`);

  const productRoutes = [...(productsRaw as any[]), ...(disposableVapes as any[])]
    .map((product) => product?.handle)
    .filter(Boolean)
    .map((handle) => `/products/${handle}`);

  const blogRoutes = (blogPosts as any[])
    .map((post) => post?.slug)
    .filter(Boolean)
    .map((slug) => `/blog/${slug}`);

  const pageRoutes = (pagesData as any[])
    .map((page) => page?.handle)
    .filter((handle) => handle && INDEXABLE_PAGE_HANDLES.has(handle))
    .map((handle) => `/pages/${handle}`);

  const excluded = new Set(['/cart', '/checkout', '/order-confirmation', '/search', '/404']);

  const uniquePaths = [
    ...new Set([
      ...staticRoutes,
      ...collectionRoutes,
      ...productRoutes,
      ...blogRoutes,
      ...pageRoutes,
    ]),
  ]
    .map(normalizePath)
    .filter((path) => !excluded.has(path))
    .filter(isIndexablePath);

  const urls = uniquePaths
    .map((path) => {
      const loc = path === '/' ? SITE : `${SITE}${path}`;
      return `  <url>\n    <loc>${escapeXml(loc)}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${path.startsWith('/products/') ? 'weekly' : 'daily'}</changefreq>\n    <priority>${
        path === '/' ? '1.0' : path.startsWith('/collections/') ? '0.8' : path.startsWith('/products/') ? '0.6' : '0.5'
      }</priority>\n  </url>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
