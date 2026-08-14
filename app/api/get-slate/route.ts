import { NextResponse } from 'next/server';

export async function GET() {
  const scriptUrl = process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL;

  // SAFETY GATE: Catch missing environment variables instantly
  if (!scriptUrl) {
    console.error("CRITICAL: NEXT_PUBLIC_GOOGLE_SCRIPT_URL is not set in Vercel!");
    return NextResponse.json(
      { error: "Server Configuration Error: Google Script URL is missing." }, 
      { status: 500 }
    );
  }

  try {
    const response = await fetch(scriptUrl);
    
    if (!response.ok) {
      throw new Error(`Google Script returned status ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error("Failed to fetch from Google Script:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch slate data", details: error.message }, 
      { status: 500 }
    );
  }
}