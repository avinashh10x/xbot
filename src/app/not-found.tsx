import Link from "next/link";
import { Home, ArrowLeft, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center px-4">
          <div className="flex items-center gap-2 font-bold text-xl">
            <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-sm font-bold">
                X
              </span>
            </div>
            <span>XBot</span>
          </div>

          <nav className="ml-auto flex items-center gap-6">
            <Link
              href="/"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Home
            </Link>
            <Link
              href="/dashboard"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Dashboard
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <div className="container py-20 px-4">
          <div className="flex flex-col items-center text-center gap-8 max-w-2xl mx-auto">
            {/* 404 Illustration */}
            <div className="relative">
              <div className="text-9xl font-bold text-muted-foreground/20">
                404
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Search className="h-16 w-16 text-muted-foreground" />
              </div>
            </div>

            {/* Content */}
            <div className="space-y-4">
              <h1 className="text-4xl font-bold tracking-tight">
                Page Not Found
              </h1>
              <p className="text-xl text-muted-foreground max-w-lg">
                Sorry, we couldn't find the page you're looking for. The page
                might have been moved, deleted, or you entered the wrong URL.
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col justify-center sm:flex-row gap-4 w-full max-w-md">
              <Link href="/" className="border">Home</Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
