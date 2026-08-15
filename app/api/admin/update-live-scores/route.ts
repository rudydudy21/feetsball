import { updateLiveScores } from '@/lib/googleSheets';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'feetsball-admin';

const isAuthorized = (request: Request) => {
  const headerKey = request.headers.get('x-admin-password') || '';
  return headerKey === ADMIN_PASSWORD;
};

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await updateLiveScores();
    return NextResponse.json({ success: true, updatedRows: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update live scores';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
