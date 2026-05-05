import { defineMiddleware } from 'astro:middleware';

/**
 * Canonical host middleware.
 *
 * Ensures all traffic resolves to https://mrnicevape.com and removes duplicate host aliases.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);
  const canonicalHost = 'mrnicevape.com';
  const hostname = url.hostname;

  // Skip for local/dev environments (no headers needed)
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') {
    return next();
  }

  // Skip when URL already matches canonical https — covers prerendered pages at
  // build time (Astro uses the `site` config URL) and direct production hits
  // that are already on the right host+protocol. Avoids accessing request.headers
  // which isn't available during prerendering.
  if (hostname === canonicalHost && url.protocol === 'https:') {
    return next();
  }

  // For requests that arrive via alias domains or non-https, check proxy headers
  const host = (context.request.headers.get('x-forwarded-host') || url.host || '').toLowerCase();
  const protocol = (context.request.headers.get('x-forwarded-proto') || url.protocol.replace(':', '') || 'https').toLowerCase();
  const aliasHosts = new Set(['www.mrnicevape.com', 'mrnicevape.com', 'www.mrnicevape.com', 'mrnicevape.com', 'www.mrnicevape.com']);

  if (host && (aliasHosts.has(host) || protocol !== 'https')) {
    const target = `https://${canonicalHost}${url.pathname}${url.search}`;
    return context.redirect(target, 301);
  }

  return next();
});
