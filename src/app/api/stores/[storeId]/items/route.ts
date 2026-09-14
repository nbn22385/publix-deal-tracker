import { NextRequest, NextResponse } from 'next/server';
import { getSales, DEPARTMENTS } from '@/lib/scraper';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params;
    const { searchParams } = new URL(request.url);
    const department = searchParams.get('department');

    const departments = department ? [department] : undefined;
    const items = await getSales(storeId, departments);

    return NextResponse.json({ 
      items,
      departments: Object.keys(DEPARTMENTS),
    });
  } catch (error) {
    console.error('Error fetching items:', error);
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
  }
}
