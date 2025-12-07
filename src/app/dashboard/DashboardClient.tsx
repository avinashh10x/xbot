"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { TweetQueueTable } from "@/components/TweetQueueTable";
import { AddTweetModal } from "@/components/AddTweetModal";
import { createTweet, deleteTweet } from "@/app/actions/tweets";
import { TweetQueue } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { Plus, AlertCircle, CheckCircle, Twitter, User, Hash, Calendar } from "lucide-react";

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
  const [isModalOpen, setIsModalOpen] = useState(false);
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

  const handleAddTweet = async (
    content: string,
    scheduledAt: string,
    mediaUrl?: string
  ) => {
    const formData = new FormData();
    formData.append("content", content);
    formData.append("scheduled_at", new Date(scheduledAt).toISOString());
    if (mediaUrl) formData.append("media_url", mediaUrl);

    const result = await createTweet(formData);

    if (result.error) {
      throw new Error(result.error);
    }

    setNotification({
      type: "success",
      message: "Tweet scheduled successfully!",
    });
  };

  const handleDeleteTweet = async (id: string) => {
    if (!confirm("Are you sure you want to delete this tweet?")) return;

    const result = await deleteTweet(id);

    if (result.error) {
      setNotification({
        type: "error",
        message: result.error,
      });
    } else {
      setNotification({
        type: "success",
        message: "Tweet deleted successfully!",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar twitterConnected={twitterConnected} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

        {/* Twitter Connection Warning */}
        {!twitterConnected && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="text-sm font-medium text-yellow-800">
                  Connect your Twitter account to start scheduling tweets
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

        {/* Twitter Account Info */}
        {twitterConnected && twitterUsername && (
          <div className="mb-6 bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-100 rounded-full">
                  <Twitter className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    Connected Twitter Account
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-gray-700">
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="font-medium">@{twitterUsername}</span>
                    </div>
                    {twitterUserId && (
                      <div className="flex items-center gap-2 text-gray-600 text-sm">
                        <Hash className="w-4 h-4 text-gray-400" />
                        <span className="font-mono">{twitterUserId}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-gray-600 text-sm">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>Connected today</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  Active
                </span>
              </div>
            </div>
            
            {/* Stats */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {tweets.length}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Scheduled Tweets
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {tweets.filter(t => t.status === 'posted').length}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Posted
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {tweets.filter(t => t.status === 'pending').length}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Pending
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tweet Queue</h1>
            <p className="text-gray-600 mt-1">
              Manage and schedule your tweets
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            disabled={!twitterConnected}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-5 h-5" />
            Schedule Tweet
          </button>
        </div>

        {/* Tweet Queue Table */}
        <TweetQueueTable tweets={tweets} onDelete={handleDeleteTweet} />
      </div>

      {/* Add Tweet Modal */}
      <AddTweetModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddTweet}
      />
    </div>
  );
}
