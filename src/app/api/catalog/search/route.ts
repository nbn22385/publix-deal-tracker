import { NextRequest, NextResponse } from 'next/server';
import { searchCatalog } from '@/lib/publix';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim();

    if (!q) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }

    const items = await searchCatalog(q);

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Error searching catalog:', error);
    return NextResponse.json({ error: 'Failed to search catalog' }, { status: 500 });
  }
}
