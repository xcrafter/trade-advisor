# 📈 Stock Signal Dashboard with Calendar Sessions

A calendar-based stock analysis dashboard built with Next.js, Supabase, and AI-powered trading signals using OpenAI and Upstox API.

## 🚀 Features

- **Calendar Interface**: Interactive calendar for selecting trading dates
- **Session Management**: Create and manage trading sessions for specific dates
- **Session-Based Analysis**: Isolated stock analysis per trading session
- **Historical Tracking**: Access past sessions and their analysis results
- **Technical Analysis**: Automatic calculation of RSI, VWAP, SMA, and trend analysis
- **AI-Powered Signals**: OpenAI generates trading signals (strong, caution, neutral, risk)
- **Real-time Data**: Integration with Upstox API for live market data
- **Modern UI**: Built with shadcn/ui components and Tailwind CSS
- **Visual Navigation**: Seamless navigation between calendar and session views

## 🛠 Tech Stack

- **Frontend**: Next.js 14 with App Router
- **Database**: Supabase (PostgreSQL)
- **UI Components**: shadcn/ui
- **Styling**: Tailwind CSS
- **Market Data**: Twelvedata API (primary), Upstox API (fallback)
- **AI**: OpenAI GPT-4
- **Icons**: Lucide React

## 📋 Prerequisites

Before running this project, you need:

