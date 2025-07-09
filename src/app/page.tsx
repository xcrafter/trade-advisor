"use client";

import { StockAutocomplete } from "@/components/StockAutocomplete";
import { RecentStocksSidebar } from "@/components/RecentStocksSidebar";
import { StockChart } from "@/components/StockChart";
import { Navbar } from "@/components/ui/navbar";
import { EmptyState } from "@/components/ui/empty-state";
import { useState, useCallback } from "react";

export default function Home() {
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [selectedInstrumentKey, setSelectedInstrumentKey] = useState<
    string | null
  >(null);

  // Direct instrument key selection (from autocomplete)
  const handleStockSelect = useCallback(async (instrumentKey: string) => {
    try {
      // First get the symbol for the confirmation dialog
      const response = await fetch(
        `/api/upstox/search?q=${instrumentKey.split("|")[1]}&limit=1`
      );
      let symbolName = instrumentKey;

      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          symbolName = data.results[0].symbol;
        }
      }

      // Show confirmation dialog
      const confirmed = confirm(
        `Do you want to analyze ${symbolName}?\n\n` +
          `This will:\n` +
          `• Fetch real market data from Upstox\n` +
          `• Calculate technical indicators\n` +
          `• Generate AI-powered trading signals\n` +
          `• Store analysis for future reference\n\n` +
          `Note: Analysis may take 10-20 seconds to complete.`
      );

      if (confirmed) {
        setSelectedInstrumentKey(instrumentKey);
        setSelectedSymbol(null); // Will be set by StockChart component
      }
    } catch (error) {
      console.error("Error preparing stock analysis:", error);
      // Still show confirmation with instrument key if symbol lookup fails
      const confirmed = confirm(
        `Do you want to analyze this stock?\n\n` +
          `This will fetch real market data and generate analysis.\n` +
          `Analysis may take 10-20 seconds to complete.`
      );

      if (confirmed) {
        setSelectedInstrumentKey(instrumentKey);
        setSelectedSymbol(null);
      }
    }
  }, []);

  // Symbol selection (from sidebar) - needs to convert to instrument key
  const handleSymbolSelect = useCallback(async (symbol: string) => {
    try {
      const response = await fetch(`/api/upstox/search?q=${symbol}&limit=1`);
      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          const instrumentKey = data.results[0].instrument_key;
          setSelectedInstrumentKey(instrumentKey);
          setSelectedSymbol(symbol);
        } else {
          console.error("No instrument found for symbol:", symbol);
          alert(
            `Unable to find instrument data for ${symbol}. Please try searching for it again.`
          );
          setSelectedInstrumentKey(null);
          setSelectedSymbol(null);
        }
      } else {
        throw new Error("Failed to fetch instrument data");
      }
    } catch (error) {
      console.error("Error finding instrument key for symbol:", error);
      alert(
        `Failed to load ${symbol}. Please check your connection and try again.`
      );
      setSelectedInstrumentKey(null);
      setSelectedSymbol(null);
    }
  }, []);

  // Handle stock deletion
  const handleDeleteStock = useCallback(
    (symbol: string) => {
      // If the deleted stock is currently selected, clear the selection
      if (selectedSymbol === symbol) {
        setSelectedSymbol(null);
        setSelectedInstrumentKey(null);
      }
    },
    [selectedSymbol]
  );

  // Focus search input - simplified without ref
  const handleSearchFocus = useCallback(() => {
    // The search will be focused when user clicks the search button
    // No need for ref manipulation
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="flex h-[calc(100vh-64px)]">
        <RecentStocksSidebar onStockSelect={handleSymbolSelect} />

        <div className="flex-1 flex flex-col">
          <div className="p-4 bg-white border-b">
            <StockAutocomplete onSelect={handleStockSelect} />
          </div>

          <div className="flex-1 overflow-auto">
            {selectedInstrumentKey ? (
              <div className="p-4">
                <StockChart
                  instrumentKey={selectedInstrumentKey}
                  onSymbolUpdate={setSelectedSymbol}
                  onDelete={handleDeleteStock}
                />
              </div>
            ) : (
              <EmptyState onSearchFocus={handleSearchFocus} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
