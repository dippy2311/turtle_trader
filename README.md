# 🐢 TurtleTrader AI

Indian equity trading signals based on Richard Dennis Turtle Trading strategy.
Built with Next.js → deploys to Vercel like Suraksha24.

**Total cost: ₹0**

---

## Deploy in 15 minutes — exact steps

### Step 1 — Supabase (database) — 3 minutes

1. Go to **supabase.com** → Sign Up (free)
2. Click **New Project** → name it `turtletrader` → set a password → Create
3. Wait ~2 minutes for it to set up
4. Go to **SQL Editor** (left sidebar)
5. Copy the entire contents of `supabase-schema.sql` → paste → click **Run**
6. Go to **Settings → API** → copy these 3 values:
   - `Project URL`
   - `anon public` key
   - `service_role` key (click reveal)

---

### Step 2 — GitHub — 2 minutes

1. Go to **github.com** → Sign Up or Sign In
2. Click **+** → **New repository** → name it `turtletrader-ai` → Create
3. Upload this entire folder to the repo:
   - Click **uploading an existing file**
   - Drag the entire `turtletrader-next` folder contents
   - Click **Commit changes**

---

### Step 3 — Vercel — 5 minutes

1. Go to **vercel.com** → Sign Up with GitHub (free)
2. Click **Add New Project**
3. Select your `turtletrader-ai` repo → click **Import**
4. Under **Environment Variables**, add these 3:

   | Name | Value |
   |------|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your anon public key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Your service_role key |

5. Click **Deploy**
6. Wait ~2 minutes → your app is live!

---

### Step 4 — Open on your phone

1. Vercel gives you a URL like `turtletrader-ai.vercel.app`
2. Open it in your phone browser
3. Tap **Share** → **Add to Home Screen** → it works like a real app

---

## How to use

1. **Sign Up** with your email and password
2. Tap **Scanner** → tap **↺ Scan**
3. Wait 30–60 seconds (fetches 50 stocks from NSE)
4. See BUY / SELL / WATCH signals sorted by AI score
5. Tap any stock for full analysis, stop loss, position sizing
6. Come back after 3:45 PM every trading day for fresh signals

---

## Features

| Feature | Details |
|---------|---------|
| Stock universe | 110 top NSE stocks (NIFTY 50 + midcap leaders) |
| Signals | BUY / SELL / WATCH / HOLD |
| Entry rule | 55-day high breakout |
| Exit rule | 20-day low broken |
| Stop loss | Entry − 2×ATR(14) |
| Filters | Price > 200 EMA, Golden cross, ADX > 20, Volume > 1.5× |
| AI Score | 0–100 weighted across 6 components |
| Position sizing | Auto-calculated from your capital and risk% |
| AI Chat | Rule-based, free, no API key |
| Auth | Supabase Auth — free |
| Database | Supabase Postgres — free |
| Market data | Yahoo Finance — free |

---

## Turtle Trading Rules

**BUY when ALL 7 are true:**
1. Price above 200 EMA
2. 50 EMA above 200 EMA (golden cross)
3. 55-day high breakout
4. Volume > 1.5× 20-day average
5. ADX > 20
6. Market trend = BULLISH
7. No existing position

**SELL when ANY is true:**
- Price drops below 20-day low
- 50 EMA crosses below 200 EMA

**Stop Loss:** Entry − (2 × ATR 14)

**Position size:** Risk exactly 1% of capital per trade

---

## AI Score Breakdown

| Component | Weight |
|-----------|--------|
| Trend (EMA alignment) | 30% |
| Momentum (RSI) | 20% |
| Volume (vs 20d avg) | 20% |
| Sector strength | 10% |
| Risk (ATR volatility) | 10% |
| Market trend | 10% |

---

*For educational purposes only. Not SEBI-registered investment advice.*
