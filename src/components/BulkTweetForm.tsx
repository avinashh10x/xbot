"use client";

import { useState } from "react";
import { Plus, Trash2, Clock, Send } from "lucide-react";

interface BulkTweetFormProps {
  onSubmit: (tweets: string[]) => Promise<void>;
  onPostNow: (content: string) => Promise<void>;
}

export function BulkTweetForm({ onSubmit, onPostNow }: BulkTweetFormProps) {
  const [tweets, setTweets] = useState<string[]>([""]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const addTweet = () => {
    setTweets([...tweets, ""]);
  };

  const removeTweet = (index: number) => {
    if (tweets.length > 1) {
      setTweets(tweets.filter((_, i) => i !== index));
    }
  };

  const updateTweet = (index: number, value: string) => {
    const newTweets = [...tweets];
    newTweets[index] = value;
    setTweets(newTweets);
  };

  const handleScheduleAll = async () => {
    const validTweets = tweets.filter((t) => t.trim().length > 0);
    if (validTweets.length === 0) {
      setError("Add at least one tweet");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      await onSubmit(validTweets);
      setTweets([""]);
    } catch (err: any) {
      setError(err.message || "Failed to schedule tweets");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePostNow = async (index: number) => {
    const content = tweets[index].trim();
    if (!content) {
      setError("Tweet content is empty");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      await onPostNow(content);
      // Remove the posted tweet from list
      if (tweets.length > 1) {
        setTweets(tweets.filter((_, i) => i !== index));
      } else {
        setTweets([""]);
      }
    } catch (err: any) {
      setError(err.message || "Failed to post tweet");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Add Tweets to Queue
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Add multiple tweets below. They will be posted one per day at your
        scheduled time.
      </p>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm mb-4">
          {error}
        </div>
      )}

      <div className="space-y-3 mb-4">
        {tweets.map((tweet, index) => (
          <div key={index} className="flex gap-2">
            <div className="flex-1">
              <textarea
                value={tweet}
                onChange={(e) => updateTweet(index, e.target.value)}
                placeholder={`Tweet ${index + 1}...`}
                maxLength={280}
                rows={2}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 text-sm"
              />
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-gray-500">
                  {tweet.length}/280
                </span>
                <button
                  type="button"
                  onClick={() => handlePostNow(index)}
                  disabled={isLoading || !tweet.trim()}
                  className="text-xs text-green-600 hover:text-green-700 disabled:text-gray-400 flex items-center gap-1"
                >
                  <Send className="w-3 h-3" />
                  Post Now
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => removeTweet(index)}
              disabled={isLoading || tweets.length === 1}
              className="text-gray-400 hover:text-red-600 disabled:opacity-30 mt-2"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={addTweet}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          Add Tweet
        </button>

        <button
          type="button"
          onClick={handleScheduleAll}
          disabled={isLoading || tweets.every((t) => !t.trim())}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          <Clock className="w-4 h-4" />
          {isLoading
            ? "Scheduling..."
            : `Schedule ${tweets.filter((t) => t.trim()).length} Tweet(s)`}
        </button>
      </div>
    </div>
  );
}
