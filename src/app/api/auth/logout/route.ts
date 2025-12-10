import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();

    // Delete Twitter related cookies
    cookieStore.delete({ name: "twitter_access_token", path: "/" });
    cookieStore.delete({ name: "twitter_refresh_token", path: "/" });
    cookieStore.delete({ name: "twitter_user_id", path: "/" });
    cookieStore.delete({ name: "twitter_username", path: "/" });

    // Optionally delete any OAuth flow cookies
    cookieStore.delete({ name: "twitter_state", path: "/" });
    cookieStore.delete({ name: "twitter_code_verifier", path: "/" });

    // Respond with redirect back to dashboard
    return NextResponse.redirect(new URL("/dashboard?logged_out=true", request.url));
  } catch (error) {
    console.error("Error during logout:", error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // Allow GET for convenience from browser navigation
  return POST(request as NextRequest);
}
