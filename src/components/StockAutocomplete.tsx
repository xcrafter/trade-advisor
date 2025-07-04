"use client";

import { useState, useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Search,
  Building2,
  TrendingUp,
  Loader2,
  Check,
  ChevronDown,
} from "lucide-react";

interface StockRecommendation {
  symbol: string;
  instrument_key: string;
  company: string;
  companyClean: string;
  exchange: string;
  matchType: "symbol" | "company" | "partial";
  relevanceScore: number;
}

interface StockAutocompleteProps {
  value?: string;
  onChange?: (symbol: string, stock: StockRecommendation | null) => void;
  onSelect?: (stock: StockRecommendation) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  showCompanyName?: boolean;
  limit?: number;
}

export default function StockAutocomplete({
  value = "",
  onChange,
  onSelect,
  placeholder = "Search stocks by symbol or company name...",
  disabled = false,
  className = "",
  showCompanyName = true,
  limit = 8,
}: StockAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [recommendations, setRecommendations] = useState<StockRecommendation[]>(
    []
  );

  // Debug: Log when recommendations change
  useEffect(() => {
    console.log(
      "Recommendations updated:",
      recommendations.length,
      recommendations
    );
  }, [recommendations]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedStock, setSelectedStock] =
    useState<StockRecommendation | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Search for stocks
  const searchStocks = async (searchQuery: string) => {
    if (!searchQuery || searchQuery.trim().length < 1) {
      setRecommendations([]);
      return;
    }

    const searchUrl = `/api/upstox/search?q=${encodeURIComponent(
      searchQuery.trim()
    )}&limit=${limit}`;

    console.log(`Attempting to fetch: ${searchUrl}`);
    setLoading(true);
    try {
      // Test basic connectivity first
      console.log("Testing connectivity...");
      const response = await fetch(searchUrl);

      if (response.ok) {
        const data = await response.json();
        console.log(
          `Search for "${searchQuery}":`,
          data.results?.length || 0,
          "results"
        );
        console.log("Results:", data.results);
        setRecommendations(data.results || []);
      } else {
        const errorText = await response.text();
        console.error(
          `Failed to search stocks: ${response.status} ${response.statusText}`,
          errorText
        );
        setRecommendations([]);
      }
    } catch (error) {
      console.error("Stock search error:", error);
      console.error("Error details:", {
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined,
      });
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      searchStocks(query);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, limit]);

  // Handle input change
  const handleInputChange = (newValue: string) => {
    setQuery(newValue);
    setSelectedStock(null);
    onChange?.(newValue, null);

    if (newValue.length > 0) {
      setOpen(true);
    }
  };

  // Handle stock selection
  const handleStockSelect = (stock: StockRecommendation) => {
    setQuery(stock.symbol);
    setSelectedStock(stock);
    setOpen(false);
    onChange?.(stock.symbol, stock);
    onSelect?.(stock);
  };

  // Get match type badge
  const getMatchTypeBadge = (matchType: string) => {
    switch (matchType) {
      case "symbol":
        return (
          <Badge variant="default" className="text-xs">
            Symbol
          </Badge>
        );
      case "company":
        return (
          <Badge variant="secondary" className="text-xs">
            Company
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-xs">
            Match
          </Badge>
        );
    }
  };

  return (
    <div className={`relative ${className}`}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between text-left font-normal"
            disabled={disabled}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                {selectedStock ? (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{selectedStock.symbol}</span>
                    <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                      {selectedStock.exchange}
                    </span>
                    {showCompanyName && (
                      <span className="text-sm text-muted-foreground truncate">
                        {selectedStock.companyClean}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground">{placeholder}</span>
                )}
              </div>
            </div>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[--radix-popover-trigger-width] p-0"
          align="start"
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Type to search stocks..."
              value={query}
              onValueChange={handleInputChange}
            />
            <CommandList>
              {loading && (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-sm text-muted-foreground">
                    Searching...
                  </span>
                </div>
              )}

              {!loading && query.length > 0 && recommendations.length === 0 && (
                <CommandEmpty>
                  <div className="text-center p-4">
                    <Building2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-2">
                      No stocks found
                    </p>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>Try searching by:</p>
                      <p>• Stock symbol (e.g., RELIANCE, TCS)</p>
                      <p>• Company name (e.g., Tata, Infosys)</p>
                    </div>
                  </div>
                </CommandEmpty>
              )}

              {!loading && recommendations.length > 0 && (
                <CommandGroup>
                  {recommendations.map((stock, index) => {
                    const itemValue = `${stock.symbol}-${stock.exchange}`;
                    console.log(
                      `Rendering item ${index}:`,
                      stock.symbol,
                      stock.exchange,
                      itemValue
                    );
                    return (
                      <CommandItem
                        key={itemValue}
                        value={itemValue}
                        onSelect={(value) => {
                          console.log(
                            "Item selected:",
                            value,
                            "Expected:",
                            itemValue
                          );
                          if (value === itemValue) {
                            handleStockSelect(stock);
                          }
                        }}
                        className="flex items-center justify-between p-3 cursor-pointer"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-blue-500 flex-shrink-0" />
                            <div className="font-medium text-sm">
                              {stock.symbol}
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-muted-foreground truncate">
                              {stock.companyClean}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                              {stock.exchange}
                            </div>
                            {getMatchTypeBadge(stock.matchType)}
                          </div>
                        </div>

                        {selectedStock?.symbol === stock.symbol &&
                          selectedStock?.exchange === stock.exchange && (
                            <Check className="h-4 w-4 text-blue-500 flex-shrink-0" />
                          )}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected stock info */}
      {selectedStock && showCompanyName && (
        <div className="mt-2 p-2 bg-muted rounded-md">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{selectedStock.symbol}</span>
              <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                {selectedStock.exchange}
              </span>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">
                {selectedStock.company}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {getMatchTypeBadge(selectedStock.matchType)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
