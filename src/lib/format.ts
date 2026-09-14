/**
 * Sale price display. Publix's promotion text is already formatted
 * ("$13.99", "2 for $8.00", "Buy 1 Get 1 FREE"), so it renders as-is —
 * never with an extra "$" prefix. The only exception is legacy bare
 * numerics from older caches ("2.50"), which get "$" prepended.
 *
 * BOGO items show the promotion in Publix casing ("Buy 1 Get 1 Free")
 * rather than a generic badge, so buy-2-get-1 variants stay accurate.
 */
export function formatSalePrice(salePrice: string | null | undefined, isBogo: boolean | null): string {
  const price = (salePrice ?? '').trim();
  if (isBogo) {
    if (!price) return 'Buy 1 Get 1 Free';
    return price.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }
  if (!price) return '';
  // Legacy bare numerics from older caches ("2.50") need a "$" prefix.
  // Anything else ("$13.99", "2 for $8.00", "20% Off") renders as-is.
  if (/^\d+(\.\d{1,2})?$/.test(price)) {
    return `$${price}`;
  }
  return price;
}
