import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { TwitterApi } from "twitter-api-v2";
import { createAdminClient } from "@/lib/supabase/server";

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
    console.log(
      "   Client ID (first 10 chars):",
      process.env.TWITTER_CLIENT_ID?.substring(0, 10) + "..."
    );
    console.log(
      "   Client Secret length:",
      process.env.TWITTER_CLIENT_SECRET?.length,
      "chars"
    );

    const client = new TwitterApi({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
    });

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

    // Since authentication is disabled, store tokens in cookies
    console.log("💾 Storing Twitter tokens in cookies...");

    // Calculate token expiration
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // Store tokens in httpOnly cookies for security
    cookieStore.set("twitter_access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: expiresAt,
      path: "/",
    });

    if (refreshToken) {
      cookieStore.set("twitter_refresh_token", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365, // 1 year
        path: "/",
      });
    }

    cookieStore.set("twitter_user_id", twitterUser.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: "/",
    });

    cookieStore.set("twitter_username", twitterUser.username, {
      httpOnly: false, // Allow client-side access for display
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: "/",
    });

    console.log("✅ Tokens saved to cookies");

    // Save/update user in database for cron job access
    try {
      const supabase = await createAdminClient();
      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("twitter_user_id", twitterUser.id)
        .single();

      if (existingUser) {
        // Update existing user
        await supabase
          .from("users")
          .update({
            twitter_access_token: accessToken,
            twitter_refresh_token: refreshToken,
            token_expires_at: expiresAt.toISOString(),
          })
          .eq("id", existingUser.id);
        console.log("✅ Updated existing user in database");
      } else {
        // Create new user
        await supabase.from("users").insert({
          id: crypto.randomUUID(),
          email: `${twitterUser.username}@twitter.local`,
          twitter_user_id: twitterUser.id,
          twitter_access_token: accessToken,
          twitter_refresh_token: refreshToken,
          token_expires_at: expiresAt.toISOString(),
        });
        console.log("✅ Created new user in database");
      }
    } catch (dbError) {
      console.error("⚠️ Failed to save to database:", dbError);
      // Continue anyway - cookies will work for immediate actions
    }

    // Clear OAuth flow cookies
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
    console.error("   Error data:", JSON.stringify(error?.data, null, 2));
    console.error(
      "   Error response:",
      JSON.stringify(error?.response?.data, null, 2)
    );

    // Check for specific Twitter API errors
    if (error?.code === 401 || error?.data?.error === "invalid_client") {
      console.error(
        "   ⚠️  Invalid Client - Check your Twitter Client ID and Secret"
      );
    } else if (
      error?.code === 400 ||
      error?.data?.error === "invalid_request"
    ) {
      console.error(
        "   ⚠️  Bad Request - Likely redirect_uri mismatch or invalid code/verifier"
      );
      console.error(
        "   Expected redirect_uri:",
        process.env.NEXT_PUBLIC_TWITTER_REDIRECT_URI
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

    console.error("   Full error object:", error);
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
