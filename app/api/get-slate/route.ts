import { NextResponse } from 'next/server';

export async function GET() {
  console.log("STEP 1: /api/get-slate route invoked.");

  const scriptUrl = process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL;
  console.log("STEP 2: Checking environment variable. Exists?", !!scriptUrl);

  if (!scriptUrl) {
    console.error("ERROR: NEXT_PUBLIC_GOOGLE_SCRIPT_URL is undefined or empty!");
    return NextResponse.json({ error: "Server configuration error: Missing script URL" }, { status: 500 });
  }

  try {
    const targetUrl = `${scriptUrl}?sheet=Weekly_Slate`;
    console.log("STEP 3: About to call fetch on URL:", targetUrl);

    const response = await fetch(targetUrl, { cache: 'no-store' });
    console.log("STEP 4: Fetch returned. Status:", response.status);

    const data = await response.json();
    console.log("STEP 5: JSON parsed successfully. Total items:", Array.isArray(data) ? data.length : "Not an array");

    return NextResponse.json(data);

  } catch (error: any) {
    console.error("FATAL ERROR in catch block:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}