"use client";

import { useState, useEffect } from "react";
import { PostingSettings } from "@/types";
import {
  fetchPostingSettings,
  updatePostingSettings,
} from "@/app/actions/posting";
import { Settings, Clock, Hash, Power, Save, Info } from "lucide-react";

export function PostingController() {
  const [settings, setSettings] = useState<Partial<PostingSettings>>({
    auto_post_enabled: false,
    post_interval_minutes: 60,
    max_posts_per_day: 10,
    posts_today: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadSettings = async () => {
      setIsLoading(true);
      const result = await fetchPostingSettings();

      if (isMounted) {
        if (result.error) {
          setMessage({ type: "error", text: result.error });
        } else if (result.settings) {
          setSettings(result.settings);
        }
        setIsLoading(false);
      }
    };

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    const formData = new FormData();
    formData.append("auto_post_enabled", String(settings.auto_post_enabled));
    formData.append(
      "post_interval_minutes",
      String(settings.post_interval_minutes)
    );
    formData.append("max_posts_per_day", String(settings.max_posts_per_day));

    const result = await updatePostingSettings(formData);

    if (result.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      setMessage({ type: "success", text: "Settings saved successfully!" });
      if (result.settings) {
        setSettings(result.settings);
      }
    }

    setIsSaving(false);
  };

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-10 bg-gray-200 rounded mb-4"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-700" />
          Posting Controller
        </h3>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {message && (
          <div
            className={`p-3 rounded-md text-sm ${
              message.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Auto Post Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Power className="w-5 h-5 text-gray-600" />
            <div>
              <label className="font-medium text-gray-900">Auto-Post</label>
              <p className="text-sm text-gray-500">
                Automatically post scheduled tweets
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              setSettings((prev) => ({
                ...prev,
                auto_post_enabled: !prev.auto_post_enabled,
              }))
            }
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.auto_post_enabled ? "bg-blue-600" : "bg-gray-200"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.auto_post_enabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* Post Interval */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Clock className="w-4 h-4" />
            Post Interval (minutes)
          </label>
          <input
            type="number"
            min="15"
            max="1440"
            step="15"
            value={settings.post_interval_minutes}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                post_interval_minutes: parseInt(e.target.value),
              }))
            }
            disabled={isSaving}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
          <p className="mt-1 text-xs text-gray-500">
            Minimum 15 minutes between posts (suggested: 60-120)
          </p>
        </div>

        {/* Max Posts Per Day */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Hash className="w-4 h-4" />
            Max Posts Per Day
          </label>
          <input
            type="number"
            min="1"
            max="50"
            value={settings.max_posts_per_day}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                max_posts_per_day: parseInt(e.target.value),
              }))
            }
            disabled={isSaving}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
          <p className="mt-1 text-xs text-gray-500">
            Maximum number of tweets to post automatically per day
          </p>
        </div>

        {/* Daily Stats */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex items-center gap-2 text-blue-900 mb-2">
            <Info className="w-4 h-4" />
            <span className="font-medium text-sm">Today&apos;s Stats</span>
          </div>
          <p className="text-sm text-blue-800">
            Posted: <strong>{settings.posts_today || 0}</strong> /{" "}
            {settings.max_posts_per_day}
          </p>
          {settings.last_post_at && (
            <p className="text-xs text-blue-700 mt-1">
              Last post: {new Date(settings.last_post_at).toLocaleString()}
            </p>
          )}
        </div>

        {/* Save Button */}
        <button
          type="submit"
          disabled={isSaving}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          <Save className="w-4 h-4" />
          {isSaving ? "Saving..." : "Save Settings"}
        </button>
      </form>
    </div>
  );
}
