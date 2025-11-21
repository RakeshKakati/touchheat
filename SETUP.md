# Quick Setup Guide

## 1. Install Dependencies

```bash
npm install
```

## 2. Set Up Supabase

1. Create account at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to SQL Editor
4. Run the migration: Copy and paste contents of `supabase/migrations/001_initial_schema.sql`
5. Get your credentials from Project Settings → API

## 3. Configure Environment

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 4. Build Snippet

```bash
npm run build:snippet
```

This creates `public/touchheat.min.js` (should be ≤ 5KB).

## 5. Run Development

```bash
npm run dev
```

Visit http://localhost:3000

## 6. Test the Flow

1. Sign up / Login
2. Create a project
3. Copy the snippet code
4. Add it to a test mobile page
5. View analytics in dashboard

## Production Deployment

1. Update `NEXT_PUBLIC_APP_URL` in Vercel environment variables
2. Deploy to Vercel
3. The snippet will be available at: `https://your-domain.com/touchheat.min.js`

