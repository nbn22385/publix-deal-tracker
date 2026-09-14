import { NextRequest, NextResponse } from 'next/server';
import { getStores } from '@/lib/scraper';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { zip } = body;

    if (!zip) {
      return NextResponse.json({ error: 'ZIP code is required' }, { status: 400 });
    }

    const stores = await getStores(zip);

    return NextResponse.json({ stores });
  } catch (error) {
    console.error('Error fetching stores:', error);
    return NextResponse.json({ error: 'Failed to fetch stores' }, { status: 500 });
  }
}
