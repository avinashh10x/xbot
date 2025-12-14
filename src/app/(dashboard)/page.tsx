import Link from "next/link";
import { Calendar, Edit, Zap, BarChart, ArrowRight } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="container py-10 px-4">
      {/* Hero Section */}
      <section className="flex flex-col items-center text-center gap-6 py-20">
        <div className="inline-flex items-center rounded-full border px-3 py-1 text-sm bg-muted">
          <Zap className="mr-2 h-4 w-4" />
          <span className="font-medium">
            AI-Powered Social Media Automation
          </span>
        </div>

        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
          Welcome to <span className="text-primary">XBot</span>
        </h1>

        <p className="max-w-[700px] text-lg text-muted-foreground sm:text-xl">
          Automate your social media presence with intelligent scheduling,
          AI-powered content generation, and seamless multi-platform posting.
        </p>

        <div className="flex flex-wrap gap-4 justify-center mt-4">
          <Link
            href="/editor"
            className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
          >
            Create Post
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
          <Link
            href="/queue"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-6 py-3 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            View Queue
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20">
        <h2 className="text-3xl font-bold text-center mb-12">
          Powerful Features
        </h2>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Feature 1 */}
          <div className="rounded-lg border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4 mb-4">
              <div className="rounded-full bg-primary/10 p-3">
                <Edit className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Content Editor</h3>
            </div>
            <p className="text-muted-foreground">
              Create and edit posts with a powerful editor. Add media, hashtags,
              and format your content with ease.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="rounded-lg border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4 mb-4">
              <div className="rounded-full bg-primary/10 p-3">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Smart Scheduling</h3>
            </div>
            <p className="text-muted-foreground">
              Schedule posts at optimal times. Our AI analyzes your audience
              engagement to suggest the best posting times.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="rounded-lg border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4 mb-4">
              <div className="rounded-full bg-primary/10 p-3">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">AI Generation</h3>
            </div>
            <p className="text-muted-foreground">
              Generate engaging content with AI. Get suggestions for captions,
              hashtags, and post ideas tailored to your brand.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="rounded-lg border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4 mb-4">
              <div className="rounded-full bg-primary/10 p-3">
                <BarChart className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Analytics</h3>
            </div>
            <p className="text-muted-foreground">
              Track performance with detailed analytics. Understand what works
              and optimize your content strategy.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="rounded-lg border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4 mb-4">
              <div className="rounded-full bg-primary/10 p-3">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Queue Management</h3>
            </div>
            <p className="text-muted-foreground">
              Organize your content pipeline. Drag and drop to reorder posts and
              manage your publishing schedule.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="rounded-lg border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4 mb-4">
              <div className="rounded-full bg-primary/10 p-3">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Multi-Platform</h3>
            </div>
            <p className="text-muted-foreground">
              Connect multiple social media accounts. Post to Twitter, LinkedIn,
              and more from a single dashboard.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="rounded-lg border bg-muted/50 p-8 text-center mt-20">
        <h2 className="text-2xl font-bold mb-4">
          Ready to automate your social media?
        </h2>
        <p className="text-muted-foreground mb-6 max-w-[600px] mx-auto">
          Start creating and scheduling posts today. Connect your accounts and
          let XBot handle the rest.
        </p>
        <Link
          href="/settings"
          className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
        >
          Connect Accounts
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </section>
    </div>
  );
}
