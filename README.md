# TweetPilot - Twitter Scheduling SaaS Platform

A production-ready SaaS platform for scheduling and automating Twitter posts, built with Next.js 14, Supabase, and Twitter API v2.

## Features

- **User Authentication**: Email-based signup/login via Supabase Auth
- **Twitter OAuth 2.0 PKCE**: Secure Twitter account connection
- **Tweet Scheduling**: Schedule tweets with text and media
- **Automated Posting**: Hourly cron job with retry logic and rate limit handling
- **Realtime Updates**: Live dashboard updates via Supabase Realtime
- **Multi-User Support**: Isolated data per user with RLS policies
- **Clean UI**: Modern, responsive interface with TailwindCSS

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 19, TailwindCSS
- **Backend**: Next.js Server Actions, Vercel Functions
- **Database**: Supabase (PostgreSQL with RLS)
- **Authentication**: Supabase Auth + Twitter OAuth 2.0
- **Twitter API**: twitter-api-v2
- **Deployment**: Vercel
- **Scheduling**: Vercel Cron Jobs

## Quick Start

See [SETUP.md](./SETUP.md) for detailed setup instructions.

**Having issues with Twitter OAuth?** See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

## Getting Started

First, install dependencies and set up environment:

```bash
npm install
cp .env.example .env.local
# Fill in .env.local with your credentials (see SETUP.md)

# Verify environment variables are correct
npm run check-env

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Important: Twitter OAuth 2.0 Setup

⚠️ **Common mistake:** Don't use API Key/Secret. You need **OAuth 2.0 Client ID/Secret**.

To get the correct credentials:

1. Go to Twitter Developer Portal → Your App
2. Click "User authentication settings" (NOT "Keys and tokens")
3. Set up OAuth 2.0 with Read and Write permissions
4. Copy **OAuth 2.0 Client ID** and **Client Secret**

For complete setup instructions, see [SETUP.md](./SETUP.md)

## Project Structure

```
xbot/
├── src/
│   ├── app/
│   │   ├── actions/          # Server Actions
│   │   ├── api/              # API routes (OAuth, Cron)
│   │   ├── dashboard/        # Dashboard page
│   │   ├── settings/         # Settings page
│   │   └── login/signup/     # Auth pages
│   ├── components/           # React components
│   ├── lib/
│   │   ├── supabase/         # Supabase clients
│   │   ├── twitter/          # Twitter API integration
│   │   └── db/               # Database queries
│   └── types/                # TypeScript interfaces
├── supabase/migrations/      # Database schema
└── vercel.json               # Cron job configuration
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Twitter API Documentation](https://developer.twitter.com/en/docs)

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new).

Check out [SETUP.md](./SETUP.md) for deployment instructions.

## License

MIT
