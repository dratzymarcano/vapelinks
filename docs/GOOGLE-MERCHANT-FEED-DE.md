# Google Merchant Center Feed Specification - Germany

Date: 2026-05-03  
Feed endpoint: `https://mrnicevape.com/google-merchant-feed.xml`  
Implementation file: `src/pages/google-merchant-feed.xml.ts`

## Policy Warning

Vape and e-cigarette products are restricted or disallowed in many Google commercial surfaces. Do not submit the feed until Merchant Center policy eligibility is reviewed for Germany and the specific product assortment. The current feed excludes Shopping Ads and is designed as a technical foundation for Free Listings eligibility review, not as a guarantee of approval.

## Account Configuration

Required Merchant Center setup:

- Business country: Germany.
- Currency: EUR.
- Website verified and claimed: `https://mrnicevape.com`.
- Business information: legal German business name, valid address, phone, support email.
- Shipping settings: Germany only.
- Returns settings: 14-day return policy, exceptions for sealed/regulated goods reviewed legally.
- Tax/VAT: configure German VAT treatment according to accounting/legal advice.
- Automatic item updates: enabled for price and availability when possible.
- Free listings: enabled only after policy review.
- Shopping ads destination: excluded unless policy counsel and Google policy explicitly allow it.

## Generated Feed Attributes

The feed currently emits:

| Attribute | Source | Notes |
|---|---|---|
| `g:id` | `product.id`, fallback variant id/handle | Stable product ID. |
| `g:title` | vendor + product title | Truncated to 150 chars. |
| `g:description` | stripped `body_html` | Truncated to 5,000 chars. |
| `g:link` | `/products/{handle}` | Canonical product URL. |
| `g:image_link` | first local/src image | Absolute URL. |
| `g:availability` | first variant availability | `in_stock` or `out_of_stock`. |
| `g:price` | first variant price | EUR formatted. |
| `g:brand` | product vendor | Falls back to Mr. Nice Vape Deutschland. |
| `g:mpn` | SKU or handle | GTIN unavailable in current data. |
| `g:condition` | static | `new`. |
| `g:adult` | static | `yes`. |
| `g:age_group` | static | `adult`. |
| `g:product_type` | product type | Current catalog taxonomy. |
| `g:google_product_category` | static | Conservative generic category; refine after policy review. |
| `g:shipping` | static | DE Standardversand 9.95 EUR. |
| `g:excluded_destination` | static | `Shopping_ads`. |
| `g:custom_label_0` | static | `18plus`. |

## Missing High-Value Attributes

Add these to product data when available:

- `gtin`: EAN-13 or GTIN for every commercial product with a valid identifier.
- `additional_image_link`: secondary product/lifestyle images.
- `sale_price`: when sale pricing is active.
- `sale_price_effective_date`: ISO date range for sales.
- `shipping_weight`: helpful for logistics and policy review.
- `unit_pricing_measure`: for liquids where legally useful.
- `product_highlight`: concise feature bullets.
- `return_policy_label`: after Merchant Center return policy setup.
- `availability_date`: for preorder items.
- `expiration_date`: only for temporary listings.

## Feed Quality Rules

Before submission:

- Titles must be factual, not promotional spam.
- Descriptions must not make medical or cessation claims.
- No all-caps keyword stuffing.
- Image URLs must return 200 and be crawlable.
- Product pages must show matching title, price, availability and image.
- Prices must include VAT wording on page if legally required.
- Out-of-stock products should remain accurate.
- Adult/18+ restrictions must be present on site and checkout.
- Returns and shipping policies must be visible and crawlable.

## Product Title Formula

Preferred formula:

`Brand + Product Name + Key Attribute + Size/Resistance/Count`

Examples:

- `Vaporesso XROS Pod Cartridge 0.8 Ohm 4er Pack`
- `GeekVape Aegis Kit 200W mit Tank`
- `Dinner Lady Lemon Tart E-Liquid 100ml`

Avoid:

- Promotional prefixes like `Top Angebot`, `Best`, `Billig`.
- Health or cessation claims.
- Repetition of the same keyword.
- Country stuffing in every product title.

## Product Description Formula

Recommended structure:

1. One factual sentence identifying product type and use case.
2. Key specifications.
3. Compatibility or flavor profile if applicable.
4. Shipping and 18+ note.
5. No unverifiable health statements.

Example:

`Der Vaporesso XROS Pod Cartridge 0.8 Ohm 4er Pack ist ein Ersatzpod fuer kompatible XROS Pod-Systeme. Die Pods eignen sich fuer MTL-Nutzung und sollten gemaess Herstellerangaben verwendet werden. Verkauf ausschliesslich an volljaehrige Personen ab 18 Jahren.`

## Automation Requirements

Daily validation job should check:

- XML parses successfully.
- Product count matches catalog count.
- Every item has id, title, link, image, availability, price, brand.
- Every product URL returns 200.
- Every image URL returns 200.
- No price is `0.00 EUR` unless intentionally free, which should not happen for this catalog.
- No title exceeds 150 characters.
- No description exceeds 5,000 characters.
- No disallowed claims in descriptions.

Suggested command to add later:

```bash
npm run validate:merchant-feed
```

Future script location:

`/scripts/validate-merchant-feed.mjs`

## Merchant Center Monitoring

Weekly checks:

- Diagnostics: critical errors, disapprovals, warnings.
- Item status: active, pending, disapproved, expiring.
- Price/availability mismatch alerts.
- Crawl errors.
- Policy issues.
- Free listing impressions and clicks where available.

Escalation rules:

- Any policy warning: pause submission changes and review product class.
- Any price mismatch: fix immediately.
- Any widespread image crawl issue: check CDN/public paths.
- Any age-restriction warning: verify age-gate and page warnings.

## Structured Data Alignment

Product pages should match the feed:

- Same title concept.
- Same product image.
- Same price and availability.
- Same EUR currency.
- Same return and shipping policy.
- Same canonical URL.

Relevant schema already present:

- Product
- Offer
- AggregateRating
- Review
- MerchantReturnPolicy
- OfferShippingDetails
- ShippingDeliveryTime

Validation:

- Rich Results Test for sample products.
- Schema Markup Validator for Product and BreadcrumbList.
- Merchant Center product data diagnostics after fetch.

## Compliance Review Before Submission

Validate with German legal/policy specialist:

- Whether each product type can appear in Merchant Center Free Listings.
- Whether nicotine-containing products require exclusion.
- Whether Google classifies accessories differently from nicotine products.
- Whether `adult`, age-gate, warning text and checkout verification are sufficient.
- Whether the return policy has regulated-product exceptions.
- Whether VAT and shipping disclosure are correct under PAngV.

## Next Engineering Enhancements

P1:

- Add GTIN/EAN fields to product data.
- Add additional image links.
- Add dynamic shipping price based on delivery option.
- Add feed validation script.
- Add a Merchant feed health CI check.

P2:

- Add supplemental feed support for custom labels.
- Add product margin/priority labels for organic merchandising.
- Add inventory sync from source system.
- Add canonical image fallback validation.

P3:

- Add Content API integration if Merchant Center approval is stable.
- Add separate local inventory feed only if physical store inventory is real.
