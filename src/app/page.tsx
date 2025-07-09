"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import StockAutocomplete from "@/components/StockAutocomplete";
import { TrendingUp, Search, BarChart3 } from "lucide-react";
import { type InstrumentSearchResult } from "@/models/InstrumentModel";
import StockChart from "@/components/StockChart";

interface AnalysisResult {
  // Basic Info
  symbol: string;
  price: number;
  signal: "strong_buy" | "buy" | "hold" | "sell" | "strong_sell" | "neutral";
  direction: "LONG" | "SHORT" | "NEUTRAL";
  confidence_level: "very_high" | "high" | "moderate" | "low";

  // Historical Data
  candles: {
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }[];

  // Trend Analysis
  trend_direction: "bullish" | "bearish" | "sideways" | "transitioning";
  trend_strength: "strong" | "moderate" | "weak";
  swing_score: number;
  swing_setup_quality: "excellent" | "good" | "fair" | "poor";
  volatility_percentile: number;
  volatility_rating: "very_high" | "high" | "moderate" | "low" | "very_low";

  // Moving Averages
  sma_50: number;
  sma_200: number;
  ema_21: number;
  ema_50: number;
  golden_cross: boolean;
  death_cross: boolean;

  // Momentum Indicators
  rsi_14: number;
  rsi_21: number;
  rsi_signal: "oversold" | "bearish" | "neutral" | "bullish" | "overbought";
  macd_line: number;
  macd_signal: number;
  macd_histogram: number;
  macd_bullish_crossover: boolean;
  stochastic: number;
  stochastic_signal:
    | "oversold"
    | "bearish"
    | "neutral"
    | "bullish"
    | "overbought";

  // Volume Analysis
  volume_20day_avg: number;
  volume_current: number;
  volume_vs_20day_avg: number;
  volume_trend_20day:
    | "increasing"
    | "decreasing"
    | "stable"
    | "insufficient_data";
  volume_breakout: boolean;
  volume_quality: "excellent" | "good" | "average" | "poor";
  accumulation_distribution: number;

  // Support & Resistance
  support_levels: number[];
  resistance_levels: number[];
  nearest_support: number;
  nearest_resistance: number;
  support_distance_percent: number;
  resistance_distance_percent: number;
  weekly_pivot: number;
  fibonacci_levels: number[];

  // Risk Management
  atr_21: number;
  bollinger_upper: number;
  bollinger_lower: number;
  bollinger_position:
    | "above_upper"
    | "upper_half"
    | "middle"
    | "lower_half"
    | "below_lower";

  // Market Context
  market_regime:
    | "bull_market"
    | "bear_market"
    | "sideways"
    | "volatile"
    | "transitioning";
  sector_performance: number;
  relative_strength: number;
  sector_correlation: number;

  // AI Analysis & Trading Plan
  opinion: string;
  entry_price: number;
  target_price_1: number;
  target_price_2: number;
  stop_loss: number;
  holding_period:
    | "1-2_weeks"
    | "2-4_weeks"
    | "1-2_months"
    | "2-3_months"
    | "long_term";
  position_size_percent: number;
  risk_reward_ratio: string;
  trading_plan: string;
  key_catalysts: string;
  risk_factors: string;
}

