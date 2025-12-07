import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { TwitterApi } from "twitter-api-v2";
import { createClient } from "@/lib/supabase/server";
import { updateUserTwitterTokens } from "@/lib/db/queries";

export async function GET(request: NextRequest) {
  try {
    console.log("\n🔄 Twitter OAuth callback received");

    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    // Check if Twitter returned an error
    if (error) {
      console.error("❌ Twitter OAuth error:", error);
      console.error("   Description:", errorDescription);
      return NextResponse.redirect(
        new URL(
          "/dashboard?error=twitter_oauth_error&details=" +
            encodeURIComponent(errorDescription || error),
          request.url
        )
      );
    }

    if (!code || !state) {
      console.error("❌ Missing OAuth parameters");
      console.error("   Code present:", !!code);
      console.error("   State present:", !!state);
      return NextResponse.redirect(
        new URL("/dashboard?error=missing_parameters", request.url)
      );
    }

    console.log("✅ Received code and state parameters");

    // Verify state
    const cookieStore = await cookies();
    const storedState = cookieStore.get("twitter_state")?.value;
    const codeVerifier = cookieStore.get("twitter_code_verifier")?.value;

    console.log("🔐 Verifying state and code verifier...");
    console.log("   Stored state:", storedState?.substring(0, 10) + "...");
    console.log("   Received state:", state?.substring(0, 10) + "...");
    console.log("   Code verifier present:", !!codeVerifier);

    if (!storedState || !codeVerifier) {
      console.error("❌ Missing stored state or code verifier");
      console.error(
        "   This might mean cookies are not working or OAuth flow expired"
      );
      return NextResponse.redirect(
        new URL("/dashboard?error=missing_stored_params", request.url)
      );
    }

    if (storedState !== state) {
      console.error("❌ State mismatch - possible CSRF attack");
      return NextResponse.redirect(
        new URL("/dashboard?error=invalid_state", request.url)
      );
    }

    console.log("✅ State verified successfully");

    // Exchange code for tokens
    console.log("🔄 Exchanging authorization code for access token...");
    console.log(
      "   Using redirect URI:",
      process.env.NEXT_PUBLIC_TWITTER_REDIRECT_URI
    );

    const client = new TwitterApi({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
    });

    console.log(
      "   DEBUG: Client ID used:",
      process.env.TWITTER_CLIENT_ID?.substring(0, 10) + "..."
    );
    console.log(
      "   DEBUG: Redirect URI used:",
      process.env.NEXT_PUBLIC_TWITTER_REDIRECT_URI
    );

    const {
      client: loggedClient,
      accessToken,
      refreshToken,
      expiresIn,
    } = await client.loginWithOAuth2({
      code,
      codeVerifier,
      redirectUri: process.env.NEXT_PUBLIC_TWITTER_REDIRECT_URI!,
    });

    console.log("✅ Successfully exchanged code for tokens");
    console.log("   Token expires in:", expiresIn, "seconds");

    // Get Twitter user info
    console.log("👤 Fetching Twitter user info...");
    const { data: twitterUser } = await loggedClient.v2.me();
    console.log(
      "✅ Twitter user:",
      twitterUser.username,
      "(ID:",
      twitterUser.id + ")"
    );

    // Get current Supabase user
    console.log("🔍 Checking Supabase authentication...");
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.error("❌ No authenticated Supabase user found");
      console.error(
        "   User must be logged into your app first before connecting Twitter"
      );
      return NextResponse.redirect(
        new URL("/dashboard?error=not_authenticated", request.url)
      );
    }

    console.log("✅ Supabase user found:", user.email);

    // Calculate token expiration
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // Save tokens to database
    console.log("💾 Saving Twitter tokens to database...");
    await updateUserTwitterTokens(user.id, {
      access_token: accessToken,
      refresh_token: refreshToken!,
      expires_at: expiresAt,
      twitter_user_id: twitterUser.id,
    });
    console.log("✅ Tokens saved successfully");

    // Clear cookies
    cookieStore.delete("twitter_code_verifier");
    cookieStore.delete("twitter_state");

    console.log("🎉 Twitter connection successful!\n");
    return NextResponse.redirect(
      new URL("/dashboard?twitter_connected=true", request.url)
    );
  } catch (error: any) {
    console.error("\n❌ Error handling Twitter OAuth callback:");
    console.error("   Error type:", error?.constructor?.name);
    console.error("   Error message:", error?.message);
    console.error("   Error code:", error?.code);
    console.error("   Error data:", error?.data);

    // Check for specific Twitter API errors
    if (error?.code === 401) {
      console.error(
        "   ⚠️  Unauthorized - Check your Twitter Client ID and Secret"
      );
    } else if (error?.code === 403) {
      console.error(
        "   ⚠️  Forbidden - Your app may not have the required permissions"
      );
    } else if (error?.message?.includes("redirect_uri")) {
      console.error(
        "   ⚠️  Redirect URI mismatch - Check Twitter app settings"
      );
    }

    console.error("   Full error:", error);
    console.error("");

    return NextResponse.redirect(
      new URL(
        "/dashboard?error=oauth_callback_failed&details=" +
          encodeURIComponent(error?.message || "Unknown error"),
        request.url
      )
    );
  }
}
