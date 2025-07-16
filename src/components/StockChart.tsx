import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  ReferenceLine,
} from "recharts";
import { format, formatDistanceToNow } from "date-fns";
import { StockAnalysis } from "@/controllers/StockController";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Shield,
  Clock,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { authenticatedFetchJson, authenticatedFetch } from "@/lib/api-client";

interface StockChartProps {
  instrumentKey: string;
  onSymbolUpdate?: (symbol: string) => void;
  onDelete?: (symbol: string) => void;
}

export function StockChart({
  instrumentKey,
  onSymbolUpdate,
  onDelete,
}: StockChartProps) {
  const [analysis, setAnalysis] = useState<StockAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastPriceUpdate, setLastPriceUpdate] = useState<Date | null>(null);

  // Calculate MACD values for each point
  const macdData = useMemo(() => {
    if (!analysis?.candles) return [];

    const prices = analysis.candles.map((candle) => candle.close);

    // Calculate EMAs for the entire dataset
    const fastPeriod = 12;
    const slowPeriod = 26;
    const signalPeriod = 9;

    // Calculate fast EMA (12-day)
    const fastEMA: number[] = [];
    let emaFast = prices[0];
    const kFast = 2 / (fastPeriod + 1);
    for (let i = 0; i < prices.length; i++) {
      emaFast = prices[i] * kFast + emaFast * (1 - kFast);
      fastEMA.push(emaFast);
    }

    // Calculate slow EMA (26-day)
    const slowEMA: number[] = [];
    let emaSlow = prices[0];
    const kSlow = 2 / (slowPeriod + 1);
    for (let i = 0; i < prices.length; i++) {
      emaSlow = prices[i] * kSlow + emaSlow * (1 - kSlow);
      slowEMA.push(emaSlow);
    }

    // Calculate MACD line
    const macdLine = fastEMA.map((fast, i) => fast - slowEMA[i]);

    // Calculate signal line (9-day EMA of MACD line)
    const signalLine: number[] = [];
    let emaSignal = macdLine[0];
    const kSignal = 2 / (signalPeriod + 1);
    for (let i = 0; i < macdLine.length; i++) {
      emaSignal = macdLine[i] * kSignal + emaSignal * (1 - kSignal);
      signalLine.push(emaSignal);
    }

    // Calculate histogram
    const histogram = macdLine.map((macd, i) => macd - signalLine[i]);

    // Combine with candle data
    const macdPoints = analysis.candles.map((candle, i) => ({
      ...candle,
      macd_line: Number(macdLine[i].toFixed(4)),
      macd_signal: Number(signalLine[i].toFixed(4)),
      macd_histogram: Number(histogram[i].toFixed(4)),
    }));

    // Reverse the array to match the main chart's order
    return macdPoints.reverse();
  }, [analysis?.candles]);

  const fetchLatestPrice = useCallback(async (actualInstrumentKey: string) => {
    try {
      const skipDays = Number(process.env.NEXT_PUBLIC_SKIP_DAYS) || 0;
      if (skipDays > 0) {
        // When skipping days, we don't need to fetch latest price
        // The price will be updated when analysis is refreshed
        return;
      }

      const quote = await authenticatedFetchJson<{
        ltp: number;
        change: number;
        changePercent: number;
        source: "live_quote" | "cached_candles" | "fresh_candles";
      }>(
        `/api/upstox/search/quote?instrumentKey=${encodeURIComponent(
          actualInstrumentKey
        )}`
      );

      // Only update if we got a live quote
      if (quote.source === "live_quote") {
        setAnalysis((prev) =>
          prev
            ? {
                ...prev,
                price: quote.ltp,
                price_change: quote.change,
                price_change_percent: quote.changePercent,
                // Update the last candle's close price to match current price
                candles: prev.candles.map((candle, index) =>
                  index === prev.candles.length - 1
                    ? { ...candle, close: quote.ltp }
                    : candle
                ),
              }
            : null
        );

        setLastPriceUpdate(new Date());
      }
    } catch (error) {
      console.warn("Failed to fetch latest price:", error);
      // Don't set error state - just keep using the existing price
    }
  }, []);

  const fetchAnalysis = useCallback(
    async (forceRefresh = false) => {
      if (!instrumentKey) return;

      setIsLoading(true);
      setError(null);

      try {
        // Check if this is sidebar data and not a forced refresh
        if (instrumentKey.startsWith("SIDEBAR_DATA|") && !forceRefresh) {
          const symbol = instrumentKey.split("|")[1];

          // First get the instrument key for this symbol
          const instrumentResponse = await fetch(
            `/api/upstox/search?q=${symbol}&limit=1`
          );

          if (!instrumentResponse.ok) {
            throw new Error("Failed to fetch instrument data");
          }

          const instrumentData = await instrumentResponse.json();
          if (!instrumentData.results || instrumentData.results.length === 0) {
            throw new Error(`No instrument found for symbol: ${symbol}`);
          }

          const actualInstrumentKey = instrumentData.results[0].instrument_key;

          // Get the cached analysis from the recent endpoint
          const recentData = await authenticatedFetchJson<StockAnalysis[]>(
            "/api/analyze/recent"
          );
          const existingAnalysis = recentData.find((a) => a.symbol === symbol);

          if (existingAnalysis) {
            setAnalysis(existingAnalysis);
            // Update parent component with symbol if needed
            if (onSymbolUpdate) {
              onSymbolUpdate(existingAnalysis.symbol);
            }
            // Always fetch latest price
            await fetchLatestPrice(actualInstrumentKey);
            return;
          }

          // If no cached data, proceed with full analysis using the actual instrument key
          instrumentKey = actualInstrumentKey;
        }

        // For forced refresh or if no cached data found, get the actual instrument key
        let actualInstrumentKey = instrumentKey;
        if (instrumentKey.startsWith("SIDEBAR_DATA|")) {
          const symbol = instrumentKey.split("|")[1];
          // Get the real instrument key for the symbol
          const response = await fetch(
            `/api/upstox/search?q=${symbol}&limit=1`
          );
          if (response.ok) {
            const data = await response.json();
            if (data.results && data.results.length > 0) {
              actualInstrumentKey = data.results[0].instrument_key;
            } else {
              throw new Error(`No instrument found for symbol: ${symbol}`);
            }
          } else {
            throw new Error("Failed to fetch instrument data");
          }
        }

        // Proceed with normal fetch using actual instrument key
        const params = new URLSearchParams();
        if (forceRefresh) {
          params.append("forceRefresh", "true");
        }

        const data = await authenticatedFetchJson<StockAnalysis>(
          `/api/analyze?instrumentKey=${encodeURIComponent(
            actualInstrumentKey
          )}&${params.toString()}`
        );
        setAnalysis(data);

        // Only fetch latest price if not skipping days
        const skipDays = Number(process.env.NEXT_PUBLIC_SKIP_DAYS) || 0;
        if (skipDays === 0) {
          await fetchLatestPrice(actualInstrumentKey);
        }

        // Update parent component with symbol if needed
        if (onSymbolUpdate && data.symbol) {
          onSymbolUpdate(data.symbol);
        }
      } catch (error) {
        console.error("Error fetching analysis:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [instrumentKey, onSymbolUpdate, fetchLatestPrice]
  );

  // Set up auto-refresh for price
  useEffect(() => {
    if (!analysis) return;

    const skipDays = Number(process.env.NEXT_PUBLIC_SKIP_DAYS) || 0;
    if (skipDays > 0) {
      // Don't set up auto-refresh when using historical data
      return;
    }

    const priceRefreshInterval = setInterval(() => {
      // Get the actual instrument key
      const actualInstrumentKey = instrumentKey.startsWith("SIDEBAR_DATA|")
        ? analysis.instrument_key // We should have this from the analysis
        : instrumentKey;

      if (actualInstrumentKey) {
        fetchLatestPrice(actualInstrumentKey);
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(priceRefreshInterval);
  }, [analysis, instrumentKey, fetchLatestPrice]);

  useEffect(() => {
    if (instrumentKey) {
      fetchAnalysis();
    }
  }, [instrumentKey, fetchAnalysis]);

  const handleRefresh = () => {
    // Always pass true to force a refresh of the full analysis
    fetchAnalysis(true);
  };

  const handleDelete = async () => {
    if (!analysis) return;

    if (
      confirm(
        `Are you sure you want to delete the analysis for ${analysis.symbol}?`
      )
    ) {
      try {
        await authenticatedFetch(
          `/api/analyze?symbol=${encodeURIComponent(analysis.symbol)}`,
          { method: "DELETE" }
        );

        console.log(`Successfully deleted analysis for ${analysis.symbol}`);

        // Notify parent component
        if (onDelete) {
          onDelete(analysis.symbol);
        }

        // Clear the current analysis
        setAnalysis(null);
      } catch (error) {
        console.error("Error deleting analysis:", error);
        alert("Failed to delete analysis. Please try again.");
      }
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-[500px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full space-y-6">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <Shield className="h-5 w-5" />
              Analysis Unavailable - Real Data Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-red-100 border border-red-200 rounded-lg">
                <p className="text-red-800 font-medium">
                  ⚠️ No analysis available for monetary decisions
                </p>
                <p className="text-red-700 text-sm mt-2">{error}</p>
              </div>
              <div className="text-sm text-red-700 space-y-2">
                <p>
                  <strong>Possible reasons:</strong>
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    Real market data is currently unavailable from Upstox API
                  </li>
                  <li>
                    Insufficient historical data (minimum 20 days required)
                  </li>
                  <li>Network connectivity issues</li>
                  <li>API rate limits exceeded</li>
                </ul>
                <p className="mt-3">
                  <strong>Important:</strong> This system only uses real market
                  data for analysis. No dummy or fallback data is used to ensure
                  accuracy for monetary decisions.
                </p>
              </div>
              <Button
                onClick={handleRefresh}
                disabled={isLoading}
                className="w-full"
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
                />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  // Transform data for the chart and reverse it to show most recent data on the right
  const chartData = [...analysis.candles].reverse().map((candle) => ({
    date: format(new Date(candle.timestamp), "MMM dd"),
    close: Number(candle.close.toFixed(2)),
    high: Number(candle.high.toFixed(2)),
    low: Number(candle.low.toFixed(2)),
    volume: candle.volume,
    sma50: analysis.sma_50 ? Number(analysis.sma_50.toFixed(2)) : undefined,
    sma200: analysis.sma_200 ? Number(analysis.sma_200.toFixed(2)) : undefined,
    ema21: analysis.ema_21 ? Number(analysis.ema_21.toFixed(2)) : undefined,
  }));

  // Helper function to get signal color
  const getSignalColor = (signal: string) => {
    if (signal.includes("buy")) return "text-green-600";
    if (signal.includes("sell")) return "text-red-600";
    return "text-yellow-600";
  };

  // Helper function to get trend icon
  const getTrendIcon = (direction: string) => {
    if (direction === "bullish") return <TrendingUp className="h-4 w-4" />;
    if (direction === "bearish") return <TrendingDown className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  return (
    <div className="w-full space-y-6">
      {/* Header Section */}
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            {analysis.symbol}
            <Badge variant="outline" className="text-xs font-normal">
              ₹{analysis.price.toFixed(2)}
              {lastPriceUpdate && (
                <span className="ml-2 text-gray-500 text-xs">
                  ({formatDistanceToNow(lastPriceUpdate, { addSuffix: true })})
                </span>
              )}
            </Badge>
            <Badge
              variant={analysis.price_change >= 0 ? "secondary" : "destructive"}
              className={`ml-2 ${
                analysis.price_change >= 0 ? "text-green-600" : ""
              }`}
            >
              {analysis.price_change >= 0 ? "+" : ""}
              {analysis.price_change.toFixed(2)} (
              {analysis.price_change_percent.toFixed(2)}%)
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={handleRefresh}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            {onDelete && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 text-destructive"
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">{analysis.symbol}</h1>
                <div className="flex items-center gap-3">
                  <p className="text-gray-600 text-lg">
                    Current Price: ₹{analysis.price.toFixed(2)}
                  </p>
                  {analysis.price_change !== undefined &&
                    analysis.price_change_percent !== undefined && (
                      <div className="flex items-center gap-1">
                        <span
                          className={`text-sm font-medium ${
                            analysis.price_change_percent >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {analysis.price_change_percent >= 0 ? "+" : ""}₹
                          {analysis.price_change.toFixed(2)}
                        </span>
                        <span
                          className={`text-sm font-medium ${
                            analysis.price_change_percent >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          ({analysis.price_change_percent >= 0 ? "+" : ""}
                          {analysis.price_change_percent.toFixed(2)}%)
                        </span>
                      </div>
                    )}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="text-xs bg-green-50 text-green-700 border-green-200"
                  >
                    ✓ Real Market Data
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                  >
                    {Number(process.env.NEXT_PUBLIC_SKIP_DAYS) > 0
                      ? "📊 Historical Price"
                      : "📊 Real-time Price"}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    Last Updated:{" "}
                    {new Date(analysis.last_updated_at).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Action Buttons - Top Right of Header */}
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleRefresh}
                  disabled={isLoading}
                  variant="outline"
                  size="sm"
                  className="h-9 px-3 border-gray-300 hover:border-blue-400 hover:bg-blue-50"
                  title="Refresh Analysis"
                >
                  <RefreshCw
                    className={`h-4 w-4 mr-2 ${
                      isLoading ? "animate-spin" : ""
                    }`}
                  />
                  Refresh
                </Button>
                <Button
                  onClick={handleDelete}
                  variant="outline"
                  size="sm"
                  className="h-9 px-3 border-red-300 text-red-600 hover:border-red-400 hover:bg-red-50 hover:text-red-700"
                  title="Delete Analysis"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </div>

          {/* Trading Plan, Technical Indicators, and Risk Analysis Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            {/* Trading Plan */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Trading Plan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Action:</span>
                    <span
                      className={`font-bold ${getSignalColor(analysis.signal)}`}
                    >
                      {analysis.signal.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Confidence:</span>
                    <Badge variant="outline" className="text-sm">
                      {analysis.confidence_level}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Buy Price:</span>
                    <span className="text-green-600">
                      ₹{analysis.buy_price.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Target 1:</span>
                    <span className="text-green-600">
                      ₹{analysis.target_price_1.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Target 2:</span>
                    <span className="text-green-600">
                      ₹{analysis.target_price_2.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Stop Loss:</span>
                    <span className="text-red-600">
                      ₹{analysis.stop_loss.toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="pt-3 border-t">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">R:R Ratio:</span>
                    <span className="text-blue-600">
                      {analysis.risk_reward_ratio}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Position Size:</span>
                    <span className="text-blue-600">
                      {analysis.position_size_percent}%
                    </span>
                  </div>
                </div>

                {/* Swing Trading Evaluation */}
                <div className="pt-3 border-t">
                  <h4 className="font-medium mb-2 text-sm">
                    Swing Trading Evaluation
                  </h4>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-sm">Setup Quality:</span>
                      <Badge variant="outline" className="text-xs">
                        {analysis.swing_setup_quality || "fair"}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Liquidity:</span>
                      <Badge variant="outline" className="text-xs">
                        {analysis.liquidity_check || "moderate"}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Volatility:</span>
                      <Badge variant="outline" className="text-xs">
                        {analysis.volatility_check || "adequate"}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Trend Alignment:</span>
                      <Badge variant="outline" className="text-xs">
                        {analysis.market_trend_alignment || "moderate"}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Swing Trading Signals */}
                <div className="pt-3 border-t">
                  <h4 className="font-medium mb-2 text-sm">
                    Swing Trading Signals
                  </h4>
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    {/* Breakout Pattern */}
                    <div className="flex items-center justify-between">
                      <span>Breakout Pattern:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600">
                          {analysis.breakout_pattern === "none"
                            ? "None"
                            : analysis.breakout_pattern === "cup_and_handle"
                            ? "Cup & Handle"
                            : analysis.breakout_pattern === "flag"
                            ? "Flag"
                            : analysis.breakout_pattern === "wedge"
                            ? "Wedge"
                            : analysis.breakout_pattern === "triangle"
                            ? "Triangle"
                            : "None"}
                        </span>
                        <span
                          className={
                            analysis.breakout_pattern !== "none"
                              ? "text-green-600"
                              : "text-red-600"
                          }
                        >
                          {analysis.breakout_pattern !== "none" ? "✓" : "✗"}
                        </span>
                      </div>
                    </div>

                    {/* ATR > 2% */}
                    <div className="flex items-center justify-between">
                      <span>ATR &gt; 2%:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600">
                          {analysis.atr_percent?.toFixed(2) || "0.00"}%
                        </span>
                        <span
                          className={
                            analysis.atr_validation
                              ? "text-green-600"
                              : "text-red-600"
                          }
                        >
                          {analysis.atr_validation ? "✓" : "✗"}
                        </span>
                      </div>
                    </div>

                    {/* Price Range 100-2000 */}
                    <div className="flex items-center justify-between">
                      <span>Price Range ₹100-₹2000:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600">
                          {analysis.price_range || "N/A"}
                        </span>
                        <span
                          className={
                            analysis.price_range_valid
                              ? "text-green-600"
                              : "text-red-600"
                          }
                        >
                          {analysis.price_range_valid ? "✓" : "✗"}
                        </span>
                      </div>
                    </div>

                    {/* Pullback to Support */}
                    <div className="flex items-center justify-between">
                      <span>Pullback to Support:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600">
                          {analysis.support_distance?.toFixed(1) || "0.0"}% away
                        </span>
                        <span
                          className={
                            analysis.pullback_to_support
                              ? "text-green-600"
                              : "text-red-600"
                          }
                        >
                          {analysis.pullback_to_support ? "✓" : "✗"}
                        </span>
                      </div>
                    </div>

                    {/* Volume Breakout */}
                    <div className="flex items-center justify-between">
                      <span>Volume Breakout:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600">
                          {analysis.volume_multiple?.toFixed(1) || "0.0"}x avg
                        </span>
                        <span
                          className={
                            analysis.volume_breakout_detected
                              ? "text-green-600"
                              : "text-red-600"
                          }
                        >
                          {analysis.volume_breakout_detected ? "✓" : "✗"}
                        </span>
                      </div>
                    </div>

                    {/* RSI Bounce Zone 40-50 */}
                    <div className="flex items-center justify-between">
                      <span>RSI Bounce Zone (40-50):</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600">
                          {analysis.rsi_zone || "N/A"}
                        </span>
                        <span
                          className={
                            analysis.rsi_bounce_zone
                              ? "text-green-600"
                              : "text-red-600"
                          }
                        >
                          {analysis.rsi_bounce_zone ? "✓" : "✗"}
                        </span>
                      </div>
                    </div>

                    {/* MACD Bullish Crossover */}
                    <div className="flex items-center justify-between">
                      <span>MACD Bullish Crossover:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600">
                          {analysis.macd_signal_status || "neutral"}
                        </span>
                        <span
                          className={
                            analysis.macd_bullish_crossover_detected
                              ? "text-green-600"
                              : "text-red-600"
                          }
                        >
                          {analysis.macd_bullish_crossover_detected ? "✓" : "✗"}
                        </span>
                      </div>
                    </div>

                    {/* Rising Volume */}
                    <div className="flex items-center justify-between">
                      <span>Rising Volume:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600">
                          {analysis.volume_trend || "N/A"}
                        </span>
                        <span
                          className={
                            analysis.rising_volume
                              ? "text-green-600"
                              : "text-red-600"
                          }
                        >
                          {analysis.rising_volume ? "✓" : "✗"}
                        </span>
                      </div>
                    </div>

                    {/* Overall Score */}
                    <div className="flex items-center justify-between pt-2 border-t font-medium">
                      <span>Overall Score:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">
                          {
                            [
                              analysis.breakout_pattern !== "none",
                              analysis.atr_validation,
                              analysis.price_range_valid,
                              analysis.pullback_to_support,
                              analysis.volume_breakout_detected,
                              analysis.rsi_bounce_zone,
                              analysis.macd_bullish_crossover_detected,
                              analysis.rising_volume,
                            ].filter(Boolean).length
                          }
                          /8
                        </span>
                        <span
                          className={
                            [
                              analysis.breakout_pattern !== "none",
                              analysis.atr_validation,
                              analysis.price_range_valid,
                              analysis.pullback_to_support,
                              analysis.volume_breakout_detected,
                              analysis.rsi_bounce_zone,
                              analysis.macd_bullish_crossover_detected,
                              analysis.rising_volume,
                            ].filter(Boolean).length >= 6
                              ? "text-green-600"
                              : [
                                  analysis.breakout_pattern !== "none",
                                  analysis.atr_validation,
                                  analysis.price_range_valid,
                                  analysis.pullback_to_support,
                                  analysis.volume_breakout_detected,
                                  analysis.rsi_bounce_zone,
                                  analysis.macd_bullish_crossover_detected,
                                  analysis.rising_volume,
                                ].filter(Boolean).length >= 4
                              ? "text-yellow-600"
                              : "text-red-600"
                          }
                        >
                          {[
                            analysis.breakout_pattern !== "none",
                            analysis.atr_validation,
                            analysis.price_range_valid,
                            analysis.pullback_to_support,
                            analysis.volume_breakout_detected,
                            analysis.rsi_bounce_zone,
                            analysis.macd_bullish_crossover_detected,
                            analysis.rising_volume,
                          ].filter(Boolean).length >= 6
                            ? "✓ Strong"
                            : [
                                analysis.breakout_pattern !== "none",
                                analysis.atr_validation,
                                analysis.price_range_valid,
                                analysis.pullback_to_support,
                                analysis.volume_breakout_detected,
                                analysis.rsi_bounce_zone,
                                analysis.macd_bullish_crossover_detected,
                                analysis.rising_volume,
                              ].filter(Boolean).length >= 4
                            ? "⚠ Moderate"
                            : "✗ Weak"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Technical Indicators */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Technical Indicators
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Moving Averages */}
                <div>
                  <h4 className="font-medium mb-3 text-sm">Moving Averages</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">SMA 50:</span>
                      <span className="text-gray-600">
                        ₹{analysis.sma_50?.toFixed(2) || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">SMA 200:</span>
                      <span className="text-gray-600">
                        ₹{analysis.sma_200?.toFixed(2) || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">EMA 21:</span>
                      <span className="text-gray-600">
                        ₹{analysis.ema_21?.toFixed(2) || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">EMA 50:</span>
                      <span className="text-gray-600">
                        ₹{analysis.ema_50?.toFixed(2) || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Golden Cross:</span>
                      <Badge
                        variant={
                          analysis.golden_cross ? "default" : "secondary"
                        }
                      >
                        {analysis.golden_cross ? "Yes" : "No"}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Death Cross:</span>
                      <Badge
                        variant={
                          analysis.death_cross ? "destructive" : "secondary"
                        }
                      >
                        {analysis.death_cross ? "Yes" : "No"}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Momentum Indicators */}
                <div>
                  <h4 className="font-medium mb-3 text-sm">Momentum</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">RSI (14):</span>
                      <span
                        className={
                          analysis.rsi_14 > 70
                            ? "text-red-600"
                            : analysis.rsi_14 < 30
                            ? "text-green-600"
                            : "text-gray-600"
                        }
                      >
                        {analysis.rsi_14.toFixed(1)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">RSI (21):</span>
                      <span
                        className={
                          analysis.rsi_21 > 70
                            ? "text-red-600"
                            : analysis.rsi_21 < 30
                            ? "text-green-600"
                            : "text-gray-600"
                        }
                      >
                        {analysis.rsi_21.toFixed(1)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">RSI Signal:</span>
                      <Badge variant="outline">{analysis.rsi_signal}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">MACD Line:</span>
                      <span
                        className={
                          analysis.macd_line > analysis.macd_signal
                            ? "text-green-600"
                            : "text-red-600"
                        }
                      >
                        {analysis.macd_line.toFixed(3)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">MACD Signal:</span>
                      <span className="text-gray-600">
                        {analysis.macd_signal.toFixed(3)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">MACD Histogram:</span>
                      <span
                        className={
                          analysis.macd_histogram > 0
                            ? "text-green-600"
                            : "text-red-600"
                        }
                      >
                        {analysis.macd_histogram.toFixed(3)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">MACD Bullish Cross:</span>
                      <Badge
                        variant={
                          analysis.macd_bullish_crossover
                            ? "default"
                            : "secondary"
                        }
                      >
                        {analysis.macd_bullish_crossover ? "Yes" : "No"}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Stochastic:</span>
                      <span
                        className={
                          analysis.stochastic > 80
                            ? "text-red-600"
                            : analysis.stochastic < 20
                            ? "text-green-600"
                            : "text-gray-600"
                        }
                      >
                        {analysis.stochastic.toFixed(1)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Stochastic Signal:</span>
                      <Badge variant="outline">
                        {analysis.stochastic_signal}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Volatility & Risk */}
                <div>
                  <h4 className="font-medium mb-3 text-sm">
                    Volatility & Risk
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">ATR (21):</span>
                      <span className="text-gray-600">
                        {analysis.atr_21?.toFixed(2) || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Bollinger Upper:</span>
                      <span className="text-gray-600">
                        ₹{analysis.bollinger_upper?.toFixed(2) || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Bollinger Lower:</span>
                      <span className="text-gray-600">
                        ₹{analysis.bollinger_lower?.toFixed(2) || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Bollinger Position:</span>
                      <Badge variant="outline">
                        {analysis.bollinger_position?.replace("_", " ") ||
                          "N/A"}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Volatility %ile:</span>
                      <span className="text-gray-600">
                        {analysis.volatility_percentile?.toFixed(1) || "N/A"}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Volume Analysis */}
                <div>
                  <h4 className="font-medium mb-3 text-sm">Volume Analysis</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Current Volume:</span>
                      <span className="text-gray-600">
                        {(analysis.volume_current / 1000000).toFixed(1)}M
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">20-Day Avg:</span>
                      <span className="text-gray-600">
                        {(analysis.volume_20day_avg / 1000000).toFixed(1)}M
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">vs 20-Day Avg:</span>
                      <span
                        className={
                          analysis.volume_vs_20day_avg > 1.5
                            ? "text-green-600"
                            : analysis.volume_vs_20day_avg < 0.7
                            ? "text-red-600"
                            : "text-gray-600"
                        }
                      >
                        {(analysis.volume_vs_20day_avg * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Volume Trend:</span>
                      <Badge variant="outline">
                        {analysis.volume_trend_20day?.replace("_", " ") ||
                          "N/A"}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Volume Breakout:</span>
                      <Badge
                        variant={
                          analysis.volume_breakout ? "default" : "secondary"
                        }
                      >
                        {analysis.volume_breakout ? "Yes" : "No"}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Market Context */}
                <div>
                  <h4 className="font-medium mb-3 text-sm">Market Context</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Market Regime:</span>
                      <Badge variant="outline">
                        {analysis.market_regime?.replace("_", " ") || "N/A"}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Sector Performance:</span>
                      <span
                        className={
                          analysis.sector_performance > 0
                            ? "text-green-600"
                            : "text-red-600"
                        }
                      >
                        {analysis.sector_performance?.toFixed(1) || "N/A"}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Relative Strength:</span>
                      <span
                        className={
                          analysis.relative_strength > 50
                            ? "text-green-600"
                            : "text-red-600"
                        }
                      >
                        {analysis.relative_strength?.toFixed(1) || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Sector Correlation:</span>
                      <span className="text-gray-600">
                        {analysis.sector_correlation?.toFixed(2) || "N/A"}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Risk & Trend Analysis */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Risk & Trend Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Trend Analysis */}
                <div>
                  <h4 className="font-medium mb-3 text-sm">Trend Analysis</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Trend Direction:</span>
                      <div className="flex items-center gap-1">
                        {getTrendIcon(analysis.trend_direction)}
                        <span className="text-sm">
                          {analysis.trend_direction}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Trend Strength:</span>
                      <Badge variant="outline">{analysis.trend_strength}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Swing Score:</span>
                      <span className="text-blue-600">
                        {analysis.swing_score.toFixed(1)}/10
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Setup Quality:</span>
                      <Badge variant="outline">
                        {analysis.swing_setup_quality}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Risk Metrics */}
                <div>
                  <h4 className="font-medium mb-3 text-sm">Risk Metrics</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Volatility Rating:</span>
                      <Badge variant="outline">
                        {analysis.volatility_rating}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Volume Quality:</span>
                      <Badge variant="outline">{analysis.volume_quality}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Nearest Support:</span>
                      <span className="text-green-600">
                        ₹{analysis.nearest_support?.toFixed(2) || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Support Distance:</span>
                      <span className="text-gray-600">
                        {analysis.support_distance_percent?.toFixed(1) || "N/A"}
                        %
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Nearest Resistance:</span>
                      <span className="text-red-600">
                        ₹{analysis.nearest_resistance?.toFixed(2) || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Resistance Distance:</span>
                      <span className="text-gray-600">
                        {analysis.resistance_distance_percent?.toFixed(1) ||
                          "N/A"}
                        %
                      </span>
                    </div>
                  </div>
                </div>

                {/* Price Ranges */}
                <div>
                  <h4 className="font-medium mb-3 text-sm">Price Ranges</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">3-Day Range:</span>
                      <span className="text-gray-600">
                        ₹
                        {analysis.price_ranges?.day_3?.low?.toFixed(2) || "N/A"}{" "}
                        - ₹
                        {analysis.price_ranges?.day_3?.high?.toFixed(2) ||
                          "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">10-Day Range:</span>
                      <span className="text-gray-600">
                        ₹
                        {analysis.price_ranges?.day_10?.low?.toFixed(2) ||
                          "N/A"}{" "}
                        - ₹
                        {analysis.price_ranges?.day_10?.high?.toFixed(2) ||
                          "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">30-Day Range:</span>
                      <span className="text-gray-600">
                        ₹
                        {analysis.price_ranges?.day_30?.low?.toFixed(2) ||
                          "N/A"}{" "}
                        - ₹
                        {analysis.price_ranges?.day_30?.high?.toFixed(2) ||
                          "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Weekly Pivot:</span>
                      <span className="text-blue-600">
                        ₹{analysis.weekly_pivot?.toFixed(2) || "N/A"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Additional Info */}
                <div>
                  <h4 className="font-medium mb-3 text-sm">Additional Info</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Holding Period:</span>
                      <Badge variant="outline">
                        {analysis.holding_period?.replace("_", " ") ||
                          "1-2 weeks"}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Direction:</span>
                      <Badge
                        variant={
                          analysis.direction === "LONG"
                            ? "default"
                            : analysis.direction === "SHORT"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {analysis.direction}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI Analysis Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>AI Opinion</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {analysis.llm_opinion}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Trading Plan Details</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {analysis.trading_plan}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Support & Resistance */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Support & Resistance Levels</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h4 className="font-medium mb-3">Support Levels</h4>
                  <div className="space-y-2">
                    {analysis.support_levels
                      ?.slice(0, 3)
                      .map((level, index) => (
                        <div
                          key={index}
                          className="flex justify-between text-sm"
                        >
                          <span>S{index + 1}:</span>
                          <span className="text-green-600">
                            ₹{level.toFixed(2)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-3">Resistance Levels</h4>
                  <div className="space-y-2">
                    {analysis.resistance_levels
                      ?.slice(0, 3)
                      .map((level, index) => (
                        <div
                          key={index}
                          className="flex justify-between text-sm"
                        >
                          <span>R{index + 1}:</span>
                          <span className="text-red-600">
                            ₹{level.toFixed(2)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Chart Section */}
          <Card>
            <CardHeader>
              <CardTitle>Price Chart</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[500px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={chartData}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      yAxisId="price"
                      domain={["auto", "auto"]}
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `₹${value.toFixed(2)}`}
                      orientation="right"
                    />
                    <YAxis
                      yAxisId="volume"
                      orientation="left"
                      tickFormatter={(value) =>
                        `${(value / 1000000).toFixed(1)}M`
                      }
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => {
                        if (name === "Volume") {
                          return [
                            `${(Number(value) / 1000000).toFixed(1)}M`,
                            name,
                          ];
                        }
                        if (name === "Closing Price") {
                          return [`₹${Number(value).toFixed(2)}`, "Close"];
                        }
                        if (name === "High") {
                          return [`₹${Number(value).toFixed(2)}`, "High"];
                        }
                        if (name === "Low") {
                          return [`₹${Number(value).toFixed(2)}`, "Low"];
                        }
                        return [`₹${Number(value).toFixed(2)}`, name];
                      }}
                    />
                    <Legend />
                    {/* Add reference line for last closing price */}
                    <ReferenceLine
                      y={analysis.candles[0].close}
                      yAxisId="price"
                      label={{
                        value: `Last Close: ₹${analysis.candles[0].close.toFixed(
                          2
                        )}`,
                        position: "insideLeft",
                        fill: "#000",
                        fontSize: 12,
                        style: {
                          filter:
                            "drop-shadow(0px 0px 2px white) drop-shadow(0px 0px 2px white)",
                          fontWeight: 500,
                        },
                      }}
                      stroke="#666"
                      strokeDasharray="3 3"
                    />
                    <Bar
                      dataKey="volume"
                      yAxisId="volume"
                      fill="#8884d8"
                      opacity={0.5}
                      name="Volume"
                    />
                    <Line
                      type="monotone"
                      dataKey="close"
                      stroke="#82ca9d"
                      yAxisId="price"
                      dot={false}
                      name="Closing Price"
                    />
                    <Line
                      type="monotone"
                      dataKey="high"
                      stroke="#ef4444"
                      yAxisId="price"
                      dot={false}
                      name="High"
                    />
                    <Line
                      type="monotone"
                      dataKey="low"
                      stroke="#3b82f6"
                      yAxisId="price"
                      dot={false}
                      name="Low"
                    />
                    {analysis.sma_50 && (
                      <Line
                        type="monotone"
                        dataKey="sma50"
                        stroke="#ff7300"
                        yAxisId="price"
                        dot={false}
                        name="SMA 50"
                      />
                    )}
                    {analysis.sma_200 && (
                      <Line
                        type="monotone"
                        dataKey="sma200"
                        stroke="#387908"
                        yAxisId="price"
                        dot={false}
                        name="SMA 200"
                      />
                    )}
                    {analysis.ema_21 && (
                      <Line
                        type="monotone"
                        dataKey="ema21"
                        stroke="#ff0000"
                        yAxisId="price"
                        dot={false}
                        name="EMA 21"
                      />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* MACD Chart */}
          <Card>
            <CardHeader>
              <CardTitle>MACD Chart</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={macdData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={(timestamp) => format(timestamp, "MMM dd")}
                    />
                    <YAxis />
                    <Tooltip
                      formatter={(value: number) => value.toFixed(3)}
                      labelFormatter={(timestamp) =>
                        format(timestamp, "MMM dd, yyyy")
                      }
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="macd_line"
                      stroke="#2563eb"
                      name="MACD"
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="macd_signal"
                      stroke="#dc2626"
                      name="Signal"
                      dot={false}
                    />
                    <Bar
                      dataKey="macd_histogram"
                      fill="#22c55e"
                      name="Histogram"
                    />
                    <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Risk Factors & Catalysts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Key Catalysts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {analysis.key_catalysts}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Risk Factors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {analysis.risk_factors}
                </p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
