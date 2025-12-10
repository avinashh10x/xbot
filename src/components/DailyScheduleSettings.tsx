"use client";

import { useState, useEffect } from "react";
import { Clock, Save, Power } from "lucide-react";

interface DailyScheduleSettingsProps {
  onSave: (time: string, enabled: boolean) => Promise<void>;
  initialTime?: string;
  initialEnabled?: boolean;
}

export function DailyScheduleSettings({
  onSave,
  initialTime = "20:00",
  initialEnabled = false,
}: DailyScheduleSettingsProps) {
  const [postTime, setPostTime] = useState(initialTime);
  const [isEnabled, setIsEnabled] = useState(initialEnabled);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      await onSave(postTime, isEnabled);
      setMessage({ type: "success", text: "Settings saved!" });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to save" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Daily Posting Schedule
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Set a time and the system will post one tweet from your queue each day.
      </p>

      {message && (
        <div
          className={`p-3 rounded-md text-sm mb-4 ${
            message.type === "success"
              ? "bg-green-50 text-green-800"
              : "bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Enable Toggle */}
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            <Power className="w-5 h-5 text-gray-600" />
            <div>
              <span className="font-medium text-gray-900">Auto-Post</span>
              <p className="text-xs text-gray-500">
                Automatically post from queue
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsEnabled(!isEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isEnabled ? "bg-blue-600" : "bg-gray-200"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isEnabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* Time Picker */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Clock className="w-4 h-4" />
            Daily Post Time
          </label>
          <input
            type="time"
            value={postTime}
            onChange={(e) => setPostTime(e.target.value)}
            disabled={isLoading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
          <p className="text-xs text-gray-500 mt-1">
            One tweet will be posted at this time daily
          </p>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {isLoading ? "Saving..." : "Save Settings"}
        </button>
      </form>
    </div>
  );
}
