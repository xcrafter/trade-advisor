"use client";

import React, { useState, useEffect } from "react";
import { Search, TrendingUp, TrendingDown, Minus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { authenticatedFetchJson, authenticatedFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";

export interface StockData {
  symbol: string;
  price: number;
  signal: string;
  swing_score: number;
  last_updated_at: string;
}

interface RecentStocksSidebarProps {
  onStockSelect: (stockData: StockData) => void;
  refreshTrigger?: number;
}

export function RecentStocksSidebar({
  onStockSelect,
  refreshTrigger = 0,
}: RecentStocksSidebarProps) {
  const [recentStocks, setRecentStocks] = useState<StockData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStocks, setSelectedStocks] = useState<Set<string>>(new Set());
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let mounted = true;

    const fetchRecentStocks = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await authenticatedFetchJson<StockData[]>(
          "/api/analyze/recent"
        );

        // Only update state if component is still mounted
        if (mounted) {
          setRecentStocks(data || []);
          setError(null);
          // Clear selections when stocks are refreshed
          setSelectedStocks(new Set());
        }
      } catch (error) {
        console.error("Error fetching recent stocks:", error);
        if (mounted) {
          setError(
            error instanceof Error
              ? error.message
              : "Failed to fetch recent stocks"
          );
          setRecentStocks([]); // Clear stocks on error
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchRecentStocks();

    // Cleanup function to prevent state updates after unmount
    return () => {
      mounted = false;
    };
  }, [refreshTrigger]);

  const filteredStocks = recentStocks.filter((stock) =>
    stock.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSignalIcon = (signal: string) => {
    switch (signal?.toLowerCase()) {
      case "buy":
      case "strong_buy":
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case "sell":
      case "strong_sell":
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      default:
        return <Minus className="w-4 h-4 text-gray-600" />;
    }
  };

  const getSignalColor = (signal: string) => {
    switch (signal?.toLowerCase()) {
      case "buy":
      case "strong_buy":
        return "bg-green-100 text-green-800";
      case "sell":
      case "strong_sell":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleStockClick = (
    stock: StockData,
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    // If clicking the checkbox or its label, let the checkbox handler deal with it
    if (
      event.target instanceof HTMLElement &&
      (event.target.closest('input[type="checkbox"]') ||
        event.target.closest('label[for^="stock-"]'))
    ) {
      return;
    }
    onStockSelect(stock);
  };

  const handleCheckboxChange = (symbol: string) => {
    const newSelected = new Set(selectedStocks);
    if (newSelected.has(symbol)) {
      newSelected.delete(symbol);
    } else {
      newSelected.add(symbol);
    }
    setSelectedStocks(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedStocks.size === filteredStocks.length) {
      setSelectedStocks(new Set());
    } else {
      setSelectedStocks(new Set(filteredStocks.map((stock) => stock.symbol)));
    }
  };

  const handleBulkDelete = async () => {
    try {
      setIsDeleting(true);

      // Delete each selected stock
      for (const symbol of selectedStocks) {
        await authenticatedFetch(
          `/api/analyze?symbol=${encodeURIComponent(symbol)}`,
          {
            method: "DELETE",
          }
        );
      }

      // Refresh the stocks list
      const data = await authenticatedFetchJson<StockData[]>(
        "/api/analyze/recent"
      );
      setRecentStocks(data || []);
      setSelectedStocks(new Set());
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error("Error deleting stocks:", error);
      setError("Failed to delete selected stocks");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          {selectedStocks?.size == 0 && (
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Analysis
            </h2>
          )}
          {selectedStocks.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {selectedStocks.size} selected
              </span>
              <Button
                variant="destructive"
                size="sm"
                className="h-8"
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </div>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            type="text"
            placeholder="Search stocks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        {filteredStocks.length > 0 && (
          <div className="mt-3 flex items-center bg-gray-50 p-2 rounded-md">
            <Checkbox
              id="select-all"
              checked={
                selectedStocks.size > 0 &&
                selectedStocks.size === filteredStocks.length
              }
              onCheckedChange={handleSelectAll}
              className="border-gray-400"
            />
            <label
              htmlFor="select-all"
              className="ml-2 text-sm text-gray-600 cursor-pointer select-none"
            >
              Select All
            </label>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="p-4 text-center text-red-500">{error}</div>
        ) : filteredStocks.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            {searchTerm ? "No stocks found" : "No recent analysis"}
          </div>
        ) : (
          <div className="p-2">
            {filteredStocks.map((stock) => (
              <div
                key={stock.symbol}
                onClick={(e: React.MouseEvent<HTMLDivElement>) =>
                  handleStockClick(stock, e)
                }
                className={cn(
                  "p-3 rounded-lg hover:bg-gray-50 cursor-pointer border transition-colors",
                  selectedStocks.has(stock.symbol)
                    ? "border-gray-300 bg-gray-50"
                    : "border-transparent hover:border-gray-200",
                  "mb-2"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="relative flex items-center justify-center">
                      <Checkbox
                        id={`stock-${stock.symbol}`}
                        checked={selectedStocks.has(stock.symbol)}
                        onCheckedChange={() =>
                          handleCheckboxChange(stock.symbol)
                        }
                        onClick={(e) => e.stopPropagation()}
                        className="border-gray-400"
                      />
                    </div>

                    <span className="font-medium text-gray-900">
                      {stock.symbol}
                    </span>
                  </div>
                  <Badge className={`text-xs ${getSignalColor(stock.signal)}`}>
                    {stock.signal?.replace("_", " ").toUpperCase()}
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>{formatPrice(stock.price)}</span>
                  <span>{formatDate(stock.last_updated_at)}</span>
                </div>

                {stock.swing_score && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>Swing Score</span>
                      <span>{stock.swing_score}/10</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1">
                      <div
                        className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                        style={{ width: `${(stock.swing_score / 10) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Selected Stocks</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedStocks.size} selected{" "}
              {selectedStocks.size === 1 ? "stock" : "stocks"}? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