1. **Supabase Project**: Create a project at [supabase.com](https://supabase.com)
2. **Twelvedata API**: Get API key from [twelvedata.com](https://twelvedata.com) (primary data source)
3. **Upstox API**: Get API credentials from [upstox.com](https://upstox.com) (fallback data source)
4. **OpenAI API**: Get API key from [openai.com](https://openai.com)

## 🔧 Installation

1. **Clone the repository**:

   ```bash
   git clone <your-repo-url>
   cd gigs
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Set up environment variables**:
   Create a `.env.local` file in the root directory:

   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

   # Twelvedata API Configuration (Primary Data Source)
   TWELVEDATA_API_KEY=your_twelvedata_api_key

   # Upstox API Configuration (Fallback Data Source)
   UPSTOX_API_KEY=your_upstox_api_key
   UPSTOX_ACCESS_TOKEN=your_upstox_access_token

   # OpenAI Configuration
   OPENAI_API_KEY=your_openai_api_key
   ```

4. **Set up the database**:
   Run the SQL schema in your Supabase SQL editor:

   ```sql
   -- Copy and run the contents of database/schema.sql
   ```

5. **Start the development server**:

   ```bash
   npm run dev
   ```

6. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📊 Database Schema

### Sessions Table

```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_date DATE NOT NULL UNIQUE,
  title TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Stocks Table

```sql
CREATE TABLE stocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, symbol)
);
```

### Signals Table

```sql
CREATE TABLE signals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stock_id UUID NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
  price NUMERIC NOT NULL,
  rsi NUMERIC NOT NULL,
  vwap NUMERIC NOT NULL,
  sma NUMERIC NOT NULL,
  volume_spike BOOLEAN NOT NULL,
  trend TEXT NOT NULL,
  signal TEXT NOT NULL CHECK (signal IN ('strong', 'caution', 'neutral', 'risk')),
  llm_opinion TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🔌 API Endpoints

### Sessions

- `GET /api/sessions` - Fetch all sessions
- `GET /api/sessions?date=YYYY-MM-DD` - Fetch session by date
- `POST /api/sessions` - Create a new session

### Stocks

- `GET /api/stocks?sessionId=uuid` - Fetch stocks for a session
- `POST /api/stocks` - Add a stock to a session

### Analysis

- `POST /api/analyze` - Analyze a stock and generate signals

### Signals

- `GET /api/signals?sessionId=uuid` - Fetch signals for a session

## 🎯 Usage

1. **Select Date**: Choose a date from the interactive calendar
2. **Create/Open Session**: Create a new session or open an existing one
3. **Add Stocks**: Enter stock symbols for the selected session
4. **Analyze**: Click "Analyze" to generate AI-powered trading signals
5. **View Results**: See technical indicators and signals for the session
6. **Navigate**: Use "Back to Calendar" to switch between sessions

## 🎨 Signal Colors

- 🟢 **Strong**: Green - Buy signal
- 🟡 **Caution**: Yellow - Hold/watch signal
- 🔴 **Risk**: Red - Sell/avoid signal
- ⚪ **Neutral**: Gray - No clear direction

## 📊 Data Sources

The application uses a dual data source approach for maximum reliability:

### Primary: Twelvedata API

- **Coverage**: Global markets including Indian stocks (BSE/NSE)
- **Data Quality**: High-quality, reliable data feed
- **Format**: 1-minute OHLCV candles
- **Usage**: Fetches 200 data points for comprehensive analysis

### Fallback: Upstox API

- **Coverage**: Indian stock markets (NSE/BSE)
- **Integration**: Seamless fallback when Twelvedata is unavailable
- **Format**: 1-minute OHLCV candles
- **Reliability**: Local Indian market specialist

### Mock Data Generation

- **Development**: Realistic mock data when APIs are unavailable
- **Symbol-specific**: Tailored price ranges for different stocks
- **Volume patterns**: Realistic volume spikes and patterns

## 🔮 Technical Indicators

- **RSI (14)**: Relative Strength Index for momentum
- **VWAP**: Volume Weighted Average Price
- **SMA (20)**: Simple Moving Average
- **EMA (9)**: Exponential Moving Average
- **ATR (14)**: Average True Range for volatility
- **Volume Spike**: Detects unusual volume activity
- **Trend**: Identifies uptrend, downtrend, or sideways movement
- **Breakout Signals**: Day high, previous day range, opening range breakouts
- **Quality Metrics**: Clean setup evaluation and intraday scoring

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically

### Manual Deployment

```bash
npm run build
npm start
```

## 🛡 Environment Variables

Make sure to set these in your production environment:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `TWELVEDATA_API_KEY`
- `UPSTOX_API_KEY`
- `UPSTOX_ACCESS_TOKEN`
- `OPENAI_API_KEY`
- `CACHE_DURATION_SECONDS` (optional, default: 300) - Cache duration in seconds for market data analysis

## 🔧 Cache Configuration Examples

```bash
# In your .env.local file:

# Set 1-minute cache duration (for development/testing)
CACHE_DURATION_SECONDS=60

# Set 10-minute cache duration
CACHE_DURATION_SECONDS=600

# Set 30-minute cache duration (for production)
CACHE_DURATION_SECONDS=1800

# Use default 5-minute cache (300 seconds)
# (don't set the variable or leave it empty)
```

## 🐛 Development Notes

- The app includes mock data generation when APIs are unavailable
- Technical indicators are calculated client-side for better performance
- OpenAI integration includes fallback logic for signal generation
- All API calls include proper error handling

## 🔄 Future Enhancements

- Real-time WebSocket updates
- User authentication
- Portfolio tracking
- Push notifications
- Advanced charting
- Backtesting features

## 📝 License

This project is for educational purposes. Please ensure you comply with all API terms of service.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📞 Support

For issues and questions, please create an issue in the GitHub repository.

---

Built with ❤️ using Next.js, Supabase, and modern web technologies.

## 🚀 Recent Updates

### Database-Based Caching System (Latest)

- **Configurable Cache Duration**: Set `CACHE_DURATION_SECONDS` environment variable (default: 300 seconds)
- **Intelligent Caching**: System checks database timestamps instead of in-memory cache
- **Performance Optimization**: Avoids redundant API calls for recently analyzed stocks
- **Cache Management**: Enhanced `/api/cache-status` endpoint for monitoring and clearing cache
- **Persistent Cache**: Cache survives server restarts as it's stored in database

### Volume Data Fix

- **Fixed Random Volume Issue**: System now displays real volume data from APIs instead of random numbers
- **Database Enhancement**: Added `volume` column to signals table
- **Session Validation**: Improved stock analysis with proper session context validation

### Database Migration Required

If you have existing data, run this SQL in your Supabase SQL editor:

```sql
-- Add volume column to signals table
ALTER TABLE signals ADD COLUMN volume BIGINT;

-- Add comment for the new column
COMMENT ON COLUMN signals.volume IS 'Current trading volume for the stock at analysis time';

-- Add index for volume-based queries if needed
CREATE INDEX IF NOT EXISTS idx_signals_volume ON signals(volume);
```

### Session-Aware Analysis

- **Enhanced Validation**: Stock analysis now validates session context
- **Better Error Messages**: Clear error messages when stocks don't belong to sessions
- **Improved Logging**: Better debugging information for stock analysis

### Security Improvements

- **Supabase Client Consistency**: All API endpoints now use anon key instead of service role key
- **Principle of Least Privilege**: Reduced permissions to only what's necessary for operations
- **Centralized Client**: All APIs use the shared Supabase client from `@/lib/supabase`

### Performance Optimization

- **Market Data Caching**: Intelligent 5-minute cache for Twelvedata/Upstox API calls
- **Reduced API Usage**: Avoids redundant API calls for the same symbol within cache duration
- **Smart Cache Management**: Automatic cache expiration and symbol-based caching
- **Faster Analysis**: Subsequent analyses use cached data for improved performance
