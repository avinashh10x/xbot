import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Twitter, Calendar, Zap, Shield } from 'lucide-react';

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <Twitter className="w-16 h-16" />
            </div>
            <h1 className="text-5xl font-bold mb-6">TweetPilot</h1>
            <p className="text-xl mb-8 text-blue-100 max-w-2xl mx-auto">
              Schedule, automate, and manage your Twitter content with ease. 
              Built for creators, marketers, and businesses.
            </p>
            <div className="flex gap-4 justify-center">
              <Link
                href="/signup"
                className="px-8 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
              >
                Get Started Free
              </Link>
              <Link
                href="/login"
                className="px-8 py-3 bg-blue-700 text-white rounded-lg font-semibold hover:bg-blue-800 transition-colors border border-blue-500"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center p-6">
            <div className="flex justify-center mb-4">
              <Calendar className="w-12 h-12 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-900">Smart Scheduling</h3>
            <p className="text-gray-600">
              Schedule tweets in advance with precise timing controls
            </p>
          </div>

          <div className="text-center p-6">
            <div className="flex justify-center mb-4">
              <Zap className="w-12 h-12 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-900">Automated Posting</h3>
            <p className="text-gray-600">
              Automatic posting with retry logic and rate limit handling
            </p>
          </div>

          <div className="text-center p-6">
            <div className="flex justify-center mb-4">
              <Shield className="w-12 h-12 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-900">Secure & Reliable</h3>
            <p className="text-gray-600">
              OAuth 2.0 authentication and enterprise-grade security
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

