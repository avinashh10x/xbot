import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TweetPilot - Smart Twitter Scheduling",
  description: "Schedule and automate your Twitter posts with ease",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-gray-50">
        {children}
      </body>
    </html>
  );
}
