import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, pin } = body;

    if (!username || !pin || String(pin).length !== 4) {
      return NextResponse.json([], { status: 200 });
    }

    const scriptUrl = process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL;
    if (!scriptUrl) {
      console.error("CRITICAL: NEXT_PUBLIC_GOOGLE_SCRIPT_URL is missing.");
      return NextResponse.json([], { status: 200 });
    }

    // Call your Google Apps Script web app with action parameter
    const targetUrl = `${scriptUrl}?action=getPicks&username=${encodeURIComponent(username)}&pin=${encodeURIComponent(pin)}`;
    
    const response = await fetch(targetUrl, { cache: 'no-store' });

    if (!response.ok) {
      throw new Error(`Google Apps Script responded with status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(Array.isArray(data) ? data : []);

  } catch (error: any) {
    console.error("API Route /api/get-my-picks error:", error.message);
    return NextResponse.json([], { status: 200 });
  }
}