#!/usr/bin/env python3
"""
Fix broken URLs in all JSON data files.
Rewrites old URL patterns to correct Astro paths.
Originally used to clean up URLs after migration from the old platform.
"""
import json
import re
import os

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'src', 'data')

# Load valid handles for reference
with open(os.path.join(DATA_DIR, 'collections.json')) as f:
    collections = json.load(f)
valid_collections = set(c['handle'] for c in collections)
valid_collections.add('shop')

all_products = []
for fname in ['products.json', 'disposable-vapes.json']:
    with open(os.path.join(DATA_DIR, fname)) as f:
        all_products.extend(json.load(f))
valid_products = set(p['handle'] for p in all_products)

with open(os.path.join(DATA_DIR, 'pages.json')) as f:
    pages = json.load(f)
valid_pages = set(p['handle'] for p in pages)

# Collection handle mappings: old Shopify handle → best matching new collection
COLLECTION_REDIRECTS = {
    'vapetasia': 'usa-premium-e-juices',
    'e-juices-australia': 'deutsche-e-liquids',
    'australian-e-liquids-1': 'deutsche-e-liquids',
    'e-liquids': 'e-juices',
    'starter-kits-1': 'all-vape-kits',
    'starter-kits': 'all-vape-kits',
    'pod-system': 'all-vape-kits',
    'pod-systems': 'all-vape-kits',
    'tanks': 'all-accessories',
    'pre-built-tanks': 'all-accessories',
    'box-mods': 'all-accessories',
    'accessories': 'all-accessories',
    'coils': 'all-accessories',
    'replacement-coils': 'all-accessories',
    'replacement-glass': 'all-accessories',
    'replacement-pods-cartridges': 'all-accessories',
    'batteries': 'all-accessories',
    'chargers': 'all-accessories',
    'cottons': 'all-accessories',
    'vendors': '',  # redirect to /collections
    'disposable-vapes': 'disposable-vapes-1' if 'disposable-vapes-1' in valid_collections else 'shop',
}

# Build redirect map: fill in any missing collection handles
for c in collections:
    COLLECTION_REDIRECTS.setdefault(c['handle'], c['handle'])

fixes_count = 0

def fix_url(match):
    """Fix a single href URL match."""
    global fixes_count
    prefix = match.group(1)  # href=" or href='
    url = match.group(2)
    suffix = match.group(3)  # closing quote
    
    original_url = url
    
    # Decode HTML entities
    url = url.replace('&amp;', '&')
    
    # Strip domain to get path
    path = url
    if path.startswith(('https://mrnicevape.com', 'https://www.mrnicevape.com', 'http://mrnicevape.com', 'http://www.mrnicevape.com')):
        path = re.sub(r'^https?://(www\.)?mrnicevape\.com\.au', '', path)
        if not path:
            path = '/'
    elif not path.startswith('/'):
        # External URL or anchor — skip
        return match.group(0)
    
    # Strip query params (Shopify variant, _pos, _sid, _ss params)
    path_clean = re.sub(r'\?.*$', '', path)
    
    new_url = None
    
    # Pattern 1: /collections/xxx/products/yyy → /products/yyy
    nested = re.match(r'^/collections/[^/]+/products/([^/?]+)', path_clean)
    if nested:
        product_handle = nested.group(1)
        if product_handle in valid_products:
            new_url = f'/products/{product_handle}'
        else:
            # Product doesn't exist — link to shop
            new_url = '/collections/shop'
    
    # Pattern 2: /collections/xxx where xxx doesn't exist
    if not new_url:
        col_match = re.match(r'^/collections/([^/?]+)$', path_clean)
        if col_match:
            handle = col_match.group(1)
            if handle not in valid_collections:
                if handle in COLLECTION_REDIRECTS:
                    target = COLLECTION_REDIRECTS[handle]
                    new_url = f'/collections/{target}' if target else '/collections'
                else:
                    # Unknown collection — redirect to /collections
                    new_url = '/collections'
    
    # Pattern 3: /products/xxx where xxx doesn't exist
    if not new_url:
        prod_match = re.match(r'^/products/([^/?]+)$', path_clean)
        if prod_match:
            handle = prod_match.group(1)
            if handle not in valid_products:
                new_url = '/collections/shop'
    
    # Pattern 4: /pages/contact-us → /contact
    if not new_url and path_clean == '/pages/contact-us':
        new_url = '/contact'
    
    # Pattern 5: /pages/brands → /collections
    if not new_url and path_clean == '/pages/brands':
        new_url = '/collections'
    
    # Pattern 6: /collections/vendors → /collections
    if not new_url and path_clean.startswith('/collections/vendors'):
        new_url = '/collections'
    
    # Pattern 7: Full domain URLs → relative paths (even if valid)
    if not new_url and original_url.startswith(('https://mrnicevape.com', 'https://www.mrnicevape.com')):
        new_url = path_clean
    
    if new_url and new_url != original_url:
        fixes_count += 1
        return f'{prefix}{new_url}{suffix}'
    
    return match.group(0)


def fix_html(html):
    """Fix all URLs in an HTML string."""
    if not html:
        return html
    # Match href="..." and href='...'
    return re.sub(r'(href=["\'])([^"\']*?)(["\'])', fix_url, html)


def fix_json_file(filepath, content_key):
    """Fix URLs in a JSON data file."""
    global fixes_count
    before = fixes_count
    
    with open(filepath, 'r') as f:
        data = json.load(f)
    
    for item in data:
        if content_key in item and item[content_key]:
            item[content_key] = fix_html(item[content_key])
    
    with open(filepath, 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    fixed = fixes_count - before
    print(f'  Fixed {fixed} URLs in {os.path.basename(filepath)} ({content_key})')


# Process all data files
print('Fixing URLs in data files...\n')

fix_json_file(os.path.join(DATA_DIR, 'products.json'), 'body_html')
fix_json_file(os.path.join(DATA_DIR, 'disposable-vapes.json'), 'body_html')
fix_json_file(os.path.join(DATA_DIR, 'blog-posts.json'), 'content')
fix_json_file(os.path.join(DATA_DIR, 'pages.json'), 'body_html')

print(f'\nTotal URLs fixed: {fixes_count}')
