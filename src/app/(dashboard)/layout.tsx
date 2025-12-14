import Link from "next/link";
import {
  Home,
  Calendar,
  Edit,
  Settings,
  LayoutDashboard,
  Menu,
} from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center px-4">
          <div className="flex items-center gap-2 font-bold text-xl">
            <LayoutDashboard className="h-6 w-6" />
            <span>XBot</span>
          </div>

          <nav className="ml-auto flex items-center gap-6">
            <Link
              href="/feed"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Feed
            </Link>
            <Link
              href="/queue"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Queue
            </Link>
            <Link
              href="/editor"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Editor
            </Link>
            <Link
              href="/settings"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Settings
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t py-6 md:py-0">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row px-4">
          <p className="text-sm text-muted-foreground">
            Built with Next.js, Tailwind CSS, and shadcn/ui
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="/settings"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Settings
            </Link>
            <Link
              href="/api/docs"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              API
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
