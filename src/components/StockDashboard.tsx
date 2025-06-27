"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  TrendingUp,
  AlertCircle,
  Loader2,
  ArrowLeft,
  TrendingDown,
  Activity,
  Eye,
  EyeOff,
  Settings,
  BarChart3,
  Target,
  Zap,
  Trash2,
  Clock,
} from "lucide-react";
import { Stock, Signal, Session } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface StockDashboardProps {
  sessionId: string;
  sessionDate: Date;
  onBackToCalendar: () => void;
}

interface ViewSettings {
  showBasicIndicators: boolean;
  showAdvancedIndicators: boolean;
  showBreakoutSignals: boolean;
  showQualityMetrics: boolean;
  showVolumeData: boolean;
  showInsights: boolean;
  showTradingPlan: boolean;
  compactView: boolean;
}

export default function StockDashboard({
  sessionId,
  sessionDate,
  onBackToCalendar,
}: StockDashboardProps) {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [newSymbol, setNewSymbol] = useState("");
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [error, setError] = useState("");

  // View settings state
  const [viewSettings, setViewSettings] = useState<ViewSettings>({
    showBasicIndicators: true,
    showAdvancedIndicators: true,
    showBreakoutSignals: true,
    showQualityMetrics: true,
    showVolumeData: true,
    showInsights: true,
    showTradingPlan: true,
    compactView: false,
  });

  useEffect(() => {
    if (sessionId) {
      fetchSession();
      fetchStocks();
      fetchSignals();
    }
  }, [sessionId]);

  const fetchSession = async () => {
    try {
      const dateString = sessionDate.toISOString().split("T")[0];
      const response = await fetch(`/api/sessions?date=${dateString}`);
      if (response.ok) {
        const data = await response.json();
        setSession(data);
      }
    } catch (error) {
      console.error("Failed to fetch session:", error);
    }
  };

  const fetchStocks = async () => {
    try {
      const response = await fetch(`/api/stocks?sessionId=${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        setStocks(data);
      }
    } catch (error) {
      console.error("Failed to fetch stocks:", error);
    }
  };

  const fetchSignals = async () => {
    try {
      const response = await fetch(`/api/signals?sessionId=${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        setSignals(data);

        // Update stocks with latest signals
        setStocks((prevStocks) =>
          prevStocks.map((stock) => ({
            ...stock,
            latestSignal: data.find(
              (signal: Signal) => signal.stock_id === stock.id
            ),
          }))
        );
      }
    } catch (error) {
      console.error("Failed to fetch signals:", error);
    }
  };

  const addStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSymbol.trim()) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/stocks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          symbol: newSymbol.trim(),
          sessionId,
        }),
      });

      if (response.ok) {
        const newStock = await response.json();
        setStocks((prev) => [newStock, ...prev]);
        setNewSymbol("");
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to add stock");
      }
    } catch {
      setError("Failed to add stock");
    } finally {
      setLoading(false);
    }
  };

  const analyzeStock = async (stockId: string) => {
    setAnalyzing(stockId);
    setError("");

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ stockId, sessionId }),
      });

      if (response.ok) {
        const newSignal = await response.json();
        setSignals((prev) => [
          newSignal,
          ...prev.filter((s) => s.stock_id !== stockId),
        ]);

        // Update the stock with the new signal
        setStocks((prev) =>
          prev.map((stock) =>
            stock.id === stockId ? { ...stock, latestSignal: newSignal } : stock
          )
        );
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Analysis failed");
      }
    } catch {
      setError("Analysis failed");
    } finally {
      setAnalyzing(null);
    }
  };

  const deleteStock = async (stockId: string, symbol: string) => {
    if (
      !confirm(
        `Are you sure you want to delete ${symbol}? This will also remove all associated analysis data.`
      )
    ) {
      return;
    }

    setError("");

    try {
      const response = await fetch(
        `/api/stocks?stockId=${stockId}&sessionId=${sessionId}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        // Remove stock from local state
        setStocks((prev) => prev.filter((stock) => stock.id !== stockId));

        // Remove associated signals from local state
        setSignals((prev) =>
          prev.filter((signal) => signal.stock_id !== stockId)
        );
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to delete stock");
      }
    } catch {
      setError("Failed to delete stock");
    }
  };

  const getSignalBadge = (signal: string) => {
    const variants = {
      strong: "bg-green-500 hover:bg-green-600",
      caution: "bg-yellow-500 hover:bg-yellow-600",
      neutral: "bg-gray-500 hover:bg-gray-600",
      risk: "bg-red-500 hover:bg-red-600",
    };

    const icons = {
      strong: <TrendingUp className="h-3 w-3" />,
      caution: <Activity className="h-3 w-3" />,
      neutral: <BarChart3 className="h-3 w-3" />,
      risk: <TrendingDown className="h-3 w-3" />,
    };

    return (
      <Badge
        className={`${
          variants[signal as keyof typeof variants]
        } text-white font-semibold`}
      >
        {icons[signal as keyof typeof icons]}
        <span className="ml-1 capitalize">{signal}</span>
      </Badge>
    );
  };

  const getIntradayScoreBadge = (score: number) => {
    let color = "bg-gray-500";
    if (score >= 8) color = "bg-green-500";
    else if (score >= 6) color = "bg-blue-500";
    else if (score >= 4) color = "bg-yellow-500";
    else if (score >= 2) color = "bg-orange-500";
    else color = "bg-red-500";

    return (
      <Badge className={`${color} text-white font-bold`}>
        <Target className="h-3 w-3 mr-1" />
        {score}/10
      </Badge>
    );
  };

  const getBooleanBadge = (
    value: boolean,
    trueLabel: string,
    falseLabel?: string
  ) => {
    if (value) {
      return (
        <Badge className="bg-green-500 text-white text-xs">{trueLabel}</Badge>
      );
    }
    return falseLabel ? (
      <Badge variant="outline" className="text-xs">
        {falseLabel}
      </Badge>
    ) : null;
  };

  const formatNumber = (num: number, decimals: number = 2) => {
    return num?.toFixed(decimals) || "N/A";
  };

  const formatVolume = (volume: number) => {
    if (volume >= 10000000) {
      return `${(volume / 10000000).toFixed(1)}Cr`;
    } else if (volume >= 100000) {
      return `${(volume / 100000).toFixed(1)}L`;
    } else if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}K`;
    }
    return volume?.toString() || "N/A";
  };

  const toggleViewSetting = (key: keyof ViewSettings) => {
    setViewSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const getInsightsSummary = (signal: Signal) => {
    if (!signal) return "No analysis available";

    const insights = [];

    // RSI insights
    if (signal.rsi_14) {
      if (signal.rsi_14 > 70) insights.push("Overbought");
      else if (signal.rsi_14 < 30) insights.push("Oversold");
      else insights.push("RSI Neutral");
    }

    // Trend insights
    if (signal.trend_alignment?.includes("bullish"))
      insights.push("Bullish Trend");
    else if (signal.trend_alignment?.includes("bearish"))
      insights.push("Bearish Trend");

    // Breakout insights
    if (signal.breakout_day_high) insights.push("Day High Break");
    if (signal.opening_range_breakout) insights.push("OR Breakout");

    // Volume insights
    if (signal.volume_spike) insights.push("High Volume");

    // Score insights
    if (signal.intraday_score && signal.intraday_score >= 8)
      insights.push("Excellent Setup");
    else if (signal.intraday_score && signal.intraday_score >= 6)
      insights.push("Good Setup");
    else if (signal.intraday_score && signal.intraday_score < 4)
      insights.push("Weak Setup");

    return insights.length > 0
      ? insights.slice(0, 3).join(" • ")
      : "Mixed signals";
  };

  const formatTradingPlan = (plan: string) => {
    if (!plan) return "No plan available";

    // Ensure proper spacing between bullet points
    return plan
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join("\n");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto max-w-[1600px] p-6">
        {/* Enhanced Header */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl mb-8 p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Button
                variant="outline"
                onClick={onBackToCalendar}
                className="rounded-full w-12 h-12 p-0 shadow-md hover:shadow-lg transition-all"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>

              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                  {session?.title || "Trading Session"}
                </h1>
                <p className="text-slate-600 dark:text-slate-300 text-lg">
                  {new Date(sessionDate).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
                {session?.description && (
                  <p className="text-slate-500 dark:text-slate-400 mt-1">
                    {session.description}
                  </p>
                )}
              </div>
            </div>

            {/* View Controls */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="lg" className="gap-2">
                  <Settings className="h-5 w-5" />
                  View Settings
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Table View Settings
                  </DialogTitle>
                  <DialogDescription>
                    Customize which columns and data to display in the analysis
                    table
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-medium">
                        Basic Indicators (Price, VWAP, RSI)
                      </Label>
                      <Button
                        variant={
                          viewSettings.showBasicIndicators
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() => toggleViewSetting("showBasicIndicators")}
                      >
                        {viewSettings.showBasicIndicators ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label className="text-base font-medium">
                        Advanced Indicators (SMA, EMA, ATR)
                      </Label>
                      <Button
                        variant={
                          viewSettings.showAdvancedIndicators
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() =>
                          toggleViewSetting("showAdvancedIndicators")
                        }
                      >
                        {viewSettings.showAdvancedIndicators ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label className="text-base font-medium">
                        Volume Data
                      </Label>
                      <Button
                        variant={
                          viewSettings.showVolumeData ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => toggleViewSetting("showVolumeData")}
                      >
                        {viewSettings.showVolumeData ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label className="text-base font-medium">
                        Breakout Signals
                      </Label>
                      <Button
                        variant={
                          viewSettings.showBreakoutSignals
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() => toggleViewSetting("showBreakoutSignals")}
                      >
                        {viewSettings.showBreakoutSignals ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label className="text-base font-medium">
                        Quality Metrics (Score, Clean Setup)
                      </Label>
                      <Button
                        variant={
                          viewSettings.showQualityMetrics
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() => toggleViewSetting("showQualityMetrics")}
                      >
                        {viewSettings.showQualityMetrics ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label className="text-base font-medium">
                        Analysis Opinion (AI/Rule-based)
                      </Label>
                      <Button
                        variant={
                          viewSettings.showInsights ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => toggleViewSetting("showInsights")}
                      >
                        {viewSettings.showInsights ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label className="text-base font-medium">
                        Trading Plan (Entry/Target/Stop Loss)
                      </Label>
                      <Button
                        variant={
                          viewSettings.showTradingPlan ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => toggleViewSetting("showTradingPlan")}
                      >
                        {viewSettings.showTradingPlan ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label className="text-base font-medium">
                        Compact View
                      </Label>
                      <Button
                        variant={
                          viewSettings.compactView ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => toggleViewSetting("compactView")}
                      >
                        {viewSettings.compactView ? "Dense" : "Spacious"}
                      </Button>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Add Stock Section */}
        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add Stock Symbol
            </CardTitle>
            <CardDescription>
              Add stock symbols to analyze for this trading session
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Input
                placeholder="Enter stock symbol (e.g., RELIANCE, INFY)"
                value={newSymbol}
                onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                onKeyPress={(e) => e.key === "Enter" && addStock(e)}
                className="flex-1"
              />
              <Button
                onClick={addStock}
                disabled={loading || !newSymbol.trim()}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Stock
                  </>
                )}
              </Button>
            </div>

            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Enhanced Analysis Table */}
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-6 w-6" />
              Stock Analysis Results
            </CardTitle>
            <CardDescription>
              Comprehensive technical analysis with advanced indicators and
              AI-powered signals
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stocks.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="h-16 w-16 mx-auto text-slate-400 mb-4" />
                <p className="text-xl font-medium text-slate-600 dark:text-slate-300 mb-2">
                  No stocks added yet
                </p>
                <p className="text-slate-500 dark:text-slate-400">
                  Add stock symbols above to start your analysis
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="min-w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold min-w-[100px]">
                        Symbol
                      </TableHead>

                      {viewSettings.showBasicIndicators && (
                        <>
                          <TableHead className="font-semibold min-w-[100px]">
                            Price
                          </TableHead>
                          <TableHead className="font-semibold min-w-[100px]">
                            VWAP
                          </TableHead>
                          <TableHead className="font-semibold min-w-[80px]">
                            RSI(14)
                          </TableHead>
                        </>
                      )}

                      {viewSettings.showAdvancedIndicators && (
                        <>
                          <TableHead className="font-semibold min-w-[100px]">
                            SMA(20)
                          </TableHead>
                          <TableHead className="font-semibold min-w-[100px]">
                            EMA(9)
                          </TableHead>
                          <TableHead className="font-semibold min-w-[80px]">
                            ATR(14)
                          </TableHead>
                        </>
                      )}

                      {viewSettings.showVolumeData && (
                        <TableHead className="font-semibold min-w-[120px]">
                          Volume
                        </TableHead>
                      )}

                      <TableHead className="font-semibold min-w-[120px]">
                        Trend
                      </TableHead>

                      {viewSettings.showBreakoutSignals && (
                        <TableHead className="font-semibold min-w-[120px]">
                          Breakouts
                        </TableHead>
                      )}

                      {viewSettings.showQualityMetrics && (
                        <>
                          <TableHead className="font-semibold min-w-[80px]">
                            Score
                          </TableHead>
                          <TableHead className="font-semibold min-w-[80px]">
                            Setup
                          </TableHead>
                        </>
                      )}

                      <TableHead className="font-semibold min-w-[100px]">
                        Signal
                      </TableHead>

                      <TableHead className="font-semibold min-w-[80px]">
                        Direction
                      </TableHead>

                      {viewSettings.showInsights && (
                        <TableHead className="font-semibold min-w-[350px]">
                          Analysis Opinion
                        </TableHead>
                      )}

                      {viewSettings.showTradingPlan && (
                        <>
                          <TableHead className="font-semibold min-w-[100px]">
                            Entry Price
                          </TableHead>
                          <TableHead className="font-semibold min-w-[100px]">
                            Target
                          </TableHead>
                          <TableHead className="font-semibold min-w-[100px]">
                            Stop Loss
                          </TableHead>
                          <TableHead className="font-semibold min-w-[400px]">
                            Trading Plan
                          </TableHead>
                        </>
                      )}

                      <TableHead className="font-semibold min-w-[160px]">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stocks.map((stock) => {
                      const latestSignal = signals.find(
                        (s) => s.stock_id === stock.id
                      );
                      const isAnalyzing = analyzing === stock.id;

                      return (
                        <TableRow
                          key={stock.id}
                          className={viewSettings.compactView ? "h-12" : "h-16"}
                        >
                          <TableCell className="font-bold text-lg">
                            {stock.symbol}
                          </TableCell>

                          {viewSettings.showBasicIndicators && (
                            <>
                              <TableCell className="font-semibold">
                                ₹{formatNumber(latestSignal?.price || 0)}
                              </TableCell>
                              <TableCell>
                                ₹{formatNumber(latestSignal?.vwap || 0)}
                              </TableCell>
                              <TableCell>
                                <span
                                  className={`font-semibold ${
                                    (latestSignal?.rsi_14 || 0) > 70
                                      ? "text-red-600"
                                      : (latestSignal?.rsi_14 || 0) < 30
                                      ? "text-green-600"
                                      : "text-slate-600"
                                  }`}
                                >
                                  {formatNumber(latestSignal?.rsi_14 || 0)}
                                </span>
                              </TableCell>
                            </>
                          )}

                          {viewSettings.showAdvancedIndicators && (
                            <>
                              <TableCell>
                                ₹{formatNumber(latestSignal?.sma_20 || 0)}
                              </TableCell>
                              <TableCell>
                                ₹{formatNumber(latestSignal?.ema_9 || 0)}
                              </TableCell>
                              <TableCell>
                                {formatNumber(latestSignal?.atr_14 || 0)}
                              </TableCell>
                            </>
                          )}

                          {viewSettings.showVolumeData && (
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {latestSignal?.volume
                                    ? formatVolume(latestSignal.volume)
                                    : "N/A"}
                                </span>
                                {latestSignal?.volume_spike && (
                                  <Badge className="bg-orange-500 text-white text-xs w-fit mt-1">
                                    <Zap className="h-3 w-3 mr-1" />
                                    Spike
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                          )}

                          <TableCell>
                            <Badge
                              className={
                                latestSignal?.trend_alignment?.includes(
                                  "bullish"
                                )
                                  ? "bg-green-500 text-white"
                                  : latestSignal?.trend_alignment?.includes(
                                      "bearish"
                                    )
                                  ? "bg-red-500 text-white"
                                  : "bg-gray-500 text-white"
                              }
                            >
                              {latestSignal?.trend_alignment?.replace(
                                "_",
                                " "
                              ) || "N/A"}
                            </Badge>
                          </TableCell>

                          {viewSettings.showBreakoutSignals && (
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                {getBooleanBadge(
                                  latestSignal?.breakout_day_high || false,
                                  "Day High"
                                )}
                                {getBooleanBadge(
                                  latestSignal?.breakout_prev_day_range ||
                                    false,
                                  "Prev Range"
                                )}
                                {getBooleanBadge(
                                  latestSignal?.opening_range_breakout || false,
                                  "OR Break"
                                )}
                              </div>
                            </TableCell>
                          )}

                          {viewSettings.showQualityMetrics && (
                            <>
                              <TableCell>
                                {latestSignal?.intraday_score ? (
                                  getIntradayScoreBadge(
                                    latestSignal.intraday_score
                                  )
                                ) : (
                                  <Badge variant="outline">N/A</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                {getBooleanBadge(
                                  latestSignal?.clean_setup || false,
                                  "Clean",
                                  "Mixed"
                                )}
                              </TableCell>
                            </>
                          )}

                          <TableCell>
                            {latestSignal?.signal ? (
                              getSignalBadge(latestSignal.signal)
                            ) : (
                              <Badge variant="outline">Not analyzed</Badge>
                            )}
                          </TableCell>

                          <TableCell>
                            {latestSignal?.direction ? (
                              <Badge
                                className={
                                  latestSignal.direction === "LONG"
                                    ? "bg-green-500 text-white"
                                    : "bg-red-500 text-white"
                                }
                              >
                                {latestSignal.direction === "LONG"
                                  ? "🟢 LONG"
                                  : "🔴 SHORT"}
                              </Badge>
                            ) : (
                              <Badge variant="outline">N/A</Badge>
                            )}
                          </TableCell>

                          {viewSettings.showInsights && (
                            <TableCell className="max-w-[400px] min-w-[350px]">
                              <div className="text-sm text-slate-600 dark:text-slate-400 break-words whitespace-normal leading-relaxed">
                                {latestSignal?.llm_opinion
                                  ? latestSignal.llm_opinion
                                  : latestSignal
                                  ? getInsightsSummary(latestSignal)
                                  : "No analysis available"}
                              </div>
                            </TableCell>
                          )}

                          {viewSettings.showTradingPlan && (
                            <>
                              <TableCell
                                className={`font-semibold ${
                                  latestSignal?.direction === "LONG"
                                    ? "text-green-600"
                                    : latestSignal?.direction === "SHORT"
                                    ? "text-red-600"
                                    : "text-blue-600"
                                }`}
                              >
                                {latestSignal?.buy_price
                                  ? `₹${formatNumber(latestSignal.buy_price)}`
                                  : "N/A"}
                              </TableCell>
                              <TableCell className="font-semibold text-blue-600">
                                {latestSignal?.target_price
                                  ? `₹${formatNumber(
                                      latestSignal.target_price
                                    )}`
                                  : "N/A"}
                              </TableCell>
                              <TableCell className="font-semibold text-red-600">
                                {latestSignal?.stop_loss
                                  ? `₹${formatNumber(latestSignal.stop_loss)}`
                                  : "N/A"}
                              </TableCell>
                              <TableCell className="max-w-[450px] min-w-[400px]">
                                <div className="text-sm text-slate-600 dark:text-slate-400 break-words whitespace-pre-line leading-6 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border shadow-sm">
                                  {formatTradingPlan(
                                    latestSignal?.trading_plan || ""
                                  )}
                                </div>
                              </TableCell>
                            </>
                          )}

                          <TableCell>
                            <div className="flex gap-2">
                              <div className="flex flex-col gap-1">
                                <Button
                                  onClick={() => analyzeStock(stock.id)}
                                  disabled={isAnalyzing}
                                  size="sm"
                                  className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                                >
                                  {isAnalyzing ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Analyzing...
                                    </>
                                  ) : (
                                    <>
                                      <Activity className="mr-2 h-4 w-4" />
                                      Analyze
                                    </>
                                  )}
                                </Button>
                                {latestSignal?.fromCache && (
                                  <Badge
                                    variant="outline"
                                    className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                                  >
                                    <Clock className="h-3 w-3 mr-1" />
                                    Cached ({latestSignal.cacheAge}s)
                                  </Badge>
                                )}
                              </div>
                              <Button
                                onClick={() =>
                                  deleteStock(stock.id, stock.symbol)
                                }
                                disabled={isAnalyzing}
                                size="sm"
                                variant="destructive"
                                className="hover:bg-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
