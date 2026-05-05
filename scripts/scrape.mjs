#!/usr/bin/env node
/**
 * LEGACY SCRIPT — DO NOT USE IN PRODUCTION
 *
 * This script was used during the initial migration from Shopify to Astro.
 * It scraped product, collection, page data and images from the old
 * vapelinkstore.com.au Shopify store and saved them locally.
 *
 * All data has been migrated. This script is kept for reference only.
 */
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'src', 'data');
const IMG_DIR = join(ROOT, 'public', 'images');
const BASE_URL = 'https://vapelinkstore.com.au';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Ensure directories
[DATA_DIR, IMG_DIR, join(IMG_DIR, 'products'), join(IMG_DIR, 'collections'), join(IMG_DIR, 'pages')].forEach(d => {
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
});

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, { headers: { 'User-Agent': UA } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`Failed to parse JSON from ${url}: ${e.message}`)); }
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}

function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    if (existsSync(filepath)) { resolve('exists'); return; }
    const dir = dirname(filepath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    // Normalize URL
    let fullUrl = url;
    if (fullUrl.startsWith('//')) fullUrl = 'https:' + fullUrl;
    if (!fullUrl.startsWith('http')) fullUrl = BASE_URL + fullUrl;

    const mod = fullUrl.startsWith('https') ? https : http;
    mod.get(fullUrl, { headers: { 'User-Agent': UA } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        downloadFile(res.headers.location, filepath).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode} for ${fullUrl}`)); return; }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        writeFileSync(filepath, Buffer.concat(chunks));
        resolve('downloaded');
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}

function sanitizeFilename(url) {
  // Extract meaningful filename from CDN URL
  const parts = url.split('/');
  let name = parts[parts.length - 1].split('?')[0];
  // Clean up the name
  name = name.replace(/[^a-zA-Z0-9._-]/g, '_');
  return name;
}

async function fetchAllProducts() {
  console.log('📦 Fetching all products...');
  const allProducts = [];
  let page = 1;
  while (true) {
    const url = `${BASE_URL}/products.json?limit=250&page=${page}`;
    console.log(`  Page ${page}...`);
    const data = await fetchJSON(url);
    const products = data.products || [];
    if (products.length === 0) break;
    allProducts.push(...products);
    page++;
    // Small delay to be polite
    await new Promise(r => setTimeout(r, 500));
  }
  console.log(`  ✅ Total products: ${allProducts.length}`);
  return allProducts;
}

async function fetchAllCollections() {
  console.log('📂 Fetching all collections...');
  const allCollections = [];
  let page = 1;
  while (true) {
    const url = `${BASE_URL}/collections.json?limit=250&page=${page}`;
    const data = await fetchJSON(url);
    const collections = data.collections || [];
    if (collections.length === 0) break;
    allCollections.push(...collections);
    page++;
    await new Promise(r => setTimeout(r, 500));
  }
  console.log(`  ✅ Total collections: ${allCollections.length}`);
  return allCollections;
}

async function fetchAllPages() {
  console.log('📄 Fetching all pages...');
  const allPages = [];
  let page = 1;
  while (true) {
    const url = `${BASE_URL}/pages.json?limit=250&page=${page}`;
    const data = await fetchJSON(url);
    const pages = data.pages || [];
    if (pages.length === 0) break;
    allPages.push(...pages);
    page++;
    await new Promise(r => setTimeout(r, 500));
  }
  console.log(`  ✅ Total pages: ${allPages.length}`);
  return allPages;
}

async function fetchCollectionProducts(handle) {
  try {
    const url = `${BASE_URL}/collections/${handle}/products.json?limit=250`;
    const data = await fetchJSON(url);
    return (data.products || []).map(p => p.handle);
  } catch {
    return [];
  }
}

async function downloadProductImages(products) {
  console.log('🖼️  Downloading product images...');
  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const product of products) {
    const images = product.images || [];
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const src = img.src;
      if (!src) continue;

      const ext = src.split('?')[0].split('.').pop() || 'jpg';
      const filename = `${product.handle}_${i}.${ext}`;
      const filepath = join(IMG_DIR, 'products', filename);

      try {
        const result = await downloadFile(src, filepath);
        if (result === 'exists') skipped++;
        else downloaded++;
      } catch (e) {
        failed++;
        if (failed <= 5) console.log(`    ⚠️ Failed: ${filename}: ${e.message}`);
      }

      // Show progress every 50 images
      if ((downloaded + skipped + failed) % 50 === 0) {
        console.log(`    Progress: ${downloaded} downloaded, ${skipped} skipped, ${failed} failed`);
      }
    }
  }
  console.log(`  ✅ Images: ${downloaded} downloaded, ${skipped} already existed, ${failed} failed`);
}

async function downloadCollectionImages(collections) {
  console.log('🖼️  Downloading collection images...');
  let count = 0;
  for (const col of collections) {
    if (col.image && col.image.src) {
      const ext = col.image.src.split('?')[0].split('.').pop() || 'jpg';
      const filename = `${col.handle}.${ext}`;
      const filepath = join(IMG_DIR, 'collections', filename);
      try {
        await downloadFile(col.image.src, filepath);
        count++;
      } catch (e) {
        console.log(`    ⚠️ Failed: ${filename}`);
      }
    }
  }
  console.log(`  ✅ Collection images: ${count}`);
}

async function downloadHomepageAssets() {
  console.log('🖼️  Downloading homepage assets...');
  // Download logo
  const logoUrl = '//cdn.shopify.com/s/files/1/0077/0706/6434/files/Logo_51186e80-a1a4-43c3-9121-7156a2e8b4bb.png?v=1621492394';
  try {
    await downloadFile(logoUrl, join(IMG_DIR, 'logo.png'));
    console.log('  ✅ Logo downloaded');
  } catch (e) {
    console.log(`  ⚠️ Logo failed: ${e.message}`);
  }
  // Download favicon
  const faviconUrl = '//vapelinkstore.com.au/cdn/shop/files/favicon_152x.png?v=1628657664';
  try {
    await downloadFile(faviconUrl, join(ROOT, 'public', 'favicon.png'));
    console.log('  ✅ Favicon downloaded');
  } catch (e) {
    console.log(`  ⚠️ Favicon failed: ${e.message}`);
  }
}

// Build a mapping of which products belong to which collection
async function buildCollectionProductMap(collections) {
  console.log('🔗 Building collection-product mappings...');
  const collectionProducts = {};
  for (const col of collections) {
    if (col.products_count > 0) {
      const productHandles = await fetchCollectionProducts(col.handle);
      collectionProducts[col.handle] = productHandles;
      await new Promise(r => setTimeout(r, 300));
    } else {
      collectionProducts[col.handle] = [];
    }
  }
  console.log('  ✅ Collection mappings built');
  return collectionProducts;
}

async function main() {
  console.log('🚀 Starting Mr. Nice Vape scraper...\n');

  // Fetch all data
  const products = await fetchAllProducts();
  const collections = await fetchAllCollections();
  const pages = await fetchAllPages();

  // Build collection -> products mapping
  const collectionProducts = await buildCollectionProductMap(collections);

  // Transform products to lightweight format for Astro
  const productData = products.map(p => ({
    id: p.id,
    handle: p.handle,
    title: p.title,
    body_html: p.body_html || '',
    vendor: p.vendor || '',
    product_type: p.product_type || '',
    created_at: p.created_at,
    updated_at: p.updated_at,
    published_at: p.published_at,
    tags: Array.isArray(p.tags) ? p.tags : (p.tags || '').split(',').map(t => t.trim()).filter(Boolean),
    variants: (p.variants || []).map(v => ({
      id: v.id,
      title: v.title,
      price: v.price,
      compare_at_price: v.compare_at_price,
      sku: v.sku,
      option1: v.option1,
      option2: v.option2,
      option3: v.option3,
      available: v.available !== false,
      weight: v.weight,
      weight_unit: v.weight_unit,
    })),
    options: p.options || [],
    images: (p.images || []).map((img, i) => ({
      src: img.src,
      alt: img.alt || p.title,
      local: `/images/products/${p.handle}_${i}.${(img.src || '').split('?')[0].split('.').pop() || 'jpg'}`,
    })),
  }));

  // Transform collections
  const collectionData = collections.map(c => ({
    id: c.id,
    handle: c.handle,
    title: c.title,
    body_html: c.body_html || '',
    image: c.image ? {
      src: c.image.src,
      alt: c.image.alt || c.title,
      local: `/images/collections/${c.handle}.${(c.image.src || '').split('?')[0].split('.').pop() || 'jpg'}`,
    } : null,
    products_count: c.products_count || 0,
    product_handles: collectionProducts[c.handle] || [],
    published_at: c.published_at,
    sort_order: c.sort_order,
  }));

  // Transform pages
  const pageData = pages.map(p => ({
    id: p.id,
    handle: p.handle,
    title: p.title,
    body_html: p.body_html || '',
    created_at: p.created_at,
    updated_at: p.updated_at,
    published_at: p.published_at,
  }));

  // Save all data as JSON
  console.log('\n💾 Saving data files...');
  writeFileSync(join(DATA_DIR, 'products.json'), JSON.stringify(productData, null, 2));
  writeFileSync(join(DATA_DIR, 'collections.json'), JSON.stringify(collectionData, null, 2));
  writeFileSync(join(DATA_DIR, 'pages.json'), JSON.stringify(pageData, null, 2));

  // Also save the homepage text content from the live meta.json
  let homepageData;
  try {
    const meta = await fetchJSON(`${BASE_URL}/meta.json`);
    homepageData = {
      title: 'Mr. Nice Vape — Online-Vape-Shop in Köln, Deutschland',
      site_name: meta.name || 'Mr. Nice Vape Deutschland',
      description: meta.description || '',
      contact_email: 'info@mrnicevape.com',
      currency: meta.currency || 'EUR',
      money_format: '€ {{amount}}',
    };
  } catch (e) {
    console.log('  ⚠️ Could not fetch meta.json, using fallback');
    homepageData = {
      title: 'Mr. Nice Vape — Online-Vape-Shop in Köln, Deutschland',
      site_name: 'Mr. Nice Vape Deutschland',
      description: 'Mr. Nice Vape — Online-Vape-Shop aus Köln. Großes Sortiment an Vape-Kits, Einweg-Vapes, E-Liquids, Coils, Pods und Zubehör. Schneller deutschlandweiter Versand.',
      contact_email: 'info@mrnicevape.com',
      currency: 'EUR',
      money_format: '€ {{amount}}',
    };
  }
  writeFileSync(join(DATA_DIR, 'site.json'), JSON.stringify(homepageData, null, 2));

  console.log(`  ✅ products.json (${productData.length} products)`);
  console.log(`  ✅ collections.json (${collectionData.length} collections)`);
  console.log(`  ✅ pages.json (${pageData.length} pages)`);
  console.log(`  ✅ site.json`);

  // Download images
  console.log('\n');
  await downloadHomepageAssets();
  await downloadCollectionImages(collections);
  await downloadProductImages(products);

  console.log('\n🎉 Scraping complete!');
  console.log(`   Products: ${productData.length}`);
  console.log(`   Collections: ${collectionData.length}`);
  console.log(`   Pages: ${pageData.length}`);
}

main().catch(e => {
  console.error('❌ Fatal error:', e);
  process.exit(1);
});
