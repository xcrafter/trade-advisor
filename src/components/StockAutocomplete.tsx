"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

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
import { type InstrumentSearchResult } from "@/models/InstrumentModel";

interface StockAutocompleteProps {
  value?: string;
  onChange?: (symbol: string, stock: InstrumentSearchResult | null) => void;
  onSelect?: (instrumentKey: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  showCompanyName?: boolean;
  limit?: number;
  exchange?: string;
}

export const StockAutocomplete = React.forwardRef<
  HTMLButtonElement,
  StockAutocompleteProps
>(function StockAutocomplete(
  {
    value = "",
    onChange,
    onSelect,
    placeholder = "Search stocks by symbol or company name...",
    disabled = false,
    className = "",
    showCompanyName = true,
    limit = 8,
    exchange,
  }: StockAutocompleteProps,
  ref
) {
  const [query, setQuery] = useState(value);
  const [recommendations, setRecommendations] = useState<
    InstrumentSearchResult[]
  >([]);

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
    useState<InstrumentSearchResult | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Search for stocks
  const searchStocks = useCallback(
    async (searchQuery: string) => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          q: searchQuery,
          limit: limit.toString(),
        });

        if (exchange) {
          params.append("exchange", exchange);
        }

        const response = await fetch(`/api/upstox/search?${params}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to search stocks");
        }

        setRecommendations(data.results || []);
      } catch (error) {
        console.error("Error searching stocks:", error);
        setRecommendations([]);
      } finally {
        setLoading(false);
      }
    },
    [limit, exchange]
  );

  // Debounced search
  useEffect(() => {
    if (!query) {
      setRecommendations([]);
      return;
    }

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
  }, [query, limit, searchStocks]);

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
  const handleStockSelect = (stock: InstrumentSearchResult) => {
    setQuery(stock.symbol);
    setSelectedStock(stock);
    setOpen(false);
    onChange?.(stock.symbol, stock);
    onSelect?.(stock.instrument_key);
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
            ref={ref}
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
                        {selectedStock.company_clean}
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
                              {stock.company_clean}
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
                {selectedStock.company_clean}
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
});
