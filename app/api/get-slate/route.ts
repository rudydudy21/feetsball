import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const scriptUrl = process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL;
    
    if (!scriptUrl) {
      console.error("CRITICAL: NEXT_PUBLIC_GOOGLE_SCRIPT_URL is not set.");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    // Force the correct sheet parameter for the slate
    const targetUrl = `${scriptUrl}?sheet=Weekly_Slate`;
    
    const response = await fetch(targetUrl, {
      // Add a cache control or timeout safeguard if needed
      cache: 'no-store' 
    });

    if (!response.ok) {
      throw new Error(`Google Apps Script responded with status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error("API Route /api/get-slate crashed:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}