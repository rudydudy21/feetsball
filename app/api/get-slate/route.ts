import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const scriptUrl = process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL;
    if (!scriptUrl) {
      return NextResponse.json([], { status: 200 });
    }

    const targetUrl = `${scriptUrl}?sheet=Weekly_Slate`;
    const response = await fetch(targetUrl, { cache: 'no-store' });

    if (!response.ok) {
      throw new Error(`Google Apps Script status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(Array.isArray(data) ? data : []);

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error("API Route /api/get-slate error:", message);
    return NextResponse.json([], { status: 200 });
  }
}