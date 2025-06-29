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
  AlertCircle,
  Loader2,
  Activity,
  BarChart3,
  Zap,
  Clock,
  CheckSquare,
  Square,
  Trash,
  Search,
  Calendar,
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AnalyzePage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [newSymbol, setNewSymbol] = useState("");

  const [selectedStocksToAdd, setSelectedStocksToAdd] = useState<
    {
      symbol: string;
      instrument_key: string;
    }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showNewSessionDialog, setShowNewSessionDialog] = useState(false);
  const [newSessionName, setNewSessionName] = useState("");
  const [selectedStocks, setSelectedStocks] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    if (currentSession) {
      fetchStocksAndSignals();
    }
  }, [currentSession]);

  const fetchStocksAndSignals = async () => {
    if (!currentSession) return;

    try {
      // Fetch both stocks and signals in parallel
      const [stocksResponse, signalsResponse] = await Promise.all([
        fetch(`/api/stocks?sessionId=${currentSession.id}`),
        fetch(`/api/signals?sessionId=${currentSession.id}`),
      ]);

      let stocksData = [];
      let signalsData = [];

      if (stocksResponse.ok) {
        stocksData = await stocksResponse.json();
      }

      if (signalsResponse.ok) {
        signalsData = await signalsResponse.json();
      }

      // Associate signals with stocks
      const stocksWithSignals = stocksData.map((stock: Stock) => ({
        ...stock,
        latestSignal: signalsData.find(
          (signal: Signal) => signal.stock_id === stock.id
        ),
      }));

      setStocks(stocksWithSignals);
      setSignals(signalsData);
    } catch (error) {
      console.error("Failed to fetch stocks and signals:", error);
    }
  };

  const fetchSessions = async () => {
    try {
      console.log("Fetching sessions...");
      const response = await fetch("/api/sessions");
      if (response.ok) {
        const data = await response.json();
        console.log("Sessions fetched:", data);
        setSessions(data);

        // Auto-select the most recent session or create a default one
        if (data.length > 0) {
          console.log("Setting current session to:", data[0]);
          setCurrentSession(data[0]);
        } else {
          console.log("No sessions found, creating default session...");
          await createDefaultSession();
        }
      } else {
        console.error(
          "Failed to fetch sessions, response not ok:",
          response.status
        );
      }
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
    }
  };

  const createDefaultSession = async () => {
    try {
      const sessionDate = new Date().toISOString().split("T")[0];

      // First try to get today's session if it exists
      const existingResponse = await fetch(`/api/sessions?date=${sessionDate}`);
      if (existingResponse.ok) {
        const existingSession = await existingResponse.json();
        if (existingSession) {
          console.log("Found existing session for today:", existingSession);
          setSessions([existingSession]);
          setCurrentSession(existingSession);
          return;
        }
      }

      // Create new session for today
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_date: sessionDate,
          title: `Trading Session ${sessionDate}`,
          description: `Default trading session created on ${sessionDate}`,
        }),
      });

      if (response.ok) {
        const newSession = await response.json();
        console.log("Default session created:", newSession);
        setSessions([newSession]);
        setCurrentSession(newSession);
      } else {
        const errorData = await response.json();
        console.error("Failed to create default session:", errorData);

        // If session already exists, try to fetch it
        if (response.status === 409) {
          console.log("Session exists, fetching all sessions again...");
          fetchSessions();
        }
      }
    } catch (error) {
      console.error("Error creating default session:", error);
    }
  };

  const createNewSession = async () => {
    if (!newSessionName.trim()) return;

    try {
      const sessionDate = new Date().toISOString().split("T")[0];
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_date: sessionDate,
          title: newSessionName.trim(),
          description: `Trading session created on ${sessionDate}`,
        }),
      });

      if (response.ok) {
        const newSession = await response.json();
        setSessions((prev) => [newSession, ...prev]);
        setCurrentSession(newSession);
        setNewSessionName("");
        setShowNewSessionDialog(false);
        setSuccessMessage(
          `✅ Session "${newSession.title}" created successfully!`
        );
        setTimeout(() => setSuccessMessage(""), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to create session");
      }
    } catch {
      setError("Failed to create session");
    }
  };

  const addStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSession || selectedStocksToAdd.length === 0) return;

    setLoading(true);
    setError("");

    try {
      const addPromises = selectedStocksToAdd.map((stock) =>
        fetch("/api/stocks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            symbol: stock.symbol,
            sessionId: currentSession.id,
            instrumentKey: stock.instrument_key,
          }),
        })
      );

      const responses = await Promise.all(addPromises);
      const newStocks: Stock[] = [];

      for (const response of responses) {
        if (response.ok) {
          const stock = await response.json();
          newStocks.push(stock);
        }
      }

      if (newStocks.length > 0) {
        setStocks((prev) => [...newStocks, ...prev]);
        setSelectedStocksToAdd([]);
        setShowAddDialog(false);

        // Show success message
        setSuccessMessage(
          `✅ ${newStocks.length} stock${
            newStocks.length > 1 ? "s" : ""
          } added to watchlist successfully!`
        );

        // Start analyzing all new stocks
        setTimeout(() => {
          setSuccessMessage("🔄 Starting analysis...");
          newStocks.forEach((stock, index) => {
            setTimeout(() => {
              analyzeStock(stock.id);
            }, index * 1000); // Stagger analysis by 1 second each
          });
        }, 500);
      } else {
        setError("Failed to add stocks");
      }
    } catch {
      setError("Failed to add stocks");
    } finally {
      setLoading(false);
    }
  };

  const addStockToSelection = (stock: {
    symbol: string;
    instrument_key: string;
  }) => {
    setSelectedStocksToAdd((prev) => {
      const exists = prev.find(
        (s) => s.instrument_key === stock.instrument_key
      );
      if (exists) return prev;
      return [...prev, stock];
    });
    setNewSymbol("");
  };

  const removeStockFromSelection = (instrumentKey: string) => {
    setSelectedStocksToAdd((prev) =>
      prev.filter((stock) => stock.instrument_key !== instrumentKey)
    );
  };

  const analyzeStock = async (stockId: string) => {
    if (!currentSession) {
      setError("No session selected. Please select or create a session first.");
      return;
    }

    setAnalyzing(stockId);
    setError("");

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stockId,
          sessionId: currentSession.id,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuccessMessage(`✅ Analysis completed for ${data.symbol}!`);
        setTimeout(() => setSuccessMessage(""), 3000);

        // Refresh stocks and signals to show the new analysis
        fetchStocksAndSignals();
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

  const toggleSelectAll = () => {
    if (selectedStocks.size === stocks.length) {
      setSelectedStocks(new Set());
    } else {
      setSelectedStocks(new Set(stocks.map((stock) => stock.id)));
    }
  };

  const deleteSelectedStocks = async () => {
    if (selectedStocks.size === 0) return;

    setIsDeleting(true);
    const stockIds = Array.from(selectedStocks);

    try {
      const deletePromises = stockIds.map((stockId) =>
        fetch(`/api/stocks?id=${stockId}`, { method: "DELETE" })
      );

      await Promise.all(deletePromises);

      setStocks((prev) =>
        prev.filter((stock) => !selectedStocks.has(stock.id))
      );
      setSelectedStocks(new Set());
      setSuccessMessage(`✅ ${stockIds.length} stocks removed successfully!`);
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch {
      setError("Failed to delete selected stocks");
    } finally {
      setIsDeleting(false);
    }
  };

  const analyzeSelectedStocks = async () => {
    if (selectedStocks.size === 0 || !currentSession) return;

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
            setAnalyzing(stockId);
            const response = await fetch("/api/analyze", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ stockId, sessionId: currentSession.id }),
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

        if (failed > 0) {
          setError(`Failed analyses:\n${failedStocks}`);
        }
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
    } finally {
      setAnalyzing(null);
    }
  };

  const isAnalyzing = analyzing !== null;

  const getSignalBadge = (signal: string) => {
    const signalColors = {
      STRONG_BUY: "bg-green-600 text-white",
      BUY: "bg-green-500 text-white",
      WEAK_BUY: "bg-green-400 text-white",
      HOLD: "bg-yellow-500 text-white",
      WEAK_SELL: "bg-red-400 text-white",
      SELL: "bg-red-500 text-white",
      STRONG_SELL: "bg-red-600 text-white",
    };

    return (
      <Badge
        className={
          signalColors[signal as keyof typeof signalColors] ||
          "bg-gray-500 text-white"
        }
      >
        {signal?.replace("_", " ") || "N/A"}
      </Badge>
    );
  };

  const formatNumber = (num: number, decimals: number = 2) => {
    return num?.toFixed(decimals) || "N/A";
  };

  const getInsightsSummary = (signal: Signal): string[] => {
    const insights: string[] = [];

    // Technical insights (RSI only - trend has its own column)
    if (signal.rsi && signal.rsi > 70) insights.push("Overbought RSI");
    if (signal.rsi && signal.rsi < 30) insights.push("Oversold RSI");

    // Price/VWAP insights
    if (signal.price && signal.vwap) {
      if (signal.price > signal.vwap) insights.push("Above VWAP");
      if (signal.price < signal.vwap) insights.push("Below VWAP");
    }

    // Quality insights
    if (signal.intraday_score && signal.intraday_score >= 7)
      insights.push("High Score");
    if (signal.intraday_score && signal.intraday_score <= 3)
      insights.push("Low Score");

    return insights;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      <div className="w-full p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Stock Signal Analysis
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Real-time trading signals and technical analysis
              </p>
            </div>
          </div>

          {/* Session Management */}
          <div className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-lg border shadow-sm">
            <Calendar className="h-5 w-5 text-blue-500" />
            <div className="flex-1">
              <Label className="text-sm font-medium">Current Session:</Label>
              <Select
                value={currentSession?.id || ""}
                onValueChange={(value) => {
                  const session = sessions.find((s) => s.id === value);
                  setCurrentSession(session || null);
                }}
              >
                <SelectTrigger className="w-[300px] mt-1">
                  <SelectValue placeholder="Select a session..." />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map((session) => (
                    <SelectItem key={session.id} value={session.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{session.title}</span>
                        <span className="text-xs text-slate-500">
                          {session.session_date}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Dialog
              open={showNewSessionDialog}
              onOpenChange={setShowNewSessionDialog}
            >
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />
                  New Session
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Session</DialogTitle>
                  <DialogDescription>
                    Create a new analysis session to organize your stock
                    watchlist.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="sessionName">Session Name</Label>
                    <Input
                      id="sessionName"
                      value={newSessionName}
                      onChange={(e) => setNewSessionName(e.target.value)}
                      placeholder="e.g., Morning Analysis, Swing Trades..."
                      className="mt-1"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowNewSessionDialog(false);
                        setNewSessionName("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={createNewSession}
                      disabled={!newSessionName.trim()}
                    >
                      Create Session
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <Alert className="border-red-200 bg-red-50 text-red-800">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {successMessage && (
          <Alert className="border-green-200 bg-green-50 text-green-800">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}

        {!currentSession ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-16 w-16 text-slate-400 mb-4" />
              <h3 className="text-xl font-semibold text-slate-600 mb-2">
                No Session Selected
              </h3>
              <p className="text-slate-500 text-center mb-6">
                Create a new session or select an existing one to start
                analyzing stocks.
              </p>
              <Button
                onClick={() => setShowNewSessionDialog(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Create Your First Session
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-blue-500" />
                    {currentSession.title}
                  </CardTitle>
                  <CardDescription>
                    {stocks.length} stocks • {signals.length} signals analyzed
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  {/* View Settings */}
                  <div className="flex items-center gap-1"></div>

                  {/* Bulk Actions */}
                  {selectedStocks.size > 0 && (
                    <div className="flex gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={analyzeSelectedStocks}
                        disabled={analyzing !== null}
                        className="gap-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                      >
                        {analyzing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Activity className="h-4 w-4" />
                        )}
                        Analyze ({selectedStocks.size})
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
                        Delete ({selectedStocks.size})
                      </Button>
                    </div>
                  )}

                  {/* Add Stock */}
                  <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                    <DialogTrigger asChild>
                      <Button className="gap-2">
                        <Plus className="h-4 w-4" />
                        Add Stocks
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Add Stocks to Watchlist</DialogTitle>
                        <DialogDescription>
                          Search and select multiple stocks to add to your
                          analysis session. Each selected stock will be added to
                          your selection list below.
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={addStock} className="space-y-4">
                        <div>
                          <Label htmlFor="stock-search">Search Stock</Label>
                          <StockAutocomplete
                            value={newSymbol}
                            onChange={(symbol, stock) => {
                              if (stock) {
                                addStockToSelection(stock);
                              } else {
                                setNewSymbol(symbol);
                              }
                            }}
                            placeholder="Search by symbol or company name..."
                            className="mt-1"
                          />
                        </div>

                        {/* Show selected stocks */}
                        {selectedStocksToAdd.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label>
                                Selected Stocks ({selectedStocksToAdd.length})
                              </Label>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedStocksToAdd([])}
                                className="text-red-500 hover:text-red-700"
                              >
                                Clear All
                              </Button>
                            </div>
                            <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                              {selectedStocksToAdd.map((stock) => (
                                <div
                                  key={stock.instrument_key}
                                  className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 p-2 rounded"
                                >
                                  <span className="font-medium">
                                    {stock.symbol}
                                  </span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      removeStockFromSelection(
                                        stock.instrument_key
                                      )
                                    }
                                    className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                  >
                                    ×
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2 justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setShowAddDialog(false);
                              setNewSymbol("");
                              setSelectedStocksToAdd([]);
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            disabled={
                              loading || selectedStocksToAdd.length === 0
                            }
                          >
                            {loading ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Adding...
                              </>
                            ) : (
                              `Add ${selectedStocksToAdd.length} Stock${
                                selectedStocksToAdd.length !== 1 ? "s" : ""
                              }`
                            )}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {stocks.length === 0 ? (
                <div className="text-center py-12">
                  <Search className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-600 mb-2">
                    No Stocks Added
                  </h3>
                  <p className="text-slate-500 mb-6">
                    Add stocks to your watchlist to start analyzing trading
                    signals.
                  </p>
                  <Button
                    onClick={() => setShowAddDialog(true)}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Stocks
                  </Button>
                </div>
              ) : (
                <>
                  <div className="w-full rounded-md border overflow-x-auto">
                    <Table className="w-full min-w-max">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[200px] sticky left-0 bg-white dark:bg-slate-800 z-30 shadow-lg backdrop-blur-sm border-r">
                            <div className="flex items-center">
                              <div className="w-16 flex justify-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={toggleSelectAll}
                                  className="p-0 h-6 w-6"
                                >
                                  {selectedStocks.size === stocks.length ? (
                                    <CheckSquare className="h-4 w-4" />
                                  ) : (
                                    <Square className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                              <div className="flex-1 pl-2">Symbol</div>
                            </div>
                          </TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>RSI</TableHead>
                          <TableHead>VWAP</TableHead>
                          <TableHead>SMA/EMA</TableHead>
                          <TableHead>Volume</TableHead>
                          <TableHead>Trend</TableHead>
                          <TableHead>Score</TableHead>
                          <TableHead>Signal</TableHead>
                          <TableHead>Direction</TableHead>
                          <TableHead>Signals</TableHead>
                          <TableHead>ATR</TableHead>
                          <TableHead>Volume Strategy</TableHead>
                          <TableHead>AI Analysis</TableHead>
                          <TableHead>Entry</TableHead>
                          <TableHead>Target</TableHead>
                          <TableHead>Stop Loss</TableHead>
                          <TableHead>Volume Range</TableHead>
                          <TableHead>Trading Plan</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stocks.map((stock) => {
                          const latestSignal = stock.latestSignal;
                          const isSelected = selectedStocks.has(stock.id);
                          const isAnalyzing = analyzing === stock.id;

                          return (
                            <TableRow
                              key={stock.id}
                              className={
                                isSelected
                                  ? "bg-blue-50 dark:bg-blue-900/20"
                                  : ""
                              }
                            >
                              {/* Symbol Column (Sticky) */}
                              <TableCell
                                className={`w-[200px] sticky left-0 z-30 shadow-lg backdrop-blur-sm border-r ${
                                  isSelected
                                    ? "bg-blue-50 dark:bg-blue-900/20"
                                    : "bg-white dark:bg-slate-800"
                                }`}
                              >
                                <div className="flex items-center">
                                  <div className="w-16 flex justify-center">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        toggleRowSelection(stock.id)
                                      }
                                      className="p-0 h-6 w-6"
                                    >
                                      {isSelected ? (
                                        <CheckSquare className="h-4 w-4 text-blue-600" />
                                      ) : (
                                        <Square className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </div>
                                  <div className="flex-1 pl-2">
                                    <span className="font-semibold text-blue-600">
                                      {stock.symbol}
                                    </span>
                                  </div>
                                </div>
                              </TableCell>

                              {/* Price Column */}
                              <TableCell className="font-semibold">
                                {latestSignal?.price
                                  ? `₹${formatNumber(latestSignal.price)}`
                                  : "N/A"}
                              </TableCell>

                              {/* RSI Column */}
                              <TableCell>
                                {latestSignal?.rsi_14 ? (
                                  <Badge
                                    className={
                                      latestSignal.rsi_14 > 70
                                        ? "bg-red-500 text-white"
                                        : latestSignal.rsi_14 < 30
                                        ? "bg-green-500 text-white"
                                        : "bg-yellow-500 text-white"
                                    }
                                  >
                                    {formatNumber(latestSignal.rsi_14, 1)}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline">N/A</Badge>
                                )}
                              </TableCell>

                              {/* VWAP Column */}
                              <TableCell>
                                <div className="flex flex-col gap-1">
                                  <span className="text-sm font-medium">
                                    {latestSignal?.vwap
                                      ? `₹${formatNumber(latestSignal.vwap)}`
                                      : "N/A"}
                                  </span>
                                  {latestSignal?.price &&
                                    latestSignal?.vwap && (
                                      <Badge
                                        className={
                                          latestSignal.price > latestSignal.vwap
                                            ? "bg-green-500 text-white text-xs"
                                            : "bg-red-500 text-white text-xs"
                                        }
                                      >
                                        {latestSignal.price > latestSignal.vwap
                                          ? "Above"
                                          : "Below"}
                                      </Badge>
                                    )}
                                </div>
                              </TableCell>

                              {/* SMA/EMA Column */}
                              <TableCell>
                                <div className="flex flex-col gap-1">
                                  <div className="text-xs">
                                    <span className="text-slate-600">
                                      SMA20:
                                    </span>{" "}
                                    {latestSignal?.sma_20
                                      ? `₹${formatNumber(latestSignal.sma_20)}`
                                      : "N/A"}
                                  </div>
                                  <div className="text-xs">
                                    <span className="text-slate-600">
                                      EMA9:
                                    </span>{" "}
                                    {latestSignal?.ema_9
                                      ? `₹${formatNumber(latestSignal.ema_9)}`
                                      : "N/A"}
                                  </div>
                                </div>
                              </TableCell>

                              {/* Volume Column */}
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-medium">
                                    {latestSignal?.volume
                                      ? latestSignal.volume.toLocaleString()
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

                              {/* Trend Column */}
                              <TableCell>
                                {latestSignal ? (
                                  <Badge
                                    className={
                                      (
                                        latestSignal.trend_alignment ||
                                        latestSignal.trend
                                      )?.includes("bullish")
                                        ? "bg-green-500 text-white"
                                        : (
                                            latestSignal.trend_alignment ||
                                            latestSignal.trend
                                          )?.includes("bearish")
                                        ? "bg-red-500 text-white"
                                        : "bg-gray-500 text-white"
                                    }
                                  >
                                    {(() => {
                                      const trend =
                                        latestSignal.trend_alignment ||
                                        latestSignal.trend;
                                      if (!trend) return "N/A";

                                      if (trend === "bullish_aligned")
                                        return "🟢 Strong Bull";
                                      if (trend === "bearish_aligned")
                                        return "🔴 Strong Bear";
                                      if (trend === "bullish_partial")
                                        return "🟡 Weak Bull";
                                      if (trend === "bearish_partial")
                                        return "🟡 Weak Bear";
                                      if (trend === "neutral")
                                        return "⚪ Neutral";

                                      return trend.replace("_", " ");
                                    })()}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline">N/A</Badge>
                                )}
                              </TableCell>

                              {/* Score Column */}
                              <TableCell>
                                {latestSignal?.intraday_score ? (
                                  <div className="flex flex-col gap-1">
                                    <Badge
                                      className={
                                        latestSignal.intraday_score >= 7
                                          ? "bg-green-600 text-white"
                                          : latestSignal.intraday_score >= 5
                                          ? "bg-yellow-500 text-white"
                                          : "bg-red-500 text-white"
                                      }
                                    >
                                      {latestSignal.intraday_score}/10
                                    </Badge>
                                    <div className="flex gap-1">
                                      {latestSignal.clean_setup && (
                                        <Badge className="bg-blue-500 text-white text-xs">
                                          Clean
                                        </Badge>
                                      )}
                                      {latestSignal.breakout_day_high && (
                                        <Badge className="bg-purple-500 text-white text-xs">
                                          Breakout
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <Badge variant="outline">N/A</Badge>
                                )}
                              </TableCell>

                              {/* Signal Column */}
                              <TableCell>
                                {latestSignal?.signal ? (
                                  getSignalBadge(latestSignal.signal)
                                ) : (
                                  <Badge variant="outline">Not analyzed</Badge>
                                )}
                              </TableCell>

                              {/* Direction Column */}
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

                              {/* Signals Column */}
                              <TableCell className="w-[400px] min-w-[400px] max-w-[400px]">
                                {latestSignal ? (
                                  <div className="text-sm text-slate-600 dark:text-slate-400 break-words whitespace-normal leading-relaxed p-3 bg-blue-50 dark:bg-blue-900/20 rounded border">
                                    <div className="space-y-2">
                                      {/* Technical Insights */}
                                      <div className="flex flex-wrap gap-1 mb-2">
                                        {latestSignal.rsi_14 && (
                                          <Badge
                                            className={
                                              latestSignal.rsi_14 > 70
                                                ? "bg-red-500 text-white text-xs"
                                                : latestSignal.rsi_14 < 30
                                                ? "bg-green-500 text-white text-xs"
                                                : "bg-yellow-500 text-white text-xs"
                                            }
                                          >
                                            RSI:{" "}
                                            {formatNumber(
                                              latestSignal.rsi_14,
                                              1
                                            )}
                                          </Badge>
                                        )}
                                        {latestSignal.trend_alignment && (
                                          <Badge
                                            className={
                                              latestSignal.trend_alignment.includes(
                                                "bullish"
                                              )
                                                ? "bg-green-500 text-white text-xs"
                                                : latestSignal.trend_alignment.includes(
                                                    "bearish"
                                                  )
                                                ? "bg-red-500 text-white text-xs"
                                                : "bg-gray-500 text-white text-xs"
                                            }
                                          >
                                            {latestSignal.trend_alignment.replace(
                                              "_",
                                              " "
                                            )}
                                          </Badge>
                                        )}
                                        {latestSignal.signal &&
                                          getSignalBadge(latestSignal.signal)}
                                      </div>

                                      {/* Breakout Badges */}
                                      <div className="flex flex-wrap gap-1 mb-2">
                                        {latestSignal.breakout_day_high && (
                                          <Badge className="bg-purple-500 text-white text-xs">
                                            Day High Breakout
                                          </Badge>
                                        )}
                                        {latestSignal.clean_setup && (
                                          <Badge className="bg-blue-500 text-white text-xs">
                                            Clean Setup
                                          </Badge>
                                        )}
                                        {latestSignal.volume_spike && (
                                          <Badge className="bg-orange-500 text-white text-xs">
                                            <Zap className="h-3 w-3 mr-1" />
                                            Volume Spike
                                          </Badge>
                                        )}
                                      </div>

                                      {/* Quality Indicators */}
                                      {latestSignal.intraday_score && (
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs text-slate-500">
                                            Quality:
                                          </span>
                                          <Badge
                                            className={
                                              latestSignal.intraday_score >= 7
                                                ? "bg-green-600 text-white text-xs"
                                                : latestSignal.intraday_score >=
                                                  5
                                                ? "bg-yellow-500 text-white text-xs"
                                                : "bg-red-500 text-white text-xs"
                                            }
                                          >
                                            {latestSignal.intraday_score}/10
                                          </Badge>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-sm text-slate-400 p-3 bg-gray-50 dark:bg-gray-800 rounded border">
                                    No technical analysis available
                                  </div>
                                )}
                              </TableCell>

                              {/* ATR Column */}
                              <TableCell>
                                <div className="text-sm">
                                  {latestSignal?.atr_14 ? (
                                    <div className="space-y-1">
                                      <div className="font-medium text-blue-600">
                                        ₹{formatNumber(latestSignal.atr_14)}
                                      </div>
                                      <div className="text-xs text-slate-500">
                                        Risk Guide
                                      </div>
                                    </div>
                                  ) : (
                                    <Badge variant="outline">N/A</Badge>
                                  )}
                                </div>
                              </TableCell>

                              {/* Volume Strategy Column */}
                              <TableCell className="w-[250px] min-w-[250px] max-w-[250px]">
                                {latestSignal?.volume_range_text ? (
                                  <div className="text-sm text-slate-600 dark:text-slate-400 break-words whitespace-normal leading-relaxed p-3 bg-green-50 dark:bg-green-900/20 rounded border">
                                    {latestSignal.volume_range_text}
                                  </div>
                                ) : (
                                  <div className="text-sm text-slate-400 p-3 bg-gray-50 dark:bg-gray-800 rounded border">
                                    No volume strategy available
                                  </div>
                                )}
                              </TableCell>

                              {/* AI Analysis Column */}
                              <TableCell className="w-[500px] min-w-[500px] max-w-[500px]">
                                <div className="text-sm text-slate-600 dark:text-slate-400 break-words whitespace-normal leading-relaxed p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded border">
                                  {latestSignal?.llm_opinion ||
                                    (latestSignal
                                      ? getInsightsSummary(latestSignal).join(
                                          ". "
                                        )
                                      : "No AI analysis available")}
                                </div>
                              </TableCell>

                              {/* Entry Column */}
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

                              {/* Target Column */}
                              <TableCell className="font-semibold text-blue-600">
                                {latestSignal?.target_price
                                  ? `₹${formatNumber(
                                      latestSignal.target_price
                                    )}`
                                  : "N/A"}
                              </TableCell>

                              {/* Stop Loss Column */}
                              <TableCell className="font-semibold text-red-600">
                                {latestSignal?.stop_loss
                                  ? `₹${formatNumber(latestSignal.stop_loss)}`
                                  : "N/A"}
                              </TableCell>

                              {/* Volume Range Column */}
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
                                    No volume range available
                                  </div>
                                )}
                              </TableCell>

                              {/* Trading Plan Column */}
                              <TableCell className="w-[600px] min-w-[600px] max-w-[600px]">
                                <div className="text-xs text-slate-600 dark:text-slate-400 break-words whitespace-pre-line leading-none p-1 bg-yellow-50 dark:bg-yellow-900/20 rounded border">
                                  {latestSignal?.trading_plan ||
                                    "No trading plan available"}
                                </div>
                              </TableCell>

                              {/* Actions Column */}
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
        )}
      </div>
    </div>
  );
}