export default function Home() {
  const [selectedStock, setSelectedStock] =
    useState<InstrumentSearchResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");

  const handleAnalyze = async () => {
    if (!selectedStock) {
      setError("Please select a stock to analyze");
      return;
    }

    setAnalyzing(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          instrumentKey: selectedStock.instrument_key,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setResult(data);
        console.log("Analysis result:", data);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Analysis failed");
      }
    } catch (err) {
      setError("Failed to analyze stock");
      console.error("Analysis error:", err);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto max-w-4xl p-6">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <TrendingUp className="h-10 w-10 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              Stock Analysis
            </h1>
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Analyze stocks with AI-powered swing trading insights
          </p>
        </div>

        {/* Search Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Stock Search & Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <StockAutocomplete
                  value={selectedStock?.symbol || ""}
                  onSelect={(stock) => {
                    setSelectedStock(stock);
                    setError("");
                  }}
                  placeholder="Search for stocks (e.g., RELIANCE, TCS, INFY)"
                />
              </div>
              <Button
                onClick={handleAnalyze}
                disabled={analyzing || !selectedStock}
                size="lg"
                className="px-8"
              >
                {analyzing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Analyze
                  </>
                )}
              </Button>
            </div>

            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-800">
                  {error}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Results Section */}
        {result && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Analysis Results for {result.symbol}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Price Chart */}
                <div className="mb-6">
                  <StockChart
                    data={result.candles}
                    sma20={result.sma_200}
                    sma50={result.sma_50}
                    ema9={result.ema_21}
                  />
                </div>

                {/* Technical Analysis Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Basic Info */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Basic Info
                    </h3>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span>Current Price:</span>
                        <span className="font-medium">
                          ₹{result.price?.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Signal:</span>
                        <span
                          className={`font-medium ${
                            result.signal === "strong_buy" ||
                            result.signal === "buy"
                              ? "text-green-600"
                              : result.signal === "strong_sell" ||
                                result.signal === "sell"
                              ? "text-red-600"
                              : "text-yellow-600"
                          }`}
                        >
                          {result.signal?.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Direction:</span>
                        <span className="font-medium">{result.direction}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Confidence:</span>
                        <span className="font-medium">
                          {result.confidence_level}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Technical Indicators */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Technical Indicators
                    </h3>
                    <div className="text-sm space-y-2">
                      {/* RSI */}
                      <div className="flex justify-between">
                        <span>RSI(14):</span>
                        <span
                          className={`font-medium ${
                            result.rsi_14 > 70
                              ? "text-red-600"
                              : result.rsi_14 < 30
                              ? "text-green-600"
                              : ""
                          }`}
                        >
                          {result.rsi_14?.toFixed(1)}
                        </span>
                      </div>

                      {/* MACD */}
                      <div>
                        <div className="flex justify-between">
                          <span>MACD:</span>
                          <span
                            className={`font-medium ${
                              result.macd_histogram > 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {result.macd_line?.toFixed(2)}
                          </span>
                        </div>
                        <div className="ml-4 text-xs text-gray-500 space-y-0.5">
                          <div className="flex justify-between">
                            <span>Signal:</span>
                            <span>{result.macd_signal?.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Histogram:</span>
                            <span
                              className={
                                result.macd_histogram > 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }
                            >
                              {result.macd_histogram?.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Stochastic */}
                      <div className="flex justify-between">
                        <span>Stochastic:</span>
                        <span
                          className={`font-medium ${
                            result.stochastic > 80
                              ? "text-red-600"
                              : result.stochastic < 20
                              ? "text-green-600"
                              : ""
                          }`}
                        >
                          {result.stochastic?.toFixed(1)}
                        </span>
                      </div>

                      {/* Trend Direction */}
                      <div className="flex justify-between">
                        <span>Trend:</span>
                        <span
                          className={`font-medium ${
                            result.trend_direction === "bullish"
                              ? "text-green-600"
                              : result.trend_direction === "bearish"
                              ? "text-red-600"
                              : "text-yellow-600"
                          }`}
                        >
                          {result.trend_direction?.toUpperCase()}
                        </span>
                      </div>

                      {/* Volatility */}
                      <div className="flex justify-between">
                        <span>Volatility:</span>
                        <span className="font-medium">
                          {result.volatility_percentile?.toFixed(1)}%
                        </span>
                      </div>

                      {/* Support & Resistance */}
                      <div>
                        <div className="text-xs text-gray-500 mb-1">
                          Support & Resistance
                        </div>
                        <div className="ml-4 space-y-0.5">
                          <div className="flex justify-between">
                            <span>Support:</span>
                            <span className="text-green-600">
                              ₹{result.nearest_support?.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Resistance:</span>
                            <span className="text-red-600">
                              ₹{result.nearest_resistance?.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Weekly Pivot:</span>
                            <span className="font-medium">
                              ₹{result.weekly_pivot?.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Support Distance:</span>
                            <span className="text-green-600">
                              {result.support_distance_percent?.toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Resistance Distance:</span>
                            <span className="text-red-600">
                              {result.resistance_distance_percent?.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Additional Support & Resistance Levels */}
                      <div className="mt-4">
                        <div className="text-xs text-gray-500 mb-1">
                          Support Levels
                        </div>
                        <div className="ml-4 space-y-0.5">
                          {result.support_levels?.map((level, index) => (
                            <div key={index} className="flex justify-between">
                              <span>S{index + 1}:</span>
                              <span className="text-green-600">
                                ₹{level.toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-2">
                        <div className="text-xs text-gray-500 mb-1">
                          Resistance Levels
                        </div>
                        <div className="ml-4 space-y-0.5">
                          {result.resistance_levels?.map((level, index) => (
                            <div key={index} className="flex justify-between">
                              <span>R{index + 1}:</span>
                              <span className="text-red-600">
                                ₹{level.toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Fibonacci Levels */}
                      <div className="mt-2">
                        <div className="text-xs text-gray-500 mb-1">
                          Fibonacci Levels
                        </div>
                        <div className="ml-4 space-y-0.5">
                          {result.fibonacci_levels?.map((level, index) => (
                            <div key={index} className="flex justify-between">
                              <span>
                                Fib {((index + 1) * 0.236).toFixed(3)}:
                              </span>
                              <span className="font-medium">
                                ₹{level.toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Moving Averages Analysis */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Moving Averages
                    </h3>
                    <div className="text-sm space-y-1">
                      {/* Simple Moving Averages */}
                      <div className="mb-2">
                        <div className="text-xs text-gray-500 mb-1">
                          Simple Moving Averages
                        </div>
                        <div className="flex justify-between">
                          <span>SMA 200:</span>
                          <span
                            className={`font-medium ${
                              result.price > result.sma_200
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            ₹{result.sma_200?.toFixed(2) || "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>SMA 50:</span>
                          <span
                            className={`font-medium ${
                              result.price > result.sma_50
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            ₹{result.sma_50?.toFixed(2) || "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>SMA 200:</span>
                          <span
                            className={`font-medium ${
                              result.price > result.sma_200
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            ₹{result.sma_200?.toFixed(2) || "N/A"}
                          </span>
                        </div>
                      </div>

                      {/* Exponential Moving Averages */}
                      <div>
                        <div className="text-xs text-gray-500 mb-1">
                          Exponential Moving Averages
                        </div>
                        <div className="flex justify-between">
                          <span>EMA 21:</span>
                          <span
                            className={`font-medium ${
                              result.price > result.ema_21
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            ₹{result.ema_21?.toFixed(2) || "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>EMA 50:</span>
                          <span
                            className={`font-medium ${
                              result.price > result.ema_50
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            ₹{result.ema_50?.toFixed(2) || "N/A"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Price Ranges */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Price Ranges
                    </h3>
                    <div className="text-sm space-y-2">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">
                          3-Day Range
                        </div>
                        <div className="flex justify-between">
                          <span>High:</span>
                          <span className="font-medium text-green-600">
                            ₹
                            {result.price_ranges?.day_3?.high?.toFixed(2) ||
                              "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Low:</span>
                          <span className="font-medium text-red-600">
                            ₹
                            {result.price_ranges?.day_3?.low?.toFixed(2) ||
                              "N/A"}
                          </span>
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-gray-500 mb-1">
                          10-Day Range
                        </div>
                        <div className="flex justify-between">
                          <span>High:</span>
                          <span className="font-medium text-green-600">
                            ₹
                            {result.price_ranges?.day_10?.high?.toFixed(2) ||
                              "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Low:</span>
                          <span className="font-medium text-red-600">
                            ₹
                            {result.price_ranges?.day_10?.low?.toFixed(2) ||
                              "N/A"}
                          </span>
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-gray-500 mb-1">
                          30-Day Range
                        </div>
                        <div className="flex justify-between">
                          <span>High:</span>
                          <span className="font-medium text-green-600">
                            ₹
                            {result.price_ranges?.day_30?.high?.toFixed(2) ||
                              "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Low:</span>
                          <span className="font-medium text-red-600">
                            ₹
                            {result.price_ranges?.day_30?.low?.toFixed(2) ||
                              "N/A"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Volume Analysis */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Volume Analysis
                    </h3>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span>Current Volume:</span>
                        <span className="font-medium">
                          {result.volume_current?.toLocaleString() || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>20-Day Average:</span>
                        <span className="font-medium">
                          {result.volume_20day_avg?.toLocaleString() || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Volume Trend:</span>
                        <span
                          className={`font-medium ${
                            result.volume_trend_20day === "increasing"
                              ? "text-green-600"
                              : result.volume_trend_20day === "decreasing"
                              ? "text-red-600"
                              : "text-yellow-600"
                          }`}
                        >
                          {result.volume_trend_20day?.toUpperCase() || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Breakout:</span>
                        <span
                          className={`font-medium ${
                            result.volume_breakout ? "text-green-600" : ""
                          }`}
                        >
                          {result.volume_breakout ? "YES" : "NO"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Support & Resistance */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Support & Resistance
                    </h3>
                    <div className="text-sm space-y-2">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">
                          Resistance Levels
                        </div>
                        <div className="space-y-0.5">
                          {result.support_resistance?.resistance
                            ?.slice(0, 3)
                            .map((level, i) => (
                              <div key={i} className="flex justify-between">
                                <span>R{i + 1}:</span>
                                <span className="font-medium">
                                  ₹{level?.toFixed(2)}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">
                          Support Levels
                        </div>
                        <div className="space-y-0.5">
                          {result.support_resistance?.support
                            ?.slice(0, 3)
                            .map((level, i) => (
                              <div key={i} className="flex justify-between">
                                <span>S{i + 1}:</span>
                                <span className="font-medium">
                                  ₹{level?.toFixed(2)}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Analysis in New Row */}
                <div className="mt-8 border-t pt-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    AI Analysis & Trading Plan
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Signal and Trading Plan */}
                    <div className="space-y-4">
                      {/* Signal and Confidence */}
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">Signal:</span>
                            <span
                              className={`font-semibold ${
                                result.signal === "strong_buy" ||
                                result.signal === "buy"
                                  ? "text-green-600"
                                  : result.signal === "strong_sell" ||
                                    result.signal === "sell"
                                  ? "text-red-600"
                                  : "text-yellow-600"
                              }`}
                            >
                              {result.signal?.toUpperCase()}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="font-medium">Confidence:</span>
                            <span className="font-semibold">
                              {result.confidence_level?.toUpperCase()}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="font-medium">Direction:</span>
                            <span className="font-semibold">
                              {result.direction}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Trading Plan */}
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                        <h3 className="font-semibold mb-2">Trading Plan</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Entry Price:</span>
                            <span className="font-medium">
                              ₹{result.buy_price?.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Target 1:</span>
                            <span className="font-medium text-green-600">
                              ₹{result.target_price_1?.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Target 2:</span>
                            <span className="font-medium text-green-600">
                              ₹{result.target_price_2?.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Stop Loss:</span>
                            <span className="font-medium text-red-600">
                              ₹{result.stop_loss?.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Position Size:</span>
                            <span className="font-medium">
                              {result.position_size_percent}% of portfolio
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Holding Period:</span>
                            <span className="font-medium">
                              {result.holding_period?.replace(/_/g, " ")}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Risk/Reward:</span>
                            <span className="font-medium">
                              {result.risk_reward_ratio}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Key Points and Risk Factors */}
                    <div className="space-y-4">
                      {/* Key Points */}
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                        <h3 className="font-semibold mb-2">Key Points</h3>
                        <ul className="list-disc pl-4 space-y-1 text-sm">
                          {result.key_catalysts
                            ?.split(". ")
                            .filter(Boolean)
                            .map((point, index) => (
                              <li key={index}>{point}</li>
                            ))}
                        </ul>
                      </div>

                      {/* Risk Factors */}
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                        <h3 className="font-semibold mb-2">Risk Factors</h3>
                        <ul className="list-disc pl-4 space-y-1 text-sm">
                          {result.risk_factors
                            ?.split(". ")
                            .filter(Boolean)
                            .map((point, index) => (
                              <li key={index}>{point}</li>
                            ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Instructions */}
        {!result && !analyzing && (
          <Card className="mt-8">
            <CardContent className="pt-6">
              <div className="text-center text-gray-600 dark:text-gray-400">
                <h3 className="font-semibold mb-2">How to use:</h3>
                <ol className="text-sm space-y-1 list-decimal list-inside">
                  <li>Search for a stock using the autocomplete field above</li>
                  <li>Select a stock from the suggestions</li>
                  <li>
                    Click &quot;Analyze&quot; to get AI-powered swing trading
                    insights
                  </li>
                  <li>
                    Review the analysis results and trading recommendations
                  </li>
                </ol>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
