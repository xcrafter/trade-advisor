# 🚀 Quick Setup Guide

## 1. Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# Market Data APIs
TWELVEDATA_API_KEY=your_twelvedata_api_key
UPSTOX_API_KEY=your_upstox_api_key
UPSTOX_ACCESS_TOKEN=your_upstox_access_token

# AI Analysis
OPENAI_API_KEY=sk-your_openai_api_key

# Cache Configuration (optional)
CACHE_DURATION_SECONDS=300
```

## 2. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor in your Supabase dashboard
3. Copy and paste the contents of `database/schema.sql`
4. Run the SQL to create tables and indexes

## 3. API Keys

### Supabase

- Get URL and keys from Project Settings > API

### Upstox

1. Register at [upstox.com](https://upstox.com)
2. Create an app in the developer console
3. Get API key and access token

### OpenAI

1. Sign up at [openai.com](https://openai.com)
2. Go to API section
3. Create an API key

### Twelvedata (Primary Data Source)

1. Sign up at [twelvedata.com](https://twelvedata.com)
2. Get your free API key
3. Supports global markets including Indian stocks

### Cache Configuration

- `CACHE_DURATION_SECONDS`: How long to cache analysis results (default: 300 seconds = 5 minutes)
- Examples:
  - `60` = 1 minute cache
  - `600` = 10 minutes cache
  - `1800` = 30 minutes cache

## 4. Run the Project

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 5. Test the Application

1. Add a stock symbol (e.g., "RELIANCE")
2. Click "Analyze" to generate signals
3. View the results in the dashboard

## 🔧 Troubleshooting

- **Database errors**: Check if you've run the SQL schema
- **API errors**: Verify your environment variables
- **Mock data**: The app will use mock data if APIs are unavailable
- **CORS issues**: Make sure your Supabase URL is correct

## 📱 Features to Test

- ✅ Add stock symbols
- ✅ Generate analysis signals
- ✅ View color-coded results
- ✅ See technical indicators
- ✅ Read AI opinions
