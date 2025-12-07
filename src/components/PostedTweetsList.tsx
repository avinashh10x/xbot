"use client";

import { useState } from "react";
import { TwitterTweet } from "@/types";
import { fetchUserTweets } from "@/app/actions/twitter";
import {
  Twitter,
  Heart,
  Repeat2,
  MessageCircle,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";

export function PostedTweetsList() {
  const [tweets, setTweets] = useState<TwitterTweet[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const loadTweets = async () => {
    setIsLoading(true);
    setError(null);

    const result = await fetchUserTweets();

    if (result.error) {
      setError(result.error);
    } else {
      type TweetData = {
        id: string;
        text: string;
        created_at?: string;
        public_metrics?: {
          retweet_count: number;
          reply_count: number;
          like_count: number;
          quote_count: number;
        };
      };

      const formattedTweets = (result.tweets || []).map((tweet: TweetData) => ({
        id: tweet.id,
        text: tweet.text,
        created_at: tweet.created_at || new Date().toISOString(),
        public_metrics: tweet.public_metrics,
      }));
      setTweets(formattedTweets);
    }

    setIsLoading(false);
    setHasLoaded(true);
  };

  if (!hasLoaded && !isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <Twitter className="w-12 h-12 text-blue-400 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          Your Recent Tweets
        </h3>
        <p className="text-gray-500 mb-4">
          Click below to load your tweets from Twitter
        </p>
        <button
          onClick={loadTweets}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Load Tweets
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        <p className="text-gray-600 mt-3">Loading your tweets...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <Twitter className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (tweets.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <Twitter className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          No tweets yet
        </h3>
        <p className="text-gray-500">Your posted tweets will appear here</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Twitter className="w-5 h-5 text-blue-500" />
          Your Recent Tweets
        </h3>
        <button
          onClick={loadTweets}
          className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>
      <div className="divide-y divide-gray-200">
        {tweets.map((tweet) => (
          <div key={tweet.id} className="p-4 hover:bg-gray-50">
            <p className="text-gray-900 mb-2">{tweet.text}</p>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="text-xs">
                {format(new Date(tweet.created_at), "MMM d, yyyy h:mm a")}
              </span>
              {tweet.public_metrics && (
                <>
                  <span className="flex items-center gap-1">
                    <Heart className="w-4 h-4" />
                    {tweet.public_metrics.like_count}
                  </span>
                  <span className="flex items-center gap-1">
                    <Repeat2 className="w-4 h-4" />
                    {tweet.public_metrics.retweet_count}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="w-4 h-4" />
                    {tweet.public_metrics.reply_count}
                  </span>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
