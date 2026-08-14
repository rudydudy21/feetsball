import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userInfo, picks } = body;

    const scriptUrl = process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL;
    if (!scriptUrl) {
      console.error("CRITICAL: NEXT_PUBLIC_GOOGLE_SCRIPT_URL is missing.");
      return NextResponse.json({ error: "Server configuration error: Missing script URL" }, { status: 500 });
    }

    // Forward the POST payload to your Google Apps Script Web App
    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userInfo, picks }),
    });

    if (!response.ok) {
      throw new Error(`Google Apps Script responded with status: ${response.status}`);
    }

    const result = await response.json();
    return NextResponse.json(result);

  } catch (error: any) {
    console.error("API Route /api/submit-picks failed:", error.message);
    return NextResponse.json({ error: error.message || "Submission failed" }, { status: 500 });
  }
}