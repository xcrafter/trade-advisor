"use client";

import { useRouter } from "next/navigation";
import CalendarView from "@/components/CalendarView";

export default function CalendarPage() {
  const router = useRouter();

  const handleSessionSelect = (sessionId: string, date: Date) => {
    // Navigate to dashboard page with session data
    const dateString = date.toISOString().split("T")[0];
    router.push(`/dashboard?sessionId=${sessionId}&date=${dateString}`);
  };

  return <CalendarView onSessionSelect={handleSessionSelect} />;
}
