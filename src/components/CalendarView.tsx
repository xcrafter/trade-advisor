"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CalendarDays,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react";
import { Session } from "@/lib/supabase";

interface CalendarViewProps {
  onSessionSelect: (sessionId: string, date: Date) => void;
}

export default function CalendarView({ onSessionSelect }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [sessions, setSessions] = useState<Session[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await fetch("/api/sessions");
      if (response.ok) {
        const data = await response.json();
        setSessions(data);
      }
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
    }
  };

  const getExistingSession = (date: Date) => {
    const dateString = date.toISOString().split("T")[0];
    return sessions.find((session) => session.session_date === dateString);
  };

  const handleDateClick = (date: Date) => {
    const existingSession = getExistingSession(date);

    if (existingSession) {
      // Go directly to existing session
      onSessionSelect(existingSession.id, date);
    } else {
      // Show create session dialog for new dates
      setSelectedDate(date);
      setTitle(`Trading Session - ${date.toLocaleDateString()}`);
      setShowCreateDialog(true);
    }
  };

  const createSession = async () => {
    if (!selectedDate) return;

    setCreating(true);
    setError("");

    try {
      const dateString = selectedDate.toISOString().split("T")[0];
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_date: dateString,
          title:
            title.trim() ||
            `Trading Session - ${selectedDate.toLocaleDateString()}`,
        }),
      });

      if (response.ok) {
        const newSession = await response.json();
        setSessions((prev) => [newSession, ...prev]);
        setShowCreateDialog(false);
        setTitle("");
        onSessionSelect(newSession.id, selectedDate);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to create session");
      }
    } catch {
      setError("Failed to create session");
    } finally {
      setCreating(false);
    }
  };

  const handleDialogClose = () => {
    setShowCreateDialog(false);
    setTitle("");
    setError("");
    setSelectedDate(null);
  };

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);

    // Start from the beginning of the week containing the first day
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    // End at the end of the week containing the last day
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));

    const days = [];
    const currentDay = new Date(startDate);

    while (currentDay <= endDate) {
      days.push(new Date(currentDay));
      currentDay.setDate(currentDay.getDate() + 1);
    }

    return days;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto max-w-7xl p-6">
          <div className="text-center py-20">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-12">
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-6 text-blue-500" />
              <p className="text-lg text-muted-foreground">
                Loading your trading calendar...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const calendarDays = generateCalendarDays();
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const dayAbbr = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto max-w-7xl p-6">
        {/* Modern Header */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl mb-8 p-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                Intraday Planner
              </h1>
              <p className="text-slate-600 dark:text-slate-300 text-lg">
                Organize your trading sessions with style
              </p>
            </div>

            {/* Enhanced Month Navigation */}
            <div className="flex items-center gap-6">
              <Button
                variant="outline"
                size="lg"
                onClick={goToToday}
                className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300"
              >
                Today
              </Button>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => navigateMonth("prev")}
                  className="rounded-full w-12 h-12 p-0 shadow-md hover:shadow-lg transition-all"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>

                <h2 className="text-2xl font-bold min-w-64 text-center bg-gradient-to-r from-slate-700 to-slate-900 dark:from-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
                  {monthNames[currentDate.getMonth()]}{" "}
                  {currentDate.getFullYear()}
                </h2>

                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => navigateMonth("next")}
                  className="rounded-full w-12 h-12 p-0 shadow-md hover:shadow-lg transition-all"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Modern Calendar Grid */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden">
          {/* Enhanced Day Headers */}
          <div className="grid grid-cols-7 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600">
            {dayAbbr.map((day, index) => (
              <div
                key={day}
                className="p-6 text-center font-semibold text-slate-700 dark:text-slate-200 border-r border-slate-300 dark:border-slate-600 last:border-r-0"
              >
                <div className="hidden sm:block text-lg">{dayNames[index]}</div>
                <div className="sm:hidden text-sm">{day}</div>
              </div>
            ))}
          </div>

          {/* Enhanced Calendar Days */}
          <div className="grid grid-cols-7">
            {calendarDays.map((date, index) => {
              const existingSession = getExistingSession(date);
              const isCurrentMonthDay = isCurrentMonth(date);
              const isTodayDate = isToday(date);
              const isWeekend = date.getDay() === 0 || date.getDay() === 6;

              return (
                <div
                  key={index}
                  className={`
                    min-h-32 p-3 border-r border-b border-slate-200 dark:border-slate-600 
                    cursor-pointer transition-all duration-200 group relative
                    ${
                      isCurrentMonthDay
                        ? "hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:shadow-lg"
                        : "bg-slate-50/50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700"
                    }
                    ${
                      isTodayDate
                        ? "bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30"
                        : ""
                    }
                    ${
                      isWeekend && isCurrentMonthDay
                        ? "bg-slate-50 dark:bg-slate-800/50"
                        : ""
                    }
                    last:border-r-0
                  `}
                  onClick={() => handleDateClick(date)}
                >
                  <div className="flex flex-col h-full">
                    {/* Date Number */}
                    <div
                      className={`
                      text-lg font-bold mb-2 transition-colors
                      ${
                        !isCurrentMonthDay
                          ? "text-slate-400 dark:text-slate-500"
                          : "text-slate-700 dark:text-slate-200"
                      }
                      ${isTodayDate ? "text-blue-600 dark:text-blue-400" : ""}
                    `}
                    >
                      <div
                        className={`
                        inline-flex items-center justify-center w-8 h-8 rounded-full
                        ${isTodayDate ? "bg-blue-500 text-white shadow-lg" : ""}
                      `}
                      >
                        {date.getDate()}
                      </div>
                    </div>

                    {/* Session Card or Add Button */}
                    <div className="flex-1 flex flex-col justify-between">
                      {existingSession ? (
                        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white p-3 rounded-xl shadow-md hover:shadow-lg transition-all group-hover:scale-105">
                          <div className="font-semibold text-sm truncate mb-1">
                            {existingSession.title}
                          </div>
                          <div className="text-xs opacity-90 truncate">
                            Click to open
                          </div>
                        </div>
                      ) : isCurrentMonthDay ? (
                        <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center">
                          <div className="bg-blue-500 hover:bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg">
                            <Plus className="h-4 w-4" />
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modern Legend */}
        <div className="mt-8 flex justify-center">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-8 text-sm">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full shadow-sm"></div>
                <span className="text-slate-600 dark:text-slate-300 font-medium">
                  Trading Session
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-blue-500 rounded-full shadow-sm"></div>
                <span className="text-slate-600 dark:text-slate-300 font-medium">
                  Today
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-blue-300 rounded-full"></div>
                <span className="text-slate-600 dark:text-slate-300 font-medium">
                  Available Date
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Create Session Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-[500px] bg-white dark:bg-slate-800 border-0 shadow-2xl">
          <DialogHeader className="pb-6">
            <DialogTitle className="flex items-center gap-3 text-2xl font-bold">
              <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-2 rounded-xl">
                <CalendarDays className="h-6 w-6 text-white" />
              </div>
              Create Trading Session
            </DialogTitle>
            <DialogDescription className="text-lg text-slate-600 dark:text-slate-300">
              Set up a new trading session for{" "}
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {selectedDate?.toLocaleDateString()}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-6">
            {error && (
              <Alert
                variant="destructive"
                className="border-red-200 bg-red-50 dark:bg-red-900/20"
              >
                <AlertCircle className="h-5 w-5" />
                <AlertDescription className="text-base">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <div className="grid gap-3">
              <Label
                htmlFor="title"
                className="text-base font-semibold text-slate-700 dark:text-slate-200"
              >
                Session Title
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a descriptive title for your session"
                className="text-base p-4 border-2 focus:border-blue-500 rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="gap-3 pt-6">
            <Button
              variant="outline"
              onClick={handleDialogClose}
              className="px-6 py-3 text-base border-2 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={createSession}
              disabled={creating}
              className="px-6 py-3 text-base bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-xl shadow-lg"
            >
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Creating Session...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-5 w-5" />
                  Create Session
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
