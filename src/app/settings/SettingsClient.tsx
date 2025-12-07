'use client';

import { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { updatePreferences } from '@/app/actions/settings';
import { UserPrefs } from '@/types';
import { Clock, Globe, Save } from 'lucide-react';

interface SettingsClientProps {
  initialPrefs: UserPrefs | null;
  twitterConnected: boolean;
}

export function SettingsClient({ initialPrefs, twitterConnected }: SettingsClientProps) {
  const [dailyPostTime, setDailyPostTime] = useState(initialPrefs?.daily_post_time || '09:00');
  const [timezone, setTimezone] = useState(initialPrefs?.timezone || 'UTC');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const timezones = [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Australia/Sydney',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append('daily_post_time', dailyPostTime);
    formData.append('timezone', timezone);

    const result = await updatePreferences(formData);

    if (result.error) {
      setMessage({ type: 'error', text: result.error });
    } else {
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
    }

    setIsLoading(false);
  };

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar twitterConnected={twitterConnected} />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">
            Manage your posting preferences and timezone
          </p>
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-md ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            <p className="text-sm font-medium">{message.text}</p>
          </div>
        )}

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="dailyPostTime" className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Clock className="w-4 h-4" />
                Preferred Daily Posting Time
              </label>
              <input
                type="time"
                id="dailyPostTime"
                value={dailyPostTime}
                onChange={(e) => setDailyPostTime(e.target.value)}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
              <p className="mt-1 text-xs text-gray-500">
                This is a suggestion for your ideal posting time (optional)
              </p>
            </div>

            <div>
              <label htmlFor="timezone" className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Globe className="w-4 h-4" />
                Timezone
              </label>
              <select
                id="timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              >
                {timezones.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Used for scheduling and displaying times
              </p>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                {isLoading ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-md p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">
            About Automated Posting
          </h3>
          <p className="text-sm text-blue-800">
            Tweets are posted automatically every hour. The system will post any pending tweets
            that are scheduled for the current time or earlier. Rate limiting and retry logic
            are built-in to ensure reliable delivery.
          </p>
        </div>
      </div>
    </div>
  );
}
