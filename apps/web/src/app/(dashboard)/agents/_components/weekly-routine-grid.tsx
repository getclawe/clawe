"use client";

import { useQuery } from "convex/react";
import { api } from "@clawe/backend";
import { cn } from "@clawe/ui/lib/utils";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@clawe/ui/components/hover-card";
import { Skeleton } from "@clawe/ui/components/skeleton";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Color mapping for routine cards - subtle, muted colors
const colorMap: Record<
  string,
  { bg: string; border: string; text: string; time: string }
> = {
  emerald: {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-emerald-200 dark:border-emerald-800",
    text: "text-emerald-700 dark:text-emerald-300",
    time: "text-emerald-600/70 dark:text-emerald-400/70",
  },
  amber: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-200 dark:border-amber-800",
    text: "text-amber-700 dark:text-amber-300",
    time: "text-amber-600/70 dark:text-amber-400/70",
  },
  rose: {
    bg: "bg-rose-50 dark:bg-rose-950/40",
    border: "border-rose-200 dark:border-rose-800",
    text: "text-rose-700 dark:text-rose-300",
    time: "text-rose-600/70 dark:text-rose-400/70",
  },
  blue: {
    bg: "bg-blue-50 dark:bg-blue-950/40",
    border: "border-blue-200 dark:border-blue-800",
    text: "text-blue-700 dark:text-blue-300",
    time: "text-blue-600/70 dark:text-blue-400/70",
  },
  purple: {
    bg: "bg-purple-50 dark:bg-purple-950/40",
    border: "border-purple-200 dark:border-purple-800",
    text: "text-purple-700 dark:text-purple-300",
    time: "text-purple-600/70 dark:text-purple-400/70",
  },
  slate: {
    bg: "bg-slate-100 dark:bg-slate-800/40",
    border: "border-slate-200 dark:border-slate-700",
    text: "text-slate-700 dark:text-slate-300",
    time: "text-slate-500 dark:text-slate-400",
  },
};

type ColorScheme = { bg: string; border: string; text: string; time: string };

const defaultColors: ColorScheme = {
  bg: "bg-slate-100 dark:bg-slate-800/40",
  border: "border-slate-200 dark:border-slate-700",
  text: "text-slate-700 dark:text-slate-300",
  time: "text-slate-500 dark:text-slate-400",
};

const getColors = (color: string): ColorScheme =>
  colorMap[color] ?? defaultColors;

// Format time for display (12-hour format)
const formatTime = (hour: number, minute: number): string => {
  const period = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 || 12;
  const m = minute.toString().padStart(2, "0");
  return `${h}:${m} ${period}`;
};

// Format schedule days for display
const formatScheduleDays = (daysOfWeek: number[]): string => {
  if (daysOfWeek.length === 7) return "Every day";
  if (daysOfWeek.length === 5 && daysOfWeek.every((d) => d >= 1 && d <= 5)) {
    return "Weekdays";
  }
  if (
    daysOfWeek.length === 2 &&
    daysOfWeek.includes(0) &&
    daysOfWeek.includes(6)
  ) {
    return "Weekends";
  }
  return daysOfWeek.map((d) => DAYS[d]).join(", ");
};

// Format priority for display
const formatPriority = (priority?: string): string => {
  if (!priority) return "Normal";
  return priority.charAt(0).toUpperCase() + priority.slice(1);
};

export const WeeklyRoutineGrid = () => {
  const routines = useQuery(api.routines.list, { enabledOnly: true });

  // Get current day of week (0 = Sunday, 6 = Saturday)
  const today = new Date().getDay();

  if (routines === undefined) {
    return <WeeklyRoutineGridSkeleton />;
  }

  // Group routines by day and sort by time
  const routinesByDay = DAYS.map((_, dayIndex) => {
    return routines
      .filter((r) => r.schedule.daysOfWeek.includes(dayIndex))
      .sort((a, b) => {
        if (a.schedule.hour !== b.schedule.hour) {
          return a.schedule.hour - b.schedule.hour;
        }
        return a.schedule.minute - b.schedule.minute;
      });
  });

  return (
    <div className="grid grid-cols-7 gap-3">
      {DAYS.map((day, dayIndex) => {
        const isToday = dayIndex === today;

        return (
          <div
            key={day}
            className={cn(
              "flex min-h-45 flex-col rounded-lg border p-3",
              isToday && "border-pink-600 dark:border-pink-400",
            )}
          >
            {/* Day header */}
            <div
              className={cn(
                "mb-3 text-center text-sm font-medium",
                isToday
                  ? "text-pink-600 dark:text-pink-400"
                  : "text-muted-foreground",
              )}
            >
              {day}
            </div>

            {/* Routine cards for this day */}
            <div className="flex flex-col gap-2">
              {routinesByDay[dayIndex]?.map((routine) => {
                const colors = getColors(routine.color);

                return (
                  <HoverCard key={`${routine._id}-${dayIndex}`} openDelay={200}>
                    <HoverCardTrigger asChild>
                      <div
                        className={`cursor-pointer rounded-md border px-2.5 py-2 ${colors.bg} ${colors.border}`}
                      >
                        <p
                          className={`truncate text-sm font-medium ${colors.text}`}
                        >
                          {routine.title}
                        </p>
                        <p className={`text-xs ${colors.time}`}>
                          {formatTime(
                            routine.schedule.hour,
                            routine.schedule.minute,
                          )}
                        </p>
                      </div>
                    </HoverCardTrigger>
                    <HoverCardContent
                      className="w-72"
                      side="right"
                      align="start"
                    >
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold">
                          {routine.title}
                        </h4>
                        {routine.description && (
                          <p className="text-muted-foreground text-sm">
                            {routine.description}
                          </p>
                        )}
                        <div className="text-muted-foreground flex flex-col gap-1 text-xs">
                          <div className="flex justify-between">
                            <span>Schedule</span>
                            <span className="text-foreground">
                              {formatScheduleDays(routine.schedule.daysOfWeek)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Time</span>
                            <span className="text-foreground">
                              {formatTime(
                                routine.schedule.hour,
                                routine.schedule.minute,
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Priority</span>
                            <span className="text-foreground">
                              {formatPriority(routine.priority)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const WeeklyRoutineGridSkeleton = () => {
  return (
    <div className="grid grid-cols-7 gap-3">
      {DAYS.map((day) => (
        <div key={day} className="flex min-h-45 flex-col rounded-lg border p-3">
          <Skeleton className="mx-auto mb-3 h-4 w-8" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-14 w-full rounded-md" />
            <Skeleton className="h-14 w-full rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
};
