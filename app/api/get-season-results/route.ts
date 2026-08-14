import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const scriptUrl = process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL;
    if (!scriptUrl) {
      return NextResponse.json([], { status: 200 });
    }

    // Call your Google Script web app with a sheet parameter for season results or standings
    const targetUrl = `${scriptUrl}?sheet=Season_Standings`;
    const response = await fetch(targetUrl, { cache: 'no-store' });

    if (!response.ok) {
      throw new Error(`Google Apps Script returned status: ${response.status}`);
    }

    const data = await response.json();
    
    // Ensure we always return a sorted array to the frontend
    const resultsArray = Array.isArray(data) ? data : [];
    return NextResponse.json(resultsArray);

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error("API Route /api/get-season-results error:", message);
    return NextResponse.json([], { status: 200 });
  }
}