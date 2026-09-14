import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { userStore } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const store = await db
      .select()
      .from(userStore)
      .where(eq(userStore.userId, userId))
      .limit(1);

    return NextResponse.json({ store: store[0] || null });
  } catch (error) {
    console.error('Error fetching user store:', error);
    return NextResponse.json({ error: 'Failed to fetch user store' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, storeId, storeName, zipCode } = body;

    if (!userId || !storeId || !storeName || !zipCode) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    const existing = await db
      .select()
      .from(userStore)
      .where(eq(userStore.userId, userId))
      .limit(1);

    let store;
    if (existing[0]) {
      [store] = await db
        .update(userStore)
        .set({ storeId, storeName, zipCode })
        .where(eq(userStore.userId, userId))
        .returning();
    } else {
      [store] = await db
        .insert(userStore)
        .values({ userId, storeId, storeName, zipCode })
        .returning();
    }

    return NextResponse.json({ store });
  } catch (error) {
    console.error('Error saving user store:', error);
    return NextResponse.json({ error: 'Failed to save user store' }, { status: 500 });
  }
}
