# TouchHeat - Mobile Thumb Analytics SaaS

A production-ready SaaS platform for analyzing mobile thumb-reach patterns, mis-taps, unreachable CTAs, and mobile zone heatmaps using a lightweight 5KB JavaScript snippet.

## Features

- **5KB JavaScript Snippet**: Lightweight analytics collection script
- **Real-time Analytics**: Track touch events, thumb zones, mis-taps, and pressure
- **Heatmap Visualization**: Visual representation of tap density
- **Insight Engine**: Automatic detection of unreachable CTAs, thumb zone distribution, and reachability scores
- **Multi-tenant Architecture**: Secure project-based analytics with Row Level Security (RLS)
- **Modern Stack**: Next.js 15, TypeScript, TailwindCSS, Supabase

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **Database & Auth**: Supabase (PostgreSQL + RLS)
- **Charts**: Recharts
- **Deployment**: Vercel (Edge + Node functions)

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account and project

## Setup Instructions

### 1. Clone and Install

```bash
git clone <repository-url>
cd TouchHeat
npm install
```

### 2. Set Up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the migration file:
   ```bash
   # Copy contents of supabase/migrations/001_initial_schema.sql
   # Paste and execute in Supabase SQL Editor
   ```
3. Get your Supabase credentials:
   - Project URL
   - Anon key
   - Service role key

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

For production, update `NEXT_PUBLIC_APP_URL` to your production domain (e.g., `https://touchheat.app`).

### 4. Build the Snippet

```bash
npm run build:snippet
```

This will create `public/touchheat.min.js` (must be ≤ 5KB).

### 5. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

### 6. Deploy to Vercel

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

The snippet will be available at: `https://your-domain.com/touchheat.min.js`

## Database Schema

### Tables

- **projects**: User projects with API keys
- **touch_events**: Individual touch/tap events
- **insights**: Computed insights and scores

### Row Level Security (RLS)

All tables have RLS enabled. Users can only access their own projects and associated data.

## API Endpoints

### `POST /api/ingest`
Ingests touch events from the snippet.

**Body:**
```json
{
  "project_id": "uuid",
  "events": [
    {
      "x": 100,
      "y": 200,
      "viewport_w": 375,
      "viewport_h": 667,
      "thumb_zone": "left",
      "mis_tap": false,
      "pressure": 0.5,
      "selector": "#button",
      "url": "https://example.com/page"
    }
  ]
}
```

### `GET /api/heatmap?project_id=uuid&url=optional`
Returns aggregated heatmap data (20px buckets).

### `GET /api/insights?project_id=uuid&url=optional`
Returns computed insights:
- Mis-tap rate
- Thumb zone distribution
- Unreachable CTAs
- Reachability scores
- Scroll comfort score

### `GET /api/projects/[projectId]/status`
Returns snippet installation status:
- Installation status (active/inactive/no_data)
- Last event timestamp
- Total and recent event counts
- List of tracked URLs

### `POST /api/projects/[projectId]/test`
Creates a test event to verify snippet installation.

### `GET /api/projects`
Lists user's projects (requires auth).

### `POST /api/projects`
Creates a new project (requires auth).

## Snippet Usage

Add this snippet to your mobile website:

```html
<script async src="https://touchheat.app/touchheat.min.js" data-project="YOUR_PROJECT_ID"></script>
```

Replace `YOUR_PROJECT_ID` with the UUID from your project dashboard.

## Dashboard Features

- **Project Management**: Create projects and get snippet code
- **Domain Verification**: Configure allowed domains for each project
- **Snippet Installation Status**: Real-time verification that snippet is installed and working
  - Status indicators (Active/Inactive/No Data)
  - Last event timestamp
  - Event counts (total and last 24 hours)
  - Pages being tracked
  - Test event functionality
- **Analytics Dashboard**: View insights, charts, and metrics
- **Heatmap Visualization**: Visual tap density overlay
- **URL Filtering**: Filter analytics by specific pages

## Insight Types

1. **Mis-Tap Rate**: Percentage of rapid double-taps (within 150ms)
2. **Thumb Zone Distribution**: Left/right/center thumb usage
3. **Unreachable CTAs**: Elements with < 1% tap rate but visible
4. **Reachability Score**: Distance-based reachability (0-100)
5. **Scroll Comfort Score**: Combined thumb zone and mis-tap metrics

## Development

### Project Structure

```
/app
  /api          # API routes
  /dashboard    # Dashboard pages
  /login        # Auth pages
/components     # React components
/lib            # Utilities and Supabase clients
/snippet        # Snippet source code
/supabase       # Database migrations
/public         # Static files (snippet output)
```

### Building the Snippet

The snippet is built using esbuild:

```bash
npm run build:snippet
```

Check the output size - it should be ≤ 5KB minified.

## Security

- All API endpoints validate project ownership via RLS
- API keys are generated securely
- Service role key only used server-side
- No client-side API key exposure
- **Domain Verification**: Projects can restrict which domains are allowed to send events
  - Configure allowed domains in the project dashboard
  - If no domains are configured, all domains are allowed
  - Domain verification checks the `Origin` header and event URLs
  - Supports subdomain matching (e.g., `www.example.com` matches `example.com`)

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.

