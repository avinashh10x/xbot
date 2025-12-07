'use client';

import { TweetQueue } from '@/types';
import { format } from 'date-fns';
import { Trash2, Clock, CheckCircle, XCircle, Image } from 'lucide-react';

interface TweetQueueTableProps {
  tweets: TweetQueue[];
  onDelete: (id: string) => void;
}

export function TweetQueueTable({ tweets, onDelete }: TweetQueueTableProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'posted':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'posted':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (tweets.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
        <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">No tweets scheduled</h3>
        <p className="text-gray-500">Get started by scheduling your first tweet</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Content
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Scheduled
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Posted
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tweets.map((tweet) => (
              <tr key={tweet.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(tweet.status)}
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                        tweet.status
                      )}`}
                    >
                      {tweet.status}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="max-w-md">
                    <p className="text-sm text-gray-900 line-clamp-2">
                      {tweet.content}
                    </p>
                    {tweet.media_url && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                        <Image className="w-3 h-3" />
                        <span>Has media</span>
                      </div>
                    )}
                    {tweet.error_message && (
                      <p className="text-xs text-red-600 mt-1">
                        Error: {tweet.error_message}
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {format(new Date(tweet.scheduled_at), 'MMM d, yyyy h:mm a')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {tweet.posted_at
                    ? format(new Date(tweet.posted_at), 'MMM d, yyyy h:mm a')
                    : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {tweet.status === 'pending' && (
                    <button
                      onClick={() => onDelete(tweet.id)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete tweet"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
