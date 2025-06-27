"use client";

import { useState } from "react";
import CalendarView from "./CalendarView";
import StockDashboard from "./StockDashboard";

export default function App() {
  const [currentView, setCurrentView] = useState<"calendar" | "dashboard">(
    "calendar"
  );
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null
  );
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const handleSessionSelect = (sessionId: string, date: Date) => {
    setSelectedSessionId(sessionId);
    setSelectedDate(date);
    setCurrentView("dashboard");
  };

  const handleBackToCalendar = () => {
    setCurrentView("calendar");
    setSelectedSessionId(null);
    setSelectedDate(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {currentView === "calendar" ? (
        <CalendarView onSessionSelect={handleSessionSelect} />
      ) : (
        selectedSessionId &&
        selectedDate && (
          <StockDashboard
            sessionId={selectedSessionId}
            sessionDate={selectedDate}
            onBackToCalendar={handleBackToCalendar}
          />
        )
      )}
    </div>
  );
}
