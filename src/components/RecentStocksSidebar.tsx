import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { RefreshCw, Search, TrendingUp } from "lucide-react";
import { StockAnalysis } from "@/controllers/StockController";

interface RecentStocksSidebarProps {
  onStockSelect: (symbol: string) => void;
}

export function RecentStocksSidebar({
  onStockSelect,
}: RecentStocksSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [recentStocks, setRecentStocks] = useState<StockAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load recent stocks on mount
  useEffect(() => {
    loadRecentStocks();
  }, []);

  // Load recent stocks from API
  const loadRecentStocks = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/analyze/recent");
      if (response.ok) {
        const data = await response.json();
        setRecentStocks(data);
      }
    } catch (error) {
      console.error("Failed to load recent stocks:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Search stocks
  const searchStocks = async (query: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/analyze/search?q=${encodeURIComponent(query)}`
      );
      if (response.ok) {
        const data = await response.json();
        setRecentStocks(data);
      }
    } catch (error) {
      console.error("Failed to search stocks:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.length >= 2) {
      searchStocks(query);
    } else if (query.length === 0) {
      loadRecentStocks();
    }
  };

  // Format last updated time
  const formatLastUpdated = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return "Just now";
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="w-80 h-full border-r bg-gray-50/50 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b bg-white">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          <h2 className="font-semibold text-gray-900">Recent Analysis</h2>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search stocks..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-500">Loading...</span>
          </div>
        ) : recentStocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center px-4">
            <TrendingUp className="h-8 w-8 text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">No recent analysis found</p>
            <p className="text-xs text-gray-400 mt-1">
              Search for stocks to get started
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {recentStocks.map((stock) => (
              <Card
                key={stock.symbol}
                className="p-3 cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition-colors duration-150 min-h-[60px]"
                onClick={() => onStockSelect(stock.symbol)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 truncate">
                        {stock.symbol}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                          stock.signal.includes("buy")
                            ? "bg-green-100 text-green-700"
                            : stock.signal.includes("sell")
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {stock.signal.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm font-medium text-gray-900">
                        ₹{stock.price.toFixed(2)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatLastUpdated(stock.last_updated_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
