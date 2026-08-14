import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  console.log("SUBMIT-PICKS: Route invoked.");

  try {
    const scriptUrl = process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL;
    if (!scriptUrl) {
      console.error("SUBMIT-PICKS ERROR: Missing NEXT_PUBLIC_GOOGLE_SCRIPT_URL");
      return NextResponse.json({ error: "Server configuration error: Missing script URL" }, { status: 500 });
    }

    // Safely parse incoming JSON body with a fallback
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      console.error("SUBMIT-PICKS ERROR: Invalid JSON body received");
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const payload = body as { userInfo?: unknown; picks?: unknown };
    const { userInfo, picks } = payload;
    if (!userInfo || !picks) {
      return NextResponse.json({ error: "Missing userInfo or picks" }, { status: 400 });
    }

    // Set a strict 10-second timeout controller so it never hangs for 35 seconds again
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    console.log("SUBMIT-PICKS: Forwarding payload to Google Apps Script...");
    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userInfo, picks }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Google Apps Script responded with status: ${response.status}`);
    }

    const result = await response.json();
    return NextResponse.json(result);

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Submission failed";
    console.error("SUBMIT-PICKS CRITICAL ERROR:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}