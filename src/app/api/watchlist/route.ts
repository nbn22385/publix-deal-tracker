import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { watchlistItems, availableItems, userStore } from '@/db/schema';
import { decodeEntities } from '@/lib/publix';
import { eq, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const rows = await db
      .select({
        id: watchlistItems.id,
        userId: watchlistItems.userId,
        availableItemId: watchlistItems.availableItemId,
        storedProductId: watchlistItems.productId,
        storedProductName: watchlistItems.productName,
        storedItemCode: watchlistItems.itemCode,
        keywords: watchlistItems.keywords,
        alertDepartment: watchlistItems.department,
        alertType: watchlistItems.alertType,
        createdAt: watchlistItems.createdAt,
        joinedProductName: availableItems.productName,
        joinedProductId: availableItems.productId,
        itemDepartment: availableItems.department,
        isBogo: availableItems.isBogo,
        salePrice: availableItems.salePrice,
        imageUrl: availableItems.imageUrl,
        itemDescription: availableItems.description,
      })
      .from(watchlistItems)
      .leftJoin(availableItems, eq(watchlistItems.availableItemId, availableItems.id))
      .where(eq(watchlistItems.userId, userId));

    // Prefer the stable snapshot on the watchlist row; fall back to the
    // legacy available_items join (may be null after a cron refresh).
    // Decode HTML entities: rows cached before the decoder existed still
    // carry raw text like "G&euml;valia". Decoding is idempotent, so clean
    // rows pass through unchanged.
    const items = rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      availableItemId: row.availableItemId,
      keywords: row.keywords,
      alertDepartment: row.alertDepartment,
      alertType: row.alertType,
      createdAt: row.createdAt,
      productName:
        row.storedProductName != null
          ? decodeEntities(row.storedProductName)
          : row.joinedProductName != null
            ? decodeEntities(row.joinedProductName)
            : row.joinedProductName,
      productId: row.storedProductId ?? row.joinedProductId,
      itemCode: row.storedItemCode ?? null,
      itemDepartment: row.itemDepartment,
      isBogo: row.isBogo,
      salePrice: row.salePrice != null ? decodeEntities(row.salePrice) : row.salePrice,
      imageUrl: row.imageUrl,
      description: row.itemDescription != null ? decodeEntities(row.itemDescription) : null,
    }));

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Error fetching watchlist:', error);
    return NextResponse.json({ error: 'Failed to fetch watchlist' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, availableItemId, productId, productName, itemCode, keywords, department, alertType } = body;

    if (!userId || !alertType) {
      return NextResponse.json({ error: 'User ID and alert type are required' }, { status: 400 });
    }

    if (alertType === 'specific_item' && !availableItemId && !productId) {
      return NextResponse.json({ error: 'A product reference is required for specific item alerts' }, { status: 400 });
    }

    if (alertType === 'keyword' && !keywords) {
      return NextResponse.json({ error: 'Keywords are required for keyword alerts' }, { status: 400 });
    }

    const [item] = await db
      .insert(watchlistItems)
      .values({
        userId,
        availableItemId: availableItemId || null,
        productId: productId || null,
        productName: productName || null,
        itemCode: itemCode || null,
        keywords: keywords || null,
        department: department || null,
        alertType,
      })
      .returning();

    return NextResponse.json({ item });
  } catch (error) {
    console.error('Error adding to watchlist:', error);
    return NextResponse.json({ error: 'Failed to add to watchlist' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, userId, keywords } = body;

    if (!id || !userId || typeof keywords !== 'string' || !keywords.trim()) {
      return NextResponse.json(
        { error: 'ID, user ID, and non-empty keywords are required' },
        { status: 400 },
      );
    }

    // Only keyword alerts are editable; ownership enforced via userId.
    const [updated] = await db
      .update(watchlistItems)
      .set({ keywords: keywords.trim() })
      .where(
        and(
          eq(watchlistItems.id, Number(id)),
          eq(watchlistItems.userId, userId),
          eq(watchlistItems.alertType, 'keyword'),
        ),
      )
      .returning({ id: watchlistItems.id, keywords: watchlistItems.keywords });

    if (!updated) {
      return NextResponse.json({ error: 'Keyword alert not found' }, { status: 404 });
    }

    return NextResponse.json({ item: updated });
  } catch (error) {
    console.error('Error updating watchlist:', error);
    return NextResponse.json({ error: 'Failed to update watchlist' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (!id || !userId) {
      return NextResponse.json({ error: 'ID and user ID are required' }, { status: 400 });
    }

    await db
      .delete(watchlistItems)
      .where(and(eq(watchlistItems.id, parseInt(id)), eq(watchlistItems.userId, userId)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing from watchlist:', error);
    return NextResponse.json({ error: 'Failed to remove from watchlist' }, { status: 500 });
  }
}
