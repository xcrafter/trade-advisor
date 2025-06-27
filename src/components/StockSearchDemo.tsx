"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import StockAutocomplete from "@/components/StockAutocomplete";
import { Search, TrendingUp, Building2, Star } from "lucide-react";

interface StockRecommendation {
  symbol: string;
  company: string;
  companyClean: string;
  matchType: "symbol" | "company" | "partial";
  relevanceScore: number;
}

export default function StockSearchDemo() {
  const [selectedStock, setSelectedStock] =
    useState<StockRecommendation | null>(null);
  const [searchHistory, setSearchHistory] = useState<StockRecommendation[]>([]);

  const handleStockSelect = (stock: StockRecommendation) => {
    setSelectedStock(stock);

    // Add to search history (avoid duplicates)
    setSearchHistory((prev) => {
      const filtered = prev.filter((s) => s.symbol !== stock.symbol);
      return [stock, ...filtered].slice(0, 5); // Keep last 5 searches
    });
  };

  const popularStocks = [
    { symbol: "RELIANCE", name: "Reliance Industries" },
    { symbol: "TCS", name: "Tata Consultancy Services" },
    { symbol: "INFY", name: "Infosys" },
    { symbol: "HDFCBANK", name: "HDFC Bank" },
    { symbol: "ICICIBANK", name: "ICICI Bank" },
    { symbol: "SBIN", name: "State Bank of India" },
  ];

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Stock Recommendation System
        </h1>
        <p className="text-muted-foreground text-lg">
          Search from 2,230+ Indian stocks with intelligent recommendations
        </p>
      </div>

      {/* Main Search */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Smart Stock Search
          </CardTitle>
          <CardDescription>
            Start typing to see intelligent stock recommendations based on
            symbol or company name
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <StockAutocomplete
            onSelect={handleStockSelect}
            placeholder="Search by symbol (e.g., RELIANCE) or company name (e.g., Tata)..."
            showCompanyName={true}
            limit={8}
          />

          {/* Popular Stocks */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              Popular Stocks:
            </p>
            <div className="flex flex-wrap gap-2">
              {popularStocks.map((stock) => (
                <Button
                  key={stock.symbol}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    // Simulate selection
                    handleStockSelect({
                      symbol: stock.symbol,
                      company: stock.name,
                      companyClean: stock.name,
                      matchType: "symbol",
                      relevanceScore: 100,
                    });
                  }}
                >
                  {stock.symbol}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Stock Display */}
      {selectedStock && (
        <Card className="shadow-lg border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <TrendingUp className="h-5 w-5" />
              Selected Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold">
                      {selectedStock.symbol}
                    </span>
                    <Badge variant="default" className="text-xs">
                      {selectedStock.matchType === "symbol"
                        ? "Symbol Match"
                        : selectedStock.matchType === "company"
                        ? "Company Match"
                        : "Partial Match"}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">
                    {selectedStock.company}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">
                    Relevance Score
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    {selectedStock.relevanceScore}%
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-white dark:bg-slate-800 rounded-lg">
                <div>
                  <div className="text-sm text-muted-foreground">
                    Full Company Name
                  </div>
                  <div className="font-medium">{selectedStock.company}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">
                    Clean Name
                  </div>
                  <div className="font-medium">
                    {selectedStock.companyClean}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search History */}
      {searchHistory.length > 0 && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Recent Searches
            </CardTitle>
            <CardDescription>Your recently selected stocks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {searchHistory.map((stock, index) => (
                <div
                  key={`${stock.symbol}-${index}`}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors cursor-pointer"
                  onClick={() => setSelectedStock(stock)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">{stock.symbol}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {stock.companyClean}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {stock.relevanceScore}%
                    </Badge>
                    {index === 0 && (
                      <Star className="h-4 w-4 text-yellow-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Features */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Search Features</CardTitle>
          <CardDescription>
            How our intelligent recommendation system works
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-green-600">
                ✅ Smart Matching
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Exact symbol matches (highest priority)</li>
                <li>• Company name matching</li>
                <li>• Partial word matching</li>
                <li>• Relevance scoring (0-100%)</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-blue-600">🚀 Performance</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 2,230+ stocks available</li>
                <li>• Real-time search with debouncing</li>
                <li>• Cached data for fast responses</li>
                <li>• Intelligent result ranking</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
