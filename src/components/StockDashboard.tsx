"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import StockAutocomplete from "@/components/StockAutocomplete";
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
  Clock,
  CheckSquare,
  Square,
  Trash,
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
  const [selectedStock, setSelectedStock] = useState<{
    symbol: string;
    instrumentKey: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedStocks, setSelectedStocks] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  // View settings state
  const [viewSettings, setViewSettings] = useState<ViewSettings>({
    showBasicIndicators: true,
    showAdvancedIndicators: true,
    showBreakoutSignals: true,
    showQualityMetrics: true,
    showVolumeData: false,
    showInsights: true,
    showTradingPlan: false,
    compactView: false,
  });

  useEffect(() => {
    if (sessionId) {
      console.log("Fetching data for sessionId:", sessionId);
      fetchSession();
      fetchStocks();
    }
  }, [sessionId]);

  // Separate effect for fetching signals after stocks are loaded
  useEffect(() => {
    if (sessionId && stocks.length > 0) {
      console.log("Fetching signals for", stocks.length, "stocks");
      fetchSignals();
    }
  }, [sessionId, stocks.length]);

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
      console.log("Fetching stocks for sessionId:", sessionId);
      const response = await fetch(`/api/stocks?sessionId=${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        console.log("Fetched stocks:", data.length);
        setStocks(data);
      } else {
        console.error(
          "Failed to fetch stocks:",
          response.status,
          response.statusText
        );
      }
    } catch (error) {
      console.error("Failed to fetch stocks:", error);
    }
  };

  const fetchSignals = async () => {
    try {
      console.log("Fetching signals for sessionId:", sessionId);
      const response = await fetch(`/api/signals?sessionId=${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        console.log("Fetched signals:", data.length);
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
      } else {
        console.error(
          "Failed to fetch signals:",
          response.status,
          response.statusText
        );
      }
    } catch (error) {
      console.error("Failed to fetch signals:", error);
    }
  };

  const addStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSymbol.trim() || !selectedStock?.instrumentKey) return;

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
          instrumentKey: selectedStock.instrumentKey,
        }),
      });

      if (response.ok) {
        const newStock = await response.json();
        setStocks((prev) => [newStock, ...prev]);
        setNewSymbol("");
        setSelectedStock(null);
        setShowAddDialog(false);

        // Show success message for adding stock
        setSuccessMessage(
          `✅ ${newStock.symbol} added to watchlist successfully!`
        );

        // Clear the success message and start analysis
        setTimeout(() => {
          setSuccessMessage("🔄 Starting analysis...");
          analyzeStock(newStock.id);
        }, 500);
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

        // Show success message
        const stockSymbol =
          stocks.find((s) => s.id === stockId)?.symbol || "Stock";
        setSuccessMessage(
          `✅ ${stockSymbol} analysis completed successfully! Signal: ${newSignal.signal.toUpperCase()}`
        );

        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccessMessage("");
        }, 3000);
      } else {
        const errorData = await response.json();
        // Show detailed error message with alert if available
        const errorMessage =
          errorData.alert || errorData.error || "Analysis failed";
        setError(errorMessage);

        // Show browser alert for critical API configuration issues
        if (
          errorData.alert &&
          (errorData.error?.includes("UPSTOX_API_KEY") ||
            errorData.error?.includes("OPENAI_API_KEY") ||
            errorData.error?.includes("Market data unavailable") ||
            errorData.error?.includes("AI analysis unavailable"))
        ) {
          const stockSymbol =
            stocks.find((s) => s.id === stockId)?.symbol || "Stock";
          const shouldRemove = confirm(
            `⚠️ Configuration Issue\n\n${errorData.alert}\n\nDetails: ${
              errorData.details || errorData.error
            }\n\nWould you like to remove ${stockSymbol} from the watchlist since analysis failed?`
          );

          if (shouldRemove) {
            removeStock(stockId);
          }
        }
      }
    } catch (error) {
      const errorMessage =
        "Analysis failed - Unable to connect to server. Please check your internet connection and try again.";
      setError(errorMessage);
      console.error("Analysis error:", error);
    } finally {
      setAnalyzing(null);
    }
  };

  const removeStock = async (stockId: string) => {
    try {
      const response = await fetch(
        `/api/stocks?stockId=${stockId}&sessionId=${sessionId}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        // Remove stock from state
        setStocks((prev) => prev.filter((stock) => stock.id !== stockId));
        setSignals((prev) =>
          prev.filter((signal) => signal.stock_id !== stockId)
        );

        const stockSymbol =
          stocks.find((s) => s.id === stockId)?.symbol || "Stock";
        setSuccessMessage(`🗑️ ${stockSymbol} removed from watchlist`);

        // Clear message after 2 seconds
        setTimeout(() => {
          setSuccessMessage("");
        }, 2000);
      } else {
        setError("Failed to remove stock");
      }
    } catch {
      setError("Failed to remove stock");
    }
  };

  // Handle individual row selection
  const toggleRowSelection = (stockId: string) => {
    setSelectedStocks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(stockId)) {
        newSet.delete(stockId);
      } else {
        newSet.add(stockId);
      }
      return newSet;
    });
  };

  // Handle select all/none
  const toggleSelectAll = () => {
    if (selectedStocks.size === stocks.length) {
      setSelectedStocks(new Set());
    } else {
      setSelectedStocks(new Set(stocks.map((stock) => stock.id)));
    }
  };

  // Handle bulk analysis
  const analyzeSelectedStocks = async () => {
    if (selectedStocks.size === 0) return;

    const stocksToAnalyze = stocks.filter((stock) =>
      selectedStocks.has(stock.id)
    );
    const stockNames = stocksToAnalyze.map((stock) => stock.symbol).join(", ");

    const confirmed = window.confirm(
      `Are you sure you want to analyze ${selectedStocks.size} stock(s) (${stockNames})? This may take a few minutes.`
    );

    if (!confirmed) return;

    setError("");
    setSuccessMessage(
      `🔄 Starting bulk analysis of ${selectedStocks.size} stocks...`
    );

    try {
      // Analyze stocks in parallel with a limit to avoid overwhelming the API
      const batchSize = 3; // Analyze 3 stocks at a time
      const stockIds = Array.from(selectedStocks);
      const results = [];

      for (let i = 0; i < stockIds.length; i += batchSize) {
        const batch = stockIds.slice(i, i + batchSize);

        setSuccessMessage(
          `🔄 Analyzing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(
            stockIds.length / batchSize
          )} (${batch.length} stocks)...`
        );

        const batchPromises = batch.map(async (stockId) => {
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
              return { success: true, stockId, signal: newSignal };
            } else {
              const errorData = await response.json();
              return {
                success: false,
                stockId,
                error: errorData.error || "Analysis failed",
              };
            }
          } catch {
            return {
              success: false,
              stockId,
              error: "Network error",
            };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        // Update signals for successful analyses in this batch
        const successfulResults = batchResults.filter((r) => r.success);
        if (successfulResults.length > 0) {
          setSignals((prev) => {
            const newSignals = [...prev];
            successfulResults.forEach((result) => {
              // Remove old signal for this stock
              const index = newSignals.findIndex(
                (s) => s.stock_id === result.stockId
              );
              if (index >= 0) {
                newSignals[index] = result.signal;
              } else {
                newSignals.push(result.signal);
              }
            });
            return newSignals;
          });

          // Update stocks with new signals
          setStocks((prev) =>
            prev.map((stock) => {
              const result = successfulResults.find(
                (r) => r.stockId === stock.id
              );
              return result ? { ...stock, latestSignal: result.signal } : stock;
            })
          );
        }

        // Add delay between batches to avoid overwhelming the API
        if (i + batchSize < stockIds.length) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }

      // Show final results
      const successful = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;

      if (failed === 0) {
        setSuccessMessage(
          `✅ Bulk analysis completed successfully! Analyzed ${successful} stocks.`
        );
      } else {
        setSuccessMessage(
          `⚠️ Bulk analysis completed with ${successful} successes and ${failed} failures.`
        );

        // Show details of failed analyses
        const failedStocks = results
          .filter((r) => !r.success)
          .map((r) => {
            const stock = stocks.find((s) => s.id === r.stockId);
            return `${stock?.symbol || "Unknown"}: ${r.error}`;
          })
          .join("\n");

        setError(`Failed analyses:\n${failedStocks}`);
      }

      // Clear selection after analysis
      setSelectedStocks(new Set());

      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage("");
      }, 5000);
    } catch (error) {
      setError("Bulk analysis failed - Unable to connect to server");
      console.error("Bulk analysis error:", error);
    }
  };

  // Handle bulk delete
  const deleteSelectedStocks = async () => {
    if (selectedStocks.size === 0) return;

    const stocksToDelete = stocks.filter((stock) =>
      selectedStocks.has(stock.id)
    );
    const stockNames = stocksToDelete.map((stock) => stock.symbol).join(", ");

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedStocks.size} stock(s) (${stockNames})? This will remove all analysis data for these stocks.`
    );

    if (!confirmed) return;

    setIsDeleting(true);
    setError("");

    try {
      const deletePromises = Array.from(selectedStocks).map((stockId) =>
        fetch(`/api/stocks?stockId=${stockId}&sessionId=${sessionId}`, {
          method: "DELETE",
        })
      );

      const responses = await Promise.all(deletePromises);
      const failedDeletes = responses.filter((response) => !response.ok);

      if (failedDeletes.length === 0) {
        // All deletes successful
        setStocks((prev) =>
          prev.filter((stock) => !selectedStocks.has(stock.id))
        );
        setSignals((prev) =>
          prev.filter((signal) => !selectedStocks.has(signal.stock_id))
        );
        setSelectedStocks(new Set());
      } else {
        setError(`Failed to delete ${failedDeletes.length} stock(s)`);
      }
    } catch {
      setError("Failed to delete selected stocks");
    } finally {
      setIsDeleting(false);
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
      <div className="container mx-auto max-w-[2000px] p-6">
        {/* Simple Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-6">
            <Button
              variant="outline"
              onClick={onBackToCalendar}
              className="rounded-full w-12 h-12 p-0 shadow-md hover:shadow-lg transition-all"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>

            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {session?.title || "Trading Session"}
              </h1>
              <p className="text-slate-600 dark:text-slate-300 text-lg mt-1">
                {new Date(sessionDate).toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>

          {/* Add Stock Button */}
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button size="lg" className="gap-2 bg-blue-600 hover:bg-blue-700">
                <Plus className="h-5 w-5" />
                Add Stock
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Add Stock Symbol
                </DialogTitle>
                <DialogDescription>
                  Add a stock symbol to analyze for this trading session. It
                  will be analyzed automatically.
                </DialogDescription>
              </DialogHeader>
              <form
                id="add-stock-form"
                onSubmit={addStock}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="symbol">Stock Symbol</Label>
                  <StockAutocomplete
                    value={newSymbol}
                    onChange={(symbol, stock) => {
                      setNewSymbol(symbol);
                      if (stock) {
                        setSelectedStock({
                          symbol: stock.symbol,
                          instrumentKey: stock.instrument_key,
                        });
                      } else {
                        setSelectedStock(null);
                      }
                    }}
                    onSelect={(stock) => {
                      setNewSymbol(stock.symbol);
                      setSelectedStock({
                        symbol: stock.symbol,
                        instrumentKey: stock.instrument_key,
                      });
                      // Auto-submit when stock is selected
                      setTimeout(() => {
                        const form = document.getElementById(
                          "add-stock-form"
                        ) as HTMLFormElement;
                        if (form) {
                          form.requestSubmit();
                        }
                      }, 100);
                    }}
                    placeholder="Search by symbol or company name..."
                    className="w-full"
                  />
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {successMessage && (
                  <Alert className="border-green-200 bg-green-50 text-green-800">
                    <CheckSquare className="h-4 w-4 text-green-600" />
                    <AlertDescription>{successMessage}</AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-end gap-3">
                  <DialogTrigger asChild>
                    <Button type="button" variant="outline">
                      Cancel
                    </Button>
                  </DialogTrigger>
                  <Button
                    type="submit"
                    disabled={
                      loading ||
                      !newSymbol.trim() ||
                      !selectedStock?.instrumentKey
                    }
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Add & Analyze
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Main Dashboard Alerts */}
        {(error || successMessage) && (
          <div className="space-y-3">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {successMessage && (
              <Alert className="border-green-200 bg-green-50 text-green-800">
                <CheckSquare className="h-4 w-4 text-green-600" />
                <AlertDescription>{successMessage}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Enhanced Analysis Table */}
        <Card className="shadow-xl w-full overflow-hidden">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-6 w-6" />
                  Stock Analysis Results
                </CardTitle>
                <CardDescription>
                  Comprehensive technical analysis with advanced indicators and
                  AI-powered signals
                </CardDescription>
              </div>

              {/* View Settings Button */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Settings className="h-4 w-4" />
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
                      Customize which columns and data to display in the
                      analysis table
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
                          onClick={() =>
                            toggleViewSetting("showBasicIndicators")
                          }
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
                          Breakout Signals
                        </Label>
                        <Button
                          variant={
                            viewSettings.showBreakoutSignals
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          onClick={() =>
                            toggleViewSetting("showBreakoutSignals")
                          }
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
                          onClick={() =>
                            toggleViewSetting("showQualityMetrics")
                          }
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
                          AI Analysis (LLM Opinion)
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
              <>
                {/* Bulk Actions */}
                {stocks.length > 0 && (
                  <div className="flex items-center justify-between mb-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border">
                    <div className="flex items-center gap-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={toggleSelectAll}
                        className="gap-2"
                      >
                        {selectedStocks.size === stocks.length ? (
                          <CheckSquare className="h-4 w-4" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                        {selectedStocks.size === stocks.length
                          ? "Deselect All"
                          : "Select All"}
                      </Button>

                      <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                        {selectedStocks.size > 0
                          ? `✅ ${selectedStocks.size} of ${stocks.length} selected`
                          : `${stocks.length} stocks available for selection`}
                      </span>
                    </div>

                    <div className="flex gap-3">
                      {selectedStocks.size > 0 ? (
                        <>
                          <Button
                            size="sm"
                            onClick={analyzeSelectedStocks}
                            disabled={analyzing !== null}
                            className="gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold shadow-md"
                          >
                            {analyzing ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Activity className="h-4 w-4" />
                            )}
                            🔍 Analyze Selected ({selectedStocks.size})
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={deleteSelectedStocks}
                            disabled={isDeleting}
                            className="gap-2"
                          >
                            {isDeleting ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash className="h-4 w-4" />
                            )}
                            Delete Selected ({selectedStocks.size})
                          </Button>
                        </>
                      ) : (
                        <div className="text-sm text-slate-500 italic">
                          Select stocks to see bulk actions
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <Table className="min-w-[2000px] w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px] sticky left-0 z-10 bg-background border-r">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={toggleSelectAll}
                            className="p-0 h-auto"
                          >
                            {selectedStocks.size === stocks.length &&
                            stocks.length > 0 ? (
                              <CheckSquare className="h-4 w-4" />
                            ) : (
                              <Square className="h-4 w-4" />
                            )}
                          </Button>
                        </TableHead>
                        <TableHead className="font-semibold min-w-[160px] sticky left-[50px] z-10 bg-background border-r">
                          Symbol & Exchange
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
                          <TableHead className="font-semibold w-[500px] min-w-[500px] max-w-[500px]">
                            AI Analysis
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
                            <TableHead className="font-semibold w-[250px] min-w-[250px] max-w-[250px]">
                              Volume Strategy
                            </TableHead>
                            <TableHead className="font-semibold w-[600px] min-w-[600px] max-w-[600px]">
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
                            className={
                              viewSettings.compactView ? "h-12" : "h-16"
                            }
                          >
                            <TableCell className="sticky left-0 z-10 bg-background border-r">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleRowSelection(stock.id)}
                                className="p-0 h-auto"
                              >
                                {selectedStocks.has(stock.id) ? (
                                  <CheckSquare className="h-4 w-4" />
                                ) : (
                                  <Square className="h-4 w-4" />
                                )}
                              </Button>
                            </TableCell>
                            <TableCell className="font-bold text-lg sticky left-[50px] z-10 bg-background border-r">
                              <div className="flex items-center gap-2">
                                <span>{stock.symbol}</span>
                                {stock.exchange && (
                                  <Badge
                                    variant="outline"
                                    className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200"
                                  >
                                    {stock.exchange}
                                  </Badge>
                                )}
                              </div>
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
                              <TableCell className="w-[120px] min-w-[120px]">
                                <div className="text-xs space-y-0">
                                  <div className="flex items-center">
                                    <span className="text-slate-600">
                                      Current:{" "}
                                    </span>
                                    <span className="font-medium">
                                      {latestSignal?.volume
                                        ? formatVolume(latestSignal.volume)
                                        : "N/A"}
                                    </span>
                                  </div>

                                  {latestSignal?.volume_avg_intraday && (
                                    <div className="flex items-center">
                                      <span className="text-slate-600">
                                        Avg:{" "}
                                      </span>
                                      <span className="font-medium">
                                        {formatVolume(
                                          latestSignal.volume_avg_intraday
                                        )}
                                      </span>
                                    </div>
                                  )}

                                  {latestSignal?.volume_max_intraday && (
                                    <div className="flex items-center">
                                      <span className="text-slate-600">
                                        Max:{" "}
                                      </span>
                                      <span className="font-medium text-green-600">
                                        {formatVolume(
                                          latestSignal.volume_max_intraday
                                        )}
                                      </span>
                                    </div>
                                  )}

                                  {latestSignal?.volume_median_intraday && (
                                    <div className="flex items-center">
                                      <span className="text-slate-600">
                                        Median:{" "}
                                      </span>
                                      <span className="font-medium text-blue-600">
                                        {formatVolume(
                                          latestSignal.volume_median_intraday
                                        )}
                                      </span>
                                    </div>
                                  )}

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
                                    latestSignal?.opening_range_breakout ||
                                      false,
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
                              <TableCell className="w-[500px] min-w-[500px] max-w-[500px]">
                                <div className="text-sm text-slate-600 dark:text-slate-400 break-words whitespace-normal leading-relaxed p-3 bg-blue-50 dark:bg-blue-900/20 rounded border">
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
                                <TableCell className="w-[250px] min-w-[250px] max-w-[250px]">
                                  {latestSignal?.volume_range_text ? (
                                    <div className="text-sm text-slate-600 dark:text-slate-400 break-words whitespace-normal leading-relaxed p-3 bg-green-50 dark:bg-green-900/20 rounded border">
                                      {latestSignal.volume_range_text}
                                    </div>
                                  ) : latestSignal?.recommended_volume ? (
                                    <div className="text-sm text-slate-600 dark:text-slate-400 break-words whitespace-normal leading-relaxed p-3 bg-green-50 dark:bg-green-900/20 rounded border">
                                      <div className="font-semibold text-blue-600 mb-1">
                                        Recommended:{" "}
                                        {latestSignal.recommended_volume} shares
                                      </div>
                                      <div className="text-xs text-slate-500 mb-1">
                                        Range: {latestSignal.min_volume}-
                                        {latestSignal.max_volume} shares
                                      </div>
                                      {latestSignal.recommended_volume &&
                                        latestSignal.buy_price && (
                                          <div className="text-xs text-green-700 font-medium">
                                            Investment: ₹
                                            {(
                                              (latestSignal.recommended_volume *
                                                latestSignal.buy_price) /
                                              1000
                                            ).toFixed(0)}
                                            K
                                          </div>
                                        )}
                                    </div>
                                  ) : (
                                    <div className="text-sm text-slate-400 p-3 bg-gray-50 dark:bg-gray-800 rounded border">
                                      No volume strategy available
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell className="w-[600px] min-w-[600px] max-w-[600px]">
                                  <div className="text-sm text-slate-600 dark:text-slate-400 break-words whitespace-pre-line leading-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border shadow-sm">
                                    {formatTradingPlan(
                                      latestSignal?.trading_plan ||
                                        "No trading plan available"
                                    )}
                                  </div>
                                </TableCell>
                              </>
                            )}

                            <TableCell>
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
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
