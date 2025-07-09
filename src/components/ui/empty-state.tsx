import { TrendingUp, Search, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  onSearchFocus?: () => void;
}

export function EmptyState({ onSearchFocus }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-blue-100 rounded-full blur-xl opacity-50"></div>
        <div className="relative bg-white rounded-full p-6 shadow-lg">
          <BarChart3 className="h-12 w-12 text-blue-600" />
        </div>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        Welcome to Stock Analyzer
      </h2>

      <p className="text-gray-600 mb-6 max-w-md">
        Get comprehensive technical analysis and AI-powered insights for your
        stock investments. Search for a stock to get started.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={onSearchFocus} className="flex items-center gap-2">
          <Search className="h-4 w-4" />
          Search Stocks
        </Button>

        <Button variant="outline" className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          View Recent Analysis
        </Button>
      </div>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-blue-600 mb-2">📊</div>
          <h3 className="font-semibold text-gray-900 mb-1">
            Technical Analysis
          </h3>
          <p className="text-sm text-gray-600">
            RSI, MACD, Moving Averages, and more
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-green-600 mb-2">🤖</div>
          <h3 className="font-semibold text-gray-900 mb-1">AI Insights</h3>
          <p className="text-sm text-gray-600">Smart trading recommendations</p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-purple-600 mb-2">💰</div>
          <h3 className="font-semibold text-gray-900 mb-1">Risk Management</h3>
          <p className="text-sm text-gray-600">
            Stop loss and target calculations
          </p>
        </div>
      </div>
    </div>
  );
}
