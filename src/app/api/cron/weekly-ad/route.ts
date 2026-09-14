import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { userStore, watchlistItems, availableItems, notificationLog } from '@/db/schema';
import { getSales } from '@/lib/scraper';
import { matchWatchlist, isCronAuthorized, type MatchableSale } from '@/lib/matching';
import { generateEmailHtml, buildWeeklyAdSubject } from '@/lib/email';
import { Resend } from 'resend';
import { eq } from 'drizzle-orm';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!isCronAuthorized(authHeader, cronSecret)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const users = await db.select().from(userStore);

    const results: { userId: string; matches: number; emailSent: boolean }[] = [];

    for (const user of users) {
      const userId = user.userId;
      const storeId = user.storeId;

      // Stable product reference lives on the watchlist row itself now;
      // fall back to the legacy available_items join for older rows.
      const watchlistRows = await db
        .select({
          id: watchlistItems.id,
          alertType: watchlistItems.alertType,
          availableItemId: watchlistItems.availableItemId,
          keywords: watchlistItems.keywords,
          department: watchlistItems.department,
          storedProductId: watchlistItems.productId,
          storedItemCode: watchlistItems.itemCode,
          joinedProductId: availableItems.productId,
        })
        .from(watchlistItems)
        .leftJoin(availableItems, eq(watchlistItems.availableItemId, availableItems.id))
        .where(eq(watchlistItems.userId, userId));

      const watchlistWithProducts = watchlistRows.map((row) => ({
        ...row,
        productId: row.storedProductId ?? row.joinedProductId,
        itemCode: row.storedItemCode ?? null,
      }));

      const currentSales = await getSales(storeId, undefined, user.zipCode);
      const salesForMatch: MatchableSale[] = currentSales.map((item) => ({
        productId: item.productId,
        itemCode: item.itemCode,
        productName: item.productName,
        department: item.department,
        salePrice: item.salePrice,
        isBogo: item.isBogo,
        imageUrl: item.imageUrl,
        description: item.description,
        dealInfo: item.dealInfo,
      }));

      await db.delete(availableItems).where(eq(availableItems.storeId, storeId));

      const insertedItems = await db.insert(availableItems).values(
        currentSales.map((item) => ({
          storeId,
          department: item.department,
          productId: item.productId,
          productName: item.productName,
          imageUrl: item.imageUrl,
          isBogo: item.isBogo,
          salePrice: item.salePrice,
          description: item.description,
          itemCode: item.itemCode,
        }))
      ).returning();

      const itemIdToSale = new Map<number, MatchableSale>();
      if (insertedItems.length > 0 && insertedItems[0]?.id) {
        currentSales.forEach((item, idx) => {
          const insertedId = insertedItems[idx]?.id;
          if (insertedId) {
            itemIdToSale.set(insertedId, {
              productId: item.productId,
              productName: item.productName,
              department: item.department,
              salePrice: item.salePrice,
              isBogo: item.isBogo,
              imageUrl: item.imageUrl,
              description: item.description,
              dealInfo: item.dealInfo,
            });
          }
        });
      }

      const productIdToInsertedId = new Map<string, number>();
      insertedItems.forEach((row) => {
        if (row.productId != null && row.id != null && !productIdToInsertedId.has(row.productId)) {
          productIdToInsertedId.set(row.productId, row.id);
        }
      });

      const matchedItems = matchWatchlist(watchlistWithProducts, salesForMatch, itemIdToSale);

      if (matchedItems.length > 0) {
        const userEmail = await getUserEmail(userId);
        
        if (userEmail) {
          const emailHtml = generateEmailHtml(matchedItems.map(m => m.item), user.storeName);
          const resend = new Resend(process.env.RESEND_API_KEY);

          await resend.emails.send({
            from: 'Publix Deal Tracker <onboarding@resend.dev>',
            to: userEmail,
            subject: buildWeeklyAdSubject(matchedItems.length, user.storeName),
            html: emailHtml,
          });

          await db.insert(notificationLog).values(
            matchedItems.map(m => ({
              userId,
              watchlistItemId: m.watchlistId,
              matchedItemId: productIdToInsertedId.get(m.item.productId) ?? null,
              status: 'sent',
            }))
          );

          results.push({ userId, matches: matchedItems.length, emailSent: true });
        } else {
          results.push({ userId, matches: matchedItems.length, emailSent: false });
        }
      } else {
        results.push({ userId, matches: 0, emailSent: false });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Error in weekly ad cron:', error);
    return NextResponse.json({ error: 'Failed to process weekly ad' }, { status: 500 });
  }
}

async function getUserEmail(userId: string): Promise<string | null> {
  const { db: authDb } = await import('@/lib/db');
  const { user: userTable } = await import('@/db/schema');

  try {
    const [userRecord] = await authDb
      .select({ email: userTable.email })
      .from(userTable)
      .where(eq(userTable.id, userId))
      .limit(1);
    return userRecord?.email || null;
  } catch {
    return null;
  }
}
