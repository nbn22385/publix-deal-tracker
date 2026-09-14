import { NextRequest, NextResponse } from 'next/server';
import { getStores } from '@/lib/scraper';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { zip, latitude, longitude } = body;

    if (typeof latitude === 'number' && typeof longitude === 'number') {
      const stores = await getStores({ latitude, longitude });

      return NextResponse.json({ stores });
    }

    if (!zip) {
      return NextResponse.json({ error: 'ZIP code or current location is required' }, { status: 400 });
    }

    const stores = await getStores(zip);

    return NextResponse.json({ stores });
  } catch (error) {
    console.error('Error fetching stores:', error);
    return NextResponse.json({ error: 'Failed to fetch stores' }, { status: 500 });
  }
}
