'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from '@/app/actions/auth';
import { LayoutDashboard, Settings, LogOut, Twitter } from 'lucide-react';

interface NavbarProps {
  twitterConnected?: boolean;
}

export function Navbar({ twitterConnected }: NavbarProps) {
  const pathname = usePathname();

  const handleSignOut = async () => {
    await signOut();
  };

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Twitter className="w-8 h-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">TweetPilot</span>
            </Link>

            <div className="flex gap-4">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {twitterConnected ? (
              <span className="flex items-center gap-2 text-sm text-green-600 font-medium">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Twitter Connected
              </span>
            ) : (
              <Link
                href="/api/auth/twitter"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Connect Twitter
              </Link>
            )}

            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
