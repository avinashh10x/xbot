"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Settings, Twitter } from "lucide-react";

interface NavbarProps {
  twitterConnected?: boolean;
}

export function Navbar({ twitterConnected }: NavbarProps) {
  const pathname = usePathname();

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Twitter className="w-8 h-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">
                TweetPilot
              </span>
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
                        ? "bg-blue-50 text-blue-600"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
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
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
              >
                Connect Twitter
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
