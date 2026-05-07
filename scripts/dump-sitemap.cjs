const productsRaw = require('../src/data/products.json');
const disposableVapes = require('../src/data/disposable-vapes.json');
const collectionsData = require('../src/data/collections.json');
const blogPosts = require('../src/data/blog-posts.json');
const pagesData = require('../src/data/pages.json');

const SITE = 'https://mrnicevape.com';
const INDEXABLE_PAGE_HANDLES = new Set([
  'about-us','battery-info','brands','vape-brands','vape-shop-koeln',
  'disposable-vapes-deutschland','e-liquid-online-shop-deutschland',
  'nikotin-vape-juice-deutschland','terms-conditions','privacy-policy',
  'refund-policy','shipping-policy','cookies-policy'
]);
const hasLow = (p) => {
  const l = p.toLowerCase();
  return l.includes('/copy-of-') || l.includes('healthcabinhealthcabin') || l.length > 180;
};
const isIdx = (p) => p && !hasLow(p);
const norm = (p) => (!p ? '/' : p.startsWith('/') ? p : '/' + p);

const staticRoutes = ['/', '/about', '/contact', '/faq', '/blog', '/collections', '/collections/shop'];
const collectionRoutes = collectionsData.map(c => c && c.handle).filter(Boolean).map(h => '/collections/' + h);
const productRoutes = [...productsRaw, ...disposableVapes].map(p => p && p.handle).filter(Boolean).map(h => '/products/' + h);
const blogRoutes = blogPosts.map(p => p && p.slug).filter(Boolean).map(s => '/blog/' + s);
const pageRoutes = pagesData.map(p => p && p.handle).filter(h => h && INDEXABLE_PAGE_HANDLES.has(h)).map(h => '/pages/' + h);

const excluded = new Set(['/cart','/checkout','/order-confirmation','/search','/404']);
const all = [...new Set([...staticRoutes, ...collectionRoutes, ...productRoutes, ...blogRoutes, ...pageRoutes])]
  .map(norm).filter(p => !excluded.has(p)).filter(isIdx);

console.log('TOTAL URLS:', all.length);
console.log('\n=== STATIC (' + staticRoutes.length + ') ===');
staticRoutes.forEach(p => console.log(SITE + (p === '/' ? '/' : p)));
console.log('\n=== PAGES (' + pageRoutes.length + ') ===');
pageRoutes.forEach(p => console.log(SITE + p));
console.log('\n=== BLOG (' + blogRoutes.length + ') ===');
blogRoutes.forEach(p => console.log(SITE + p));
console.log('\n=== COLLECTIONS (' + collectionRoutes.length + ') — first 25 ===');
collectionRoutes.slice(0, 25).forEach(p => console.log(SITE + p));
console.log('\n=== PRODUCTS (' + productRoutes.length + ') — first 15 ===');
productRoutes.slice(0, 15).forEach(p => console.log(SITE + p));
