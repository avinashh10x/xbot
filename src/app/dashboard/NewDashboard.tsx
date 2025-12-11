"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUserStore } from "@/stores/userStore";
import {
  postNow,
  schedulePost,
  getScheduledTweets,
  getPostedTweets,
  deleteScheduledTweet,
  getTwitterDetails,
} from "@/app/actions/post";
import {
  Twitter,
  Send,
  Clock,
  Trash2,
  CheckCircle,
  AlertCircle,
  Calendar,
  LogOut,
  Users,
  Heart,
  Eye,
  MessageCircle,
  Repeat,
  RefreshCw,
} from "lucide-react";

export function DashboardClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // User store
  const {
    isConnected,
    isLoading,
    profile,
    recentTweets,
    scheduledTweets,
    setConnected,
    setLoading,
    setError,
    setProfile,
    setRecentTweets,
    setPinnedTweet,
    setScheduledTweets,
    addScheduledTweet,
    removeScheduledTweet,
    clearAll,
  } = useUserStore();

  // Local state
  const [content, setContent] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("20:00");
  const [isPosting, setIsPosting] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [postedTweets, setPostedTweets] = useState<
    {
      id: string;
      content: string;
      posted_at: string;
      twitter_tweet_id?: string;
    }[]
  >([]);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Load all user data on mount
  const loadUserData = async () => {
    setLoading(true);
    try {
      // Fetch Twitter profile and tweets
      const detailsResult = await getTwitterDetails();

      if (detailsResult.error) {
        if (detailsResult.error === "Twitter not connected") {
          setConnected(false);
          setProfile(null);
        } else {
          setError(detailsResult.error);
        }
      } else if (detailsResult.data) {
        setProfile(detailsResult.data.profile);
        setRecentTweets(detailsResult.data.recentTweets);
        setPinnedTweet(detailsResult.data.pinnedTweet || null);
        setConnected(true);

        // Also load scheduled tweets from DB
        const scheduledResult = await getScheduledTweets();
        if (scheduledResult.tweets) {
          setScheduledTweets(scheduledResult.tweets);
        }

        // Load posted tweets from DB
        const postedResult = await getPostedTweets();
        if (postedResult.tweets) {
          setPostedTweets(postedResult.tweets);
        }
      }
    } catch (error) {
      console.error("Failed to load user data:", error);
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserData();
  }, []);

  // Refresh data
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadUserData();
    setIsRefreshing(false);
    setNotification({ type: "success", message: "Data refreshed!" });
  };

  // Handle OAuth callback notifications
  useEffect(() => {
    if (searchParams.get("twitter_connected") === "true") {
      setNotification({
        type: "success",
        message: "Twitter account connected successfully!",
      });
      router.replace("/dashboard");
      loadUserData();
    }

    const error = searchParams.get("error");
    if (error) {
      setNotification({
        type: "error",
        message: `Connection failed: ${searchParams.get("details") || error}`,
      });
      router.replace("/dashboard");
    }
  }, [searchParams, router]);

  // Auto-hide notifications
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Set default schedule date to tomorrow
  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setScheduleDate(tomorrow.toISOString().split("T")[0]);
  }, []);

  // Handle instant post
  const handlePostNow = async () => {
    if (!content.trim()) {
      setNotification({ type: "error", message: "Please enter tweet content" });
      return;
    }

    setIsPosting(true);
    try {
      const result = await postNow(content);
      if (result.error) {
        setNotification({ type: "error", message: result.error });
      } else {
        setNotification({ type: "success", message: "Tweet posted! 🎉" });
        setContent("");
        // Refresh to get new tweet in timeline
        loadUserData();
      }
    } catch (error: any) {
      setNotification({
        type: "error",
        message: error.message || "Failed to post",
      });
    } finally {
      setIsPosting(false);
    }
  };

  // Handle schedule post
  const handleSchedule = async () => {
    if (!content.trim()) {
      setNotification({ type: "error", message: "Please enter tweet content" });
      return;
    }

    if (!scheduleDate || !scheduleTime) {
      setNotification({
        type: "error",
        message: "Please select date and time",
      });
      return;
    }

    const scheduledAt = new Date(
      `${scheduleDate}T${scheduleTime}`
    ).toISOString();

    setIsScheduling(true);
    try {
      const result = await schedulePost(content, scheduledAt);
      if (result.error) {
        setNotification({ type: "error", message: result.error });
      } else {
        setNotification({ type: "success", message: "Tweet scheduled! 📅" });
        setContent("");
        if (result.tweet) {
          addScheduledTweet(result.tweet);
        }
      }
    } catch (error: any) {
      setNotification({
        type: "error",
        message: error.message || "Failed to schedule",
      });
    } finally {
      setIsScheduling(false);
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this scheduled tweet?")) return;

    try {
      const result = await deleteScheduledTweet(id);
      if (result.error) {
        setNotification({ type: "error", message: result.error });
      } else {
        removeScheduledTweet(id);
        setNotification({ type: "success", message: "Tweet deleted" });
      }
    } catch (error: any) {
      setNotification({ type: "error", message: "Failed to delete" });
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      clearAll();
      router.push("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  // Pending tweets
  const pendingTweets = scheduledTweets.filter((t) => t.status === "pending");

  // Format number for display
  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Twitter className="w-6 h-6 text-blue-500" />
            <span className="font-bold text-xl">XBot</span>
          </div>
          {isConnected && profile && (
            <div className="flex items-center gap-4">
              {profile.profileImageUrl && (
                <img
                  src={profile.profileImageUrl}
                  alt={profile.name}
                  className="w-8 h-8 rounded-full"
                />
              )}
              <span className="text-sm text-gray-600">@{profile.username}</span>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`}
                />
              </button>
              <button
                onClick={handleLogout}
                className="text-gray-500 hover:text-gray-700"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Notification */}
        {notification && (
          <div
            className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
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
            <p>{notification.message}</p>
          </div>
        )}

        {/* Not Connected */}
        {!isConnected && (
          <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
            <Twitter className="w-16 h-16 text-blue-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Connect Twitter</h2>
            <p className="text-gray-600 mb-6">
              Connect your Twitter account to start posting
            </p>
            <a
              href="/api/auth/twitter"
              className="inline-flex items-center gap-2 bg-blue-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-600 transition"
            >
              <Twitter className="w-5 h-5" />
              Connect Twitter
            </a>
          </div>
        )}

        {/* Connected */}
        {isConnected && profile && (
          <>
            {/* Profile Stats Card */}
            <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
              <div className="flex items-start gap-4">
                {profile.profileImageUrl && (
                  <img
                    src={profile.profileImageUrl}
                    alt={profile.name}
                    className="w-16 h-16 rounded-full"
                  />
                )}
                <div className="flex-1">
                  <h2 className="text-xl font-bold">{profile.name}</h2>
                  <p className="text-gray-500">@{profile.username}</p>
                  {profile.description && (
                    <p className="text-gray-700 mt-2 text-sm">
                      {profile.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-4 mt-6 pt-4 border-t">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {formatNumber(profile.tweetCount)}
                  </p>
                  <p className="text-xs text-gray-500">Tweets</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {formatNumber(profile.followersCount)}
                  </p>
                  <p className="text-xs text-gray-500">Followers</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    {formatNumber(profile.followingCount)}
                  </p>
                  <p className="text-xs text-gray-500">Following</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600">
                    {formatNumber(profile.listedCount)}
                  </p>
                  <p className="text-xs text-gray-500">Listed</p>
                </div>
              </div>
            </div>

            {/* Tweet Composer */}
            <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Compose Tweet</h2>

              {/* Textarea */}
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What's happening?"
                className="w-full p-4 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={4}
                maxLength={280}
              />

              {/* Character count */}
              <div className="flex justify-between items-center mt-2 text-sm">
                <span
                  className={
                    content.length > 260 ? "text-orange-500" : "text-gray-500"
                  }
                >
                  {content.length}/280
                </span>
              </div>

              {/* Schedule Options */}
              <div className="flex flex-wrap gap-4 mt-4 items-end">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="border rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handlePostNow}
                  disabled={isPosting || !content.trim()}
                  className="flex items-center gap-2 bg-blue-500 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <Send className="w-4 h-4" />
                  {isPosting ? "Posting..." : "Post Now"}
                </button>

                <button
                  onClick={handleSchedule}
                  disabled={isScheduling || !content.trim()}
                  className="flex items-center gap-2 bg-gray-100 text-gray-700 px-6 py-2.5 rounded-lg font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <Clock className="w-4 h-4" />
                  {isScheduling ? "Scheduling..." : "Schedule"}
                </button>
              </div>
            </div>

            {/* Scheduled Tweets Queue */}
            <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-gray-700" />
                <h2 className="text-lg font-semibold">
                  Scheduled Queue ({pendingTweets.length})
                </h2>
              </div>

              {pendingTweets.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No scheduled tweets. Schedule your first tweet above!
                </p>
              ) : (
                <div className="space-y-3">
                  {pendingTweets.map((tweet) => (
                    <div
                      key={tweet.id}
                      className="flex items-start justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="text-gray-900">{tweet.content}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          📅 {new Date(tweet.scheduled_at).toLocaleString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDelete(tweet.id)}
                        className="text-gray-400 hover:text-red-500 ml-4"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Last Posted Tweet (from this app) */}
            {postedTweets.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <h2 className="text-lg font-semibold">
                    Last Posted via XBot
                  </h2>
                </div>
                <div className="p-4 bg-green-50 border border-green-100 rounded-lg">
                  <p className="text-gray-900">{postedTweets[0].content}</p>
                  <div className="flex items-center justify-between mt-3 text-sm">
                    <span className="text-green-700">
                      ✅ Posted{" "}
                      {new Date(postedTweets[0].posted_at).toLocaleString()}
                    </span>
                    {postedTweets[0].twitter_tweet_id && (
                      <a
                        href={`https://twitter.com/${profile.username}/status/${postedTweets[0].twitter_tweet_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        View on Twitter →
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Recent Tweets */}
            {recentTweets.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h2 className="text-lg font-semibold mb-4">Recent Tweets</h2>
                <div className="space-y-4">
                  {recentTweets.slice(0, 5).map((tweet) => (
                    <div key={tweet.id} className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-gray-900">{tweet.text}</p>
                      <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Heart className="w-4 h-4" />
                          {formatNumber(tweet.likeCount)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Repeat className="w-4 h-4" />
                          {formatNumber(tweet.retweetCount)}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-4 h-4" />
                          {formatNumber(tweet.replyCount)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {formatNumber(tweet.impressionCount)}
                        </span>
                        <span className="text-xs ml-auto">
                          {new Date(tweet.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
