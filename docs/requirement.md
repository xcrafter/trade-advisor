# 📄 PRD: Real-Time Stock Signal Dashboard with Calendar Sessions

## 🧱 Tech Stack

- **Frontend**: Next.js
- **Backend**: Supabase Edge Functions
- **Database**: Supabase (PostgreSQL)
- **LLM**: OpenAI
- **Market Data**: Upstox API
- **Auth**: Not implemented (can be added later)

---

## 🎯 Objective

Build a calendar-based stock analysis dashboard where users:

1. **Select dates** from a calendar interface
2. **Create trading sessions** for specific dates
3. **Add stock symbols** to each session
4. **Fetch technical indicators** using Upstox API
5. **Generate trading signals** using OpenAI
6. **View results** in session-specific tables
7. **Navigate between** calendar and session views

---

## ✅ Phase 1 Scope (MVP)

### 1. Calendar Landing Page

- **Visual Calendar**: Interactive calendar showing available dates
- **Session Indicators**: Green dots on dates with existing sessions
- **Date Selection**: Click to select/create sessions
- **Recent Sessions**: Quick access to recent trading sessions

### 2. Session Management

- **Create Session**: For selected calendar date
- **Session Details**: Title, description, date information
- **Navigation**: Switch between calendar and session views

Store to `sessions` table:

```ts
{
  id: uuid,
  session_date: date,
  title: text,
  description: text,
  created_at: timestamp,
  updated_at: timestamp
}
```

### 3. Session-Based Stock Management

- **Add Stocks**: User enters stock symbols for specific session
- **Session Isolation**: Each session has independent stock list
- **Historical Data**: View past sessions and their stocks

Store to `stocks` table:

```ts
{
  id: uuid,
  session_id: uuid, // Links to sessions table
  symbol: text,
  created_at: timestamp
}
```

### 4. Stock Analysis (Per Session)

- **Triggered by**: "Analyze" button in session dashboard
- **Backend Process**:
  - Fetch 1-min or 5-min OHLCV candles from Upstox API
  - Calculate technical indicators:
    - VWAP
    - RSI (14)
    - SMA (20)
    - Volume spike detection
    - Trend analysis
  - Send values to OpenAI for signal generation
  - Parse result: `strong`, `caution`, `neutral`, `risk`
  - Save to session-specific signals

Store to `signals` table:

```ts
{
  id: uuid,
  stock_id: uuid, // Links to stocks table (which links to sessions)
  price: numeric,
  rsi: numeric,
  vwap: numeric,
  sma: numeric,
  volume_spike: boolean,
  trend: text,
  signal: "strong" | "caution" | "neutral" | "risk",
  llm_opinion: text,
  created_at: timestamp
}
```

---

## 🗓️ Calendar UI Features

### Calendar Component

- **Date Selection**: Click to select dates
- **Visual Indicators**:
  - Green: Has trading session
  - Default: No session
- **Navigation**: Month/year navigation
- **Legend**: Visual guide for date indicators

### Session Details Panel

- **Selected Date Info**: Display chosen date
- **Session Status**: Show if session exists
- **Quick Actions**:
  - Create new session
  - Open existing session
- **Session Metadata**: Creation/update timestamps

---

## 📊 Session Dashboard Features

### Header Section

- **Back Navigation**: Return to calendar view
- **Session Info**: Date, title, description
- **Session Context**: Clear indication of current session

### Stock Management

- **Add Stocks**: Session-specific stock addition
- **Stock List**: Table showing session stocks
- **Analysis Results**: Session-isolated signals

### Data Isolation

- **Per-Session Data**: Each session maintains separate:
  - Stock symbols
  - Analysis results
  - Signal history
- **Historical Access**: View past session data

---

## 📡 API Endpoints

### Sessions

- `GET /api/sessions` - Fetch all sessions
- `GET /api/sessions?date=YYYY-MM-DD` - Fetch session by date
- `POST /api/sessions` - Create new session

### Stocks (Session-Based)

- `GET /api/stocks?sessionId=uuid` - Fetch stocks for session
- `POST /api/stocks` - Add stock to session

### Analysis

- `POST /api/analyze` - Analyze stock (unchanged)

### Signals (Session-Filtered)

- `GET /api/signals?sessionId=uuid` - Fetch signals for session

---

## 🎨 UI/UX Flow

### 1. Landing Page (Calendar)

```
Calendar View
├── Interactive Calendar
├── Session Details Panel
├── Recent Sessions List
└── Create/Open Actions
```

### 2. Session Dashboard

```
Session Dashboard
├── Header (Back + Session Info)
├── Add Stock Form
├── Stock Analysis Table
└── Session Results
```

### 3. Navigation Flow

```
Calendar → Select Date → Create/Open Session → Dashboard → Back to Calendar
```

---

## 🔮 Database Schema Updates

### New Tables Structure

```sql
sessions (new)
├── id (uuid, primary key)
├── session_date (date, unique)
├── title (text)
├── description (text)
├── created_at (timestamp)
└── updated_at (timestamp)

stocks (updated)
├── id (uuid, primary key)
├── session_id (uuid, foreign key) ← NEW
├── symbol (text)
├── created_at (timestamp)
└── UNIQUE(session_id, symbol) ← Prevents duplicates per session

signals (unchanged)
├── Links through stocks → sessions
└── Inherits session context
```

---

## ⛔ Excluded for Now

- User login/authentication
- Real trade order placement
- Background cron jobs
- Cross-session analytics
- Session sharing/collaboration

---

## 🔜 Future Phases (Optional)

- **Multi-user Support**: User authentication and session ownership
- **Session Templates**: Reusable session configurations
- **Bulk Operations**: Copy stocks between sessions
- **Advanced Analytics**: Cross-session performance comparison
- **Notifications**: Session-based alerts and reminders
- **Export Features**: Session data export capabilities

---

## 🎯 Key Benefits

1. **Organized Analysis**: Date-based session organization
2. **Historical Tracking**: Easy access to past analysis
3. **Focused Sessions**: Isolated analysis per trading day
4. **Visual Navigation**: Intuitive calendar interface
5. **Scalable Structure**: Foundation for advanced features
