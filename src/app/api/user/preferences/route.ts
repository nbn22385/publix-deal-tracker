import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { userStore } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Per-user preferences. Currently just the weekly-ad email opt-out;
// add future preference columns to user_store and extend the handlers.
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const [row] = await db
      .select({ emailsEnabled: userStore.emailsEnabled })
      .from(userStore)
      .where(eq(userStore.userId, userId))
      .limit(1);

    // No row yet (user hasn't picked a store): emails default to enabled.
    return NextResponse.json({ emailsEnabled: row?.emailsEnabled ?? true });
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, emailsEnabled } = body;

    if (!userId || typeof emailsEnabled !== 'boolean') {
      return NextResponse.json(
        { error: 'userId and boolean emailsEnabled are required' },
        { status: 400 },
      );
    }

    const [updated] = await db
      .update(userStore)
      .set({ emailsEnabled })
      .where(eq(userStore.userId, userId))
      .returning({ emailsEnabled: userStore.emailsEnabled });

    if (!updated) {
      return NextResponse.json(
        { error: 'No store settings found for user — pick a store first' },
        { status: 404 },
      );
    }

    return NextResponse.json({ emailsEnabled: updated.emailsEnabled });
  } catch (error) {
    console.error('Error saving user preferences:', error);
    return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 });
  }
}
