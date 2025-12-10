"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { TweetQueueTable } from "@/components/TweetQueueTable";
import { BulkTweetForm } from "@/components/BulkTweetForm";
import { DailyScheduleSettings } from "@/components/DailyScheduleSettings";
import { addBulkTweets, deleteTweet, postNow } from "@/app/actions/tweets";
import {
  updateDailySchedule,
  fetchDailySchedule,
} from "@/app/actions/settings";
import { TweetQueue } from "@/types";
import { createClient } from "@/lib/supabase/client";
import {
  AlertCircle,
  CheckCircle,
  Twitter,
  User,
  Calendar,
} from "lucide-react";

interface DashboardClientProps {
  initialTweets: TweetQueue[];
  twitterConnected: boolean;
  twitterUsername?: string;
  twitterUserId?: string;
}

export function DashboardClient({
  initialTweets,
  twitterConnected,
  twitterUsername,
  twitterUserId,
}: DashboardClientProps) {
  const [tweets, setTweets] = useState<TweetQueue[]>(initialTweets);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Handle OAuth callback notifications
    if (searchParams.get("twitter_connected") === "true") {
      setNotification({
        type: "success",
        message: "Twitter account connected successfully!",
      });
      router.replace("/dashboard");
    }

    const error = searchParams.get("error");
    const errorDetails = searchParams.get("details");

    if (error) {
      let errorMessage = "Failed to connect Twitter account. ";

      switch (error) {
        case "missing_twitter_client_id":
          errorMessage =
            "Twitter Client ID is missing. Check your .env.local file.";
          break;
        case "missing_twitter_client_secret":
          errorMessage =
            "Twitter Client Secret is missing. Check your .env.local file.";
          break;
        case "missing_redirect_uri":
          errorMessage = "Redirect URI is missing. Check your .env.local file.";
          break;
        case "twitter_oauth_error":
          errorMessage = `Twitter OAuth error: ${
            errorDetails || "Unknown error"
          }. Check your Twitter app configuration.`;
          break;
        case "oauth_init_failed":
          errorMessage = `OAuth initialization failed: ${
            errorDetails || "Unknown error"
          }. Check server logs.`;
          break;
        case "oauth_callback_failed":
          errorMessage = `OAuth callback failed: ${
            errorDetails || "Unknown error"
          }. This is often due to wrong Client ID/Secret. Check TROUBLESHOOTING.md`;
          break;
        case "not_authenticated":
          errorMessage =
            "You must be logged in before connecting Twitter. Please refresh and try again.";
          break;
        case "invalid_state":
          errorMessage = "OAuth state mismatch. Please try again.";
          break;
        case "missing_stored_params":
          errorMessage = "OAuth session expired. Please try again.";
          break;
        default:
          errorMessage +=
            errorDetails || "Please try again or check TROUBLESHOOTING.md";
      }

      setNotification({
        type: "error",
        message: errorMessage,
      });
      router.replace("/dashboard");
    }
  }, [searchParams, router]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  useEffect(() => {
    const supabase = createClient();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("tweet_queue_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tweet_queue",
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setTweets((prev) => [...prev, payload.new as TweetQueue]);
          } else if (payload.eventType === "UPDATE") {
            setTweets((prev) =>
              prev.map((tweet) =>
                tweet.id === payload.new.id
                  ? (payload.new as TweetQueue)
                  : tweet
              )
            );
          } else if (payload.eventType === "DELETE") {
            setTweets((prev) =>
              prev.filter((tweet) => tweet.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Load schedule settings on mount
  const [scheduleSettings, setScheduleSettings] = useState({
    time: "20:00",
    enabled: false,
  });

  useEffect(() => {
    const loadSettings = async () => {
      const result = await fetchDailySchedule();
      if (result.success && result.settings) {
        setScheduleSettings({
          time: result.settings.daily_post_time || "20:00",
          enabled: result.settings.auto_post_enabled || false,
        });
      }
    };
    if (twitterConnected) {
      loadSettings();
    }
  }, [twitterConnected]);

  // Handler for bulk tweet submission
  const handleBulkSubmit = async (tweetContents: string[]) => {
    const result = await addBulkTweets(tweetContents);
    if (result.error) {
      throw new Error(result.error);
    }
    setNotification({
      type: "success",
      message: `Added ${result.count} tweet(s) to queue!`,
    });
  };

  // Handler for instant post
  const handlePostNow = async (content: string) => {
    const formData = new FormData();
    formData.append("content", content);
    const result = await postNow(formData);
    if (result.error) {
      throw new Error(result.error);
    }
    setNotification({
      type: "success",
      message: "Tweet posted successfully!",
    });
  };

  // Handler for delete tweet
  const handleDeleteTweet = async (id: string) => {
    if (!confirm("Delete this scheduled tweet?")) return;
    const result = await deleteTweet(id);
    if (result.error) {
      setNotification({ type: "error", message: result.error });
    } else {
      setNotification({ type: "success", message: "Tweet deleted" });
    }
  };

  // Handler for saving daily schedule
  const handleSaveSchedule = async (time: string, enabled: boolean) => {
    const result = await updateDailySchedule(time, enabled);
    if (result.error) {
      throw new Error(result.error);
    }
    setScheduleSettings({ time, enabled });
  };

  // Calculate queue stats
  const pendingTweets = tweets.filter((t) => t.status === "pending");
  const postedTweets = tweets.filter((t) => t.status === "posted");

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar twitterConnected={twitterConnected} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Notification */}
        {notification && (
          <div
            className={`mb-6 p-4 rounded-md flex items-center gap-3 ${
              notification.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {notification.type === "success" ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <p className="text-sm font-medium">{notification.message}</p>
          </div>
        )}

        {/* Connect Twitter Warning */}
        {!twitterConnected && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="text-sm font-medium text-yellow-800">
                  Connect your Twitter account to get started
                </p>
                <a
                  href="/api/auth/twitter"
                  className="text-sm text-yellow-700 underline hover:text-yellow-800 mt-1 inline-block"
                >
                  Connect Twitter →
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Connected Account Info */}
        {twitterConnected && twitterUsername && (
          <div className="mb-6 bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-full">
                  <Twitter className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="font-medium text-gray-900">
                      @{twitterUsername}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                    <span>{pendingTweets.length} pending</span>
                    <span>{postedTweets.length} posted</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                  Connected
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Main Content - Two columns on large screens */}
        {twitterConnected && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Settings */}
            <div className="lg:col-span-1 space-y-6">
              <DailyScheduleSettings
                onSave={handleSaveSchedule}
                initialTime={scheduleSettings.time}
                initialEnabled={scheduleSettings.enabled}
              />
            </div>

            {/* Right Column - Tweet Form */}
            <div className="lg:col-span-2">
              <BulkTweetForm
                onSubmit={handleBulkSubmit}
                onPostNow={handlePostNow}
              />
            </div>
          </div>
        )}

        {/* Tweet Queue */}
        {twitterConnected && (
          <div className="mt-8">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-gray-700" />
              <h2 className="text-xl font-semibold text-gray-900">
                Scheduled Queue
              </h2>
            </div>
            <TweetQueueTable tweets={tweets} onDelete={handleDeleteTweet} />
          </div>
        )}
      </div>
    </div>
  );
}
