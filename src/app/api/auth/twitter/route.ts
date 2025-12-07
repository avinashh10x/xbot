import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { generateState } from "@/lib/twitter/pkce";
import { generateOAuthUrl } from "@/lib/twitter/client";

export async function GET(request: NextRequest) {
  try {
    // Validate environment variables
    if (!process.env.TWITTER_CLIENT_ID) {
      console.error("❌ TWITTER_CLIENT_ID is not set in environment variables");
      return NextResponse.redirect(
        new URL("/dashboard?error=missing_twitter_client_id", request.url)
      );
    }
    if (!process.env.TWITTER_CLIENT_SECRET) {
      console.error(
        "❌ TWITTER_CLIENT_SECRET is not set in environment variables"
      );
      return NextResponse.redirect(
        new URL("/dashboard?error=missing_twitter_client_secret", request.url)
      );
    }
    if (!process.env.NEXT_PUBLIC_TWITTER_REDIRECT_URI) {
      console.error(
        "❌ NEXT_PUBLIC_TWITTER_REDIRECT_URI is not set in environment variables"
      );
      return NextResponse.redirect(
        new URL("/dashboard?error=missing_redirect_uri", request.url)
      );
    }

    console.log("✅ Starting Twitter OAuth flow...");
    console.log(
      "📍 Redirect URI:",
      process.env.NEXT_PUBLIC_TWITTER_REDIRECT_URI
    );

    const state = generateState();

    console.log("🔑 Generated state:", state.substring(0, 10) + "...");

    // Generate OAuth URL and get codeVerifier from the library
    const { url, codeVerifier, state: returnedState } = generateOAuthUrl(state);

    console.log("🔑 Code verifier received from library");

    // Store code verifier and state in cookies
    const cookieStore = await cookies();
    cookieStore.set("twitter_code_verifier", codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 10, // 10 minutes
      path: "/",
    });

    cookieStore.set("twitter_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 10, // 10 minutes
      path: "/",
    });

    console.log("🔗 Redirecting to Twitter OAuth URL");
    return NextResponse.redirect(url);
  } catch (error: any) {
    console.error("❌ Error initiating Twitter OAuth:");
    console.error("   Error type:", error?.constructor?.name);
    console.error("   Error message:", error?.message);
    console.error("   Error code:", error?.code);
    console.error("   Full error:", error);

    return NextResponse.redirect(
      new URL(
        "/dashboard?error=oauth_init_failed&details=" +
          encodeURIComponent(error?.message || "Unknown error"),
        request.url
      )
    );
  }
}
