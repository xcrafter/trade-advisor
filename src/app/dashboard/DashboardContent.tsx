"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import StockDashboard from "@/components/StockDashboard";

export default function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionDate, setSessionDate] = useState<Date | null>(null);

  useEffect(() => {
    const sessionIdParam = searchParams.get("sessionId");
    const dateParam = searchParams.get("date");

    if (!sessionIdParam || !dateParam) {
      // If no session data, redirect to calendar
      router.push("/calendar");
      return;
    }

    setSessionId(sessionIdParam);
    setSessionDate(new Date(dateParam));
  }, [searchParams, router]);

  const handleBackToCalendar = () => {
    router.push("/calendar");
  };

  if (!sessionId || !sessionDate) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading session...</p>
        </div>
      </div>
    );
  }

  return (
    <StockDashboard
      sessionId={sessionId}
      sessionDate={sessionDate}
      onBackToCalendar={handleBackToCalendar}
    />
  );
}
