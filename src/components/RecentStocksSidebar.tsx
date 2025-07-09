"use client";

import React, { useState, useEffect } from "react";
import { Search, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface StockData {
  symbol: string;
  price: number;
  signal: string;
  swing_score: number;
  last_updated_at: string;
}

interface RecentStocksSidebarProps {
  onStockSelect: (symbol: string) => void;
}

export function RecentStocksSidebar({
  onStockSelect,
}: RecentStocksSidebarProps) {
  const [recentStocks, setRecentStocks] = useState<StockData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentStocks();
  }, []);

  const fetchRecentStocks = async () => {
    try {
      const response = await fetch("/api/analyze/recent");
      if (response.ok) {
        const data = await response.json();
        setRecentStocks(data || []);
      }
    } catch (error) {
      console.error("Error fetching recent stocks:", error);
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Recent Analysis
        </h2>
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
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredStocks.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            {searchTerm ? "No stocks found" : "No recent analysis"}
          </div>
        ) : (
          <div className="p-2">
            {filteredStocks.map((stock) => (
              <div
                key={stock.symbol}
                onClick={() => onStockSelect(stock.symbol)}
                className="p-3 rounded-lg hover:bg-gray-50 cursor-pointer border border-transparent hover:border-gray-200 mb-2 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {getSignalIcon(stock.signal)}
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
    </div>
  );
}
