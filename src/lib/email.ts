import type { MatchableSale } from './matching';
import { formatSalePrice } from './format';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildWeeklyAdSubject(matchCount: number, storeName: string): string {
  return `🔥 ${matchCount} items on sale at Publix ${storeName}!`;
}

export function generateEmailHtml(items: MatchableSale[], storeName: string): string {
  const itemsHtml = items
    .map(
      (item) => `
    <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
      ${item.imageUrl ? `<img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.productName)}" style="width: 100px; height: 100px; object-fit: contain;">` : ''}
      <h3 style="margin: 8px 0 4px; font-size: 16px;">${escapeHtml(item.productName)}</h3>
      <p style="margin: 0; color: #6b7280; font-size: 14px;">${escapeHtml(item.department)}</p>
      ${item.description ? `<p style="margin: 4px 0 0; color: #6b7280; font-size: 13px;">${escapeHtml(item.description)}</p>` : ''}
      ${item.dealInfo ? `<p style="margin: 4px 0 0; font-size: 13px; font-weight: bold; color: #059669;">${escapeHtml(item.dealInfo)}</p>` : ''}
      <p style="margin: 4px 0 0; font-size: 20px; font-weight: bold; color: ${item.isBogo ? '#059669' : '#2563eb'};">
        ${escapeHtml(formatSalePrice(item.salePrice, item.isBogo))}
      </p>
    </div>
  `,
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #059669;">🔥 Publix BOGO Alert!</h1>
      <p style="color: #6b7280;">Items matching your watchlist at <strong>${escapeHtml(storeName)}</strong>:</p>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        ${itemsHtml}
      </div>
      <p style="margin-top: 24px; color: #9ca3af; font-size: 12px;">
        You received this email because you have items in your Publix BOGO Alert watchlist.
        <br>
        <a href="#" style="color: #6b7280;">Manage your watchlist</a>
      </p>
    </body>
    </html>
  `;
}
