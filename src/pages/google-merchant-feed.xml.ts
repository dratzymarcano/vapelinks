import type { APIRoute } from 'astro';
import productsRaw from '../data/products.json';
import disposableVapes from '../data/disposable-vapes.json';

export const prerender = true;

const SITE = 'https://mrnicevape.com';
const SHIPPING_STANDARD = '9.95 EUR';
const DEFAULT_CATEGORY = 'Health & Beauty > Personal Care';

function escapeXml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function stripHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function absoluteUrl(path?: string) {
  if (!path) return `${SITE}/images/hero-bg.jpg`;
  return path.startsWith('http') ? path : `${SITE}${path.startsWith('/') ? path : `/${path}`}`;
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return value.slice(0, maxLength - 1).trim();
}

function feedItem(product: any) {
  const variant = product.variants?.[0] || {};
  const image = product.images?.[0]?.local || product.images?.[0]?.src;
  const title = truncate(`${product.vendor ? `${product.vendor} ` : ''}${product.title}`.replace(/\s+/g, ' ').trim(), 150);
  const description = truncate(stripHtml(product.body_html || `${product.title} bei Mr. Nice Vape Deutschland online kaufen.`), 5000);
  const id = product.id || variant.id || product.handle;
  const price = `${Number.parseFloat(variant.price || '0').toFixed(2)} EUR`;
  const availability = variant.available ? 'in_stock' : 'out_of_stock';
  const mpn = variant.sku || product.handle;
  const productType = product.product_type || 'Vape-Produkte';

  return `    <item>
      <g:id>${escapeXml(id)}</g:id>
      <g:title>${escapeXml(title)}</g:title>
      <g:description>${escapeXml(description)}</g:description>
      <g:link>${escapeXml(`${SITE}/products/${product.handle}`)}</g:link>
      <g:image_link>${escapeXml(absoluteUrl(image))}</g:image_link>
      <g:availability>${availability}</g:availability>
      <g:price>${escapeXml(price)}</g:price>
      <g:brand>${escapeXml(product.vendor || 'Mr. Nice Vape Deutschland')}</g:brand>
      <g:mpn>${escapeXml(mpn)}</g:mpn>
      <g:condition>new</g:condition>
      <g:adult>yes</g:adult>
      <g:age_group>adult</g:age_group>
      <g:product_type>${escapeXml(productType)}</g:product_type>
      <g:google_product_category>${escapeXml(DEFAULT_CATEGORY)}</g:google_product_category>
      <g:shipping>
        <g:country>DE</g:country>
        <g:service>Standardversand</g:service>
        <g:price>${SHIPPING_STANDARD}</g:price>
      </g:shipping>
      <g:excluded_destination>Shopping_ads</g:excluded_destination>
      <g:custom_label_0>18plus</g:custom_label_0>
    </item>`;
}

export const GET: APIRoute = () => {
  const products = [...(productsRaw as any[]), ...(disposableVapes as any[])]
    .filter((product) => product?.handle && product?.variants?.[0]?.price);

  const items = products.map(feedItem).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Mr. Nice Vape Deutschland Produktfeed</title>
    <link>${SITE}</link>
    <description>Automatischer Produktfeed fuer Google Merchant Center Free Listings in Deutschland. Nur fuer volljaehrige Personen ab 18 Jahren.</description>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};