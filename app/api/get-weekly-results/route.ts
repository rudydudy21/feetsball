import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const week = searchParams.get('week') || '1';

    const scriptUrl = process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL;
    if (!scriptUrl) {
      console.error("CRITICAL: NEXT_PUBLIC_GOOGLE_SCRIPT_URL is missing!");
      return NextResponse.json({ error: "Missing Google Script URL configuration" }, { status: 500 });
    }

    // Append the sheet and week parameter to your Apps Script URL
    const targetUrl = `${scriptUrl}?sheet=Weekly_Slate&week=${week}`;
    const response = await fetch(targetUrl);

    if (!response.ok) {
      throw new Error(`Google Apps Script returned status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error("API Route Error (/api/get-weekly-results):", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}