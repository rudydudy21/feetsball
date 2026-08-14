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

  } catch (error: any) {
    console.error("API Route /api/get-season-results error:", error.message);
    // Return an empty array on failure so the frontend never crashes with a 500
    return NextResponse.json([], { status: 200 });
  }
}