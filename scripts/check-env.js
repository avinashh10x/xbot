#!/usr/bin/env node

/**
 * Environment Variable Validation Script
 * Run this before starting your app to verify all required variables are set correctly
 */

const requiredEnvVars = [
    {
        name: 'NEXT_PUBLIC_SUPABASE_URL',
        description: 'Supabase Project URL',
        example: 'https://xxxxx.supabase.co',
        validate: (val) => val.startsWith('https://') && val.includes('supabase.co')
    },
    {
        name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        description: 'Supabase Anonymous/Public Key',
        example: 'eyJhbGc...',
        validate: (val) => val.startsWith('eyJ') && val.length > 100
    },
    {
        name: 'SUPABASE_SERVICE_ROLE_KEY',
        description: 'Supabase Service Role Key',
        example: 'eyJhbGc...',
        validate: (val) => val.startsWith('eyJ') && val.length > 100
    },
    {
        name: 'TWITTER_CLIENT_ID',
        description: 'Twitter OAuth 2.0 Client ID',
        example: 'xxxxxxxxxxxxxxxxxxxxxxxxxx',
        validate: (val) => val.length > 10 && !val.includes('your')
    },
    {
        name: 'TWITTER_CLIENT_SECRET',
        description: 'Twitter OAuth 2.0 Client Secret',
        example: 'xxxxxxxxxxxxxxxxxxxxxxxxxx',
        validate: (val) => val.length > 10 && !val.includes('your')
    },
    {
        name: 'NEXT_PUBLIC_TWITTER_REDIRECT_URI',
        description: 'Twitter OAuth Callback URL',
        example: 'http://localhost:3000/api/auth/twitter/callback',
        validate: (val) => val.includes('/api/auth/twitter/callback')
    },
    {
        name: 'NEXT_PUBLIC_APP_URL',
        description: 'Your App URL',
        example: 'http://localhost:3000',
        validate: (val) => val.startsWith('http')
    },
    {
        name: 'CRON_SECRET',
        description: 'Random secret for cron job authentication',
        example: 'abc123xyz...',
        validate: (val) => val.length > 10 && !val.includes('your')
    }
];

console.log('\n🔍 Checking Environment Variables...\n');

let hasErrors = false;
let hasWarnings = false;

requiredEnvVars.forEach(({ name, description, example, validate }) => {
    const value = process.env[name];

    if (!value) {
        console.error(`❌ ${name}`);
        console.error(`   Missing! ${description}`);
        console.error(`   Example: ${example}\n`);
        hasErrors = true;
    } else if (!validate(value)) {
        console.warn(`⚠️  ${name}`);
        console.warn(`   Invalid format! ${description}`);
        console.warn(`   Current: ${value.substring(0, 20)}...`);
        console.warn(`   Expected: ${example}\n`);
        hasWarnings = true;
    } else {
        console.log(`✅ ${name}`);
        console.log(`   ${description}\n`);
    }
});

// Additional validation checks
console.log('🔍 Additional Checks:\n');

// Check if redirect URI matches app URL
const appUrl = process.env.NEXT_PUBLIC_APP_URL;
const redirectUri = process.env.NEXT_PUBLIC_TWITTER_REDIRECT_URI;

if (appUrl && redirectUri) {
    if (redirectUri.startsWith(appUrl)) {
        console.log('✅ Redirect URI matches App URL');
    } else {
        console.warn('⚠️  Redirect URI does not start with App URL');
        console.warn(`   App URL: ${appUrl}`);
        console.warn(`   Redirect URI: ${redirectUri}`);
        hasWarnings = true;
    }
}

// Check for common mistakes
if (process.env.TWITTER_CLIENT_ID && process.env.TWITTER_CLIENT_ID.includes('your')) {
    console.error('\n❌ TWITTER_CLIENT_ID still has placeholder value!');
    console.error('   Replace "your_twitter_client_id" with actual OAuth 2.0 Client ID');
    hasErrors = true;
}

if (process.env.TWITTER_CLIENT_SECRET && process.env.TWITTER_CLIENT_SECRET.includes('your')) {
    console.error('\n❌ TWITTER_CLIENT_SECRET still has placeholder value!');
    console.error('   Replace "your_twitter_client_secret" with actual OAuth 2.0 Client Secret');
    hasErrors = true;
}

console.log('\n' + '='.repeat(60));

if (hasErrors) {
    console.error('\n❌ ENVIRONMENT CHECK FAILED');
    console.error('\nPlease fix the errors above before running the app.');
    console.error('\nSetup instructions:');
    console.error('1. Copy .env.example to .env.local');
    console.error('2. Follow SETUP.md for getting credentials');
    console.error('3. Run this script again: node scripts/check-env.js\n');
    process.exit(1);
} else if (hasWarnings) {
    console.warn('\n⚠️  ENVIRONMENT CHECK PASSED WITH WARNINGS');
    console.warn('\nThe app might work, but please review warnings above.\n');
    process.exit(0);
} else {
    console.log('\n✅ ALL ENVIRONMENT VARIABLES VALID');
    console.log('\nYou can now run: npm run dev\n');
    process.exit(0);
}
