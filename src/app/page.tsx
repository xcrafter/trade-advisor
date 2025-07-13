"use client";

import { StockAutocomplete } from "@/components/StockAutocomplete";
import { RecentStocksSidebar } from "@/components/RecentStocksSidebar";
import { StockChart } from "@/components/StockChart";
import { Navbar } from "@/components/ui/navbar";
import { EmptyState } from "@/components/ui/empty-state";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/auth/AuthModal";
import { useState, useCallback } from "react";

export default function Home() {
  const { user, loading } = useAuth();
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [selectedInstrumentKey, setSelectedInstrumentKey] = useState<
    string | null
  >(null);
  const [sidebarRefreshTrigger, setSidebarRefreshTrigger] = useState(0);

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

  // Handle successful analysis
  const handleAnalysisComplete = useCallback((symbol: string) => {
    setSelectedSymbol(symbol);
    setSidebarRefreshTrigger((prev) => prev + 1); // Trigger sidebar refresh
  }, []);

  // Show loading screen while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show auth modal if user is not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-64px)] px-4">
          <div className="w-full max-w-lg mx-auto">
            <AuthModal
              isOpen={true}
              onClose={() => {}}
              defaultMode="login"
              persistent={true}
            />
          </div>
        </div>
      </div>
    );
  }

  // Main dashboard for authenticated users
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="flex h-[calc(100vh-64px)]">
        <RecentStocksSidebar
          onStockSelect={handleSymbolSelect}
          refreshTrigger={sidebarRefreshTrigger}
        />

        <div className="flex-1 flex flex-col">
          <div className="p-4 bg-white border-b">
            <StockAutocomplete onSelect={handleStockSelect} />
          </div>

          <div className="flex-1 overflow-auto">
            {selectedInstrumentKey ? (
              <div className="p-4">
                <StockChart
                  instrumentKey={selectedInstrumentKey}
                  onSymbolUpdate={handleAnalysisComplete}
                  onDelete={handleDeleteStock}
                />
              </div>
            ) : (
              <EmptyState />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
