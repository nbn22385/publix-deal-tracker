# Publix Deal Tracker - Specification

## Project Overview
- **Project Name**: Publix Deal Tracker
- **Type**: Web Application (Next.js)
- **Core Functionality**: Track Publix weekly ad deals and notify users when watchlisted items go on sale/BOGO
- **Target Users**: Publix shoppers who want to save money on groceries

## Tech Stack
| Component | Technology |
|-----------|------------|
| Framework | Next.js 16 (App Router) |
| Auth | Better-auth |
| ORM | Drizzle |
| Database | PostgreSQL (Neon) |
| Email | Resend |
| Scraping | Publix first-party savings API (`services.publix.com/api/v4/savings`, same backend as the weekly-ad view-all page); store search uses curated seed list |
| UI | Tailwind CSS + shadcn/ui |
| Cron | Vercel Cron (Thu 02:00 EST) |

## Geographic Restriction
- Only US stores where Publix operates: FL, GA, AL, TN, SC, NC, VA

## Database Schema

### Tables (managed by Better-auth)
- `users` - User accounts
- `sessions` - Auth sessions
- `accounts` - OAuth/email accounts

### Application Tables

```sql
-- User's selected store
CREATE TABLE user_store (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  store_id TEXT NOT NULL,
  store_name TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User's watchlist items
CREATE TABLE watchlist_items (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  available_item_id INTEGER REFERENCES available_items(id),
  keywords TEXT,
  department TEXT,
  alert_type TEXT NOT NULL, -- 'specific_item' | 'keyword'
  created_at TIMESTAMP DEFAULT NOW()
);

-- Cached sale items per store
CREATE TABLE available_items (
  id SERIAL PRIMARY KEY,
  store_id TEXT NOT NULL,
  department TEXT NOT NULL,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  image_url TEXT,
  is_bogo BOOLEAN DEFAULT FALSE,
  sale_price TEXT,
  description TEXT,
  fetched_at TIMESTAMP DEFAULT NOW()
);

-- Email sent history
CREATE TABLE notification_log (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  watchlist_item_id INTEGER,
  matched_item_id INTEGER,
  sent_at TIMESTAMP DEFAULT NOW(),
  status TEXT -- 'sent', 'failed'
);
```

## Core Features

### 1. Authentication
- Email magic link authentication via Better-auth
- Session management

### 2. Onboarding Flow
1. User signs up
2. User enters ZIP code
3. App fetches nearby Publix stores (filtered to operating states)
4. User selects their preferred store

### 3. Watchlist Management
- **Add by browsing**: Select from current sales for user's store
- **Add by keywords**: Enter search terms (e.g., "chicken", "yogurt")
- **Optional department filter**: Limit keyword alerts to specific department
- **Remove items**: Delete from watchlist

### 4. Dashboard
- **Currently On Sale**: Real-time display of watchlisted items that are currently on sale
- **Your Watchlist**: All watchlist items (on-sale and waiting)

### 5. Weekly Notification Cron (Thursday 02:00 EST)
For each user:
1. Fetch current sales for their store
2. Match against watchlist:
   - Specific items: direct productId match
   - Keywords: fuzzy match on product_name (optionally filtered by department)
3. Collect all matches
4. Send ONE comprehensive email via Resend

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/auth/sign-in` | Sign in (Better-auth) |
| POST | `/api/auth/sign-up` | Sign up (Better-auth) |
| POST | `/api/stores/search` | Get stores by ZIP |
| GET | `/api/stores/[storeId]/items` | Get current sales for store |
| GET | `/api/watchlist` | Get user's watchlist |
| POST | `/api/watchlist` | Add item to watchlist |
| DELETE | `/api/watchlist/[id]` | Remove item from watchlist |
| GET | `/api/user/store` | Get user's selected store |
| POST | `/api/user/store` | Set user's store |
| POST | `/api/cron/weekly-ad` | Trigger weekly ad fetch & notify |

## UI Pages

| Path | Description |
|------|-------------|
| `/` | Landing page |
| `/sign-in` | Sign in page |
| `/sign-up` | Sign up page |
| `/forgot-password` | Request password reset |
| `/reset-password` | Set new password (token link) |
| `/watchlist` | Main tab: on-sale matches + full watchlist (old `/dashboard`) |
| `/browse` | Main tab: store picker, sale browsing, keyword alerts (old `/watchlist/add`) |

## Cron Schedule
```json
{
  "crons": [
    {
      "path": "/api/cron/weekly-ad",
      "schedule": "0 7 * * 5"
    }
  ]
}
```
- Runs Friday 07:00 UTC = Thursday 02:00 EST

## Environment Variables
```
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=http://localhost:3000
RESEND_API_KEY=...
```

## Acceptance Criteria
1. User can sign up/sign in with email
2. User can enter ZIP and select a Publix store
3. User can browse current sales and add items to watchlist
4. User can add keyword alerts with optional department filter
5. Dashboard shows currently on-sale watchlist items
6. Dashboard shows all watchlist items
7. Cron job runs weekly and sends comprehensive email for matches
8. Only stores in FL, GA, AL, TN, SC, NC, VA are shown
