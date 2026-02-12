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

// Color mapping for routine cards - left accent bar style
const colorMap: Record<
  string,
  { bg: string; accent: string; text: string; time: string }
> = {
  emerald: {
    accent: "border-l-emerald-400 dark:border-l-emerald-500",
    bg: "bg-emerald-50/70 dark:bg-emerald-950/25",
    text: "text-emerald-800 dark:text-emerald-200",
    time: "text-emerald-500/60 dark:text-emerald-400/50",
  },
  amber: {
    accent: "border-l-amber-400 dark:border-l-amber-500",
    bg: "bg-amber-50/70 dark:bg-amber-950/25",
    text: "text-amber-800 dark:text-amber-200",
    time: "text-amber-500/60 dark:text-amber-400/50",
  },
  rose: {
    accent: "border-l-rose-400 dark:border-l-rose-500",
    bg: "bg-rose-50/70 dark:bg-rose-950/25",
    text: "text-rose-800 dark:text-rose-200",
    time: "text-rose-500/60 dark:text-rose-400/50",
  },
  blue: {
    accent: "border-l-blue-400 dark:border-l-blue-500",
    bg: "bg-blue-50/70 dark:bg-blue-950/25",
    text: "text-blue-800 dark:text-blue-200",
    time: "text-blue-500/60 dark:text-blue-400/50",
  },
  purple: {
    accent: "border-l-purple-400 dark:border-l-purple-500",
    bg: "bg-purple-50/70 dark:bg-purple-950/25",
    text: "text-purple-800 dark:text-purple-200",
    time: "text-purple-500/60 dark:text-purple-400/50",
  },
  slate: {
    accent: "border-l-slate-300 dark:border-l-slate-600",
    bg: "bg-slate-50/70 dark:bg-slate-800/25",
    text: "text-slate-700 dark:text-slate-200",
    time: "text-slate-400 dark:text-slate-500",
  },
};

type ColorScheme = { bg: string; accent: string; text: string; time: string };

const defaultColors: ColorScheme = {
  accent: "border-l-slate-300 dark:border-l-slate-600",
  bg: "bg-slate-50/70 dark:bg-slate-800/25",
  text: "text-slate-700 dark:text-slate-200",
  time: "text-slate-400 dark:text-slate-500",
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
    <div className="grid grid-cols-7 gap-2">
      {DAYS.map((day, dayIndex) => {
        const isToday = dayIndex === today;

        return (
          <div
            key={day}
            className="flex min-h-44 flex-col rounded-xl border p-2.5"
          >
            {/* Day header */}
            <div className="mb-2.5 flex items-center justify-between">
              <span
                className={cn(
                  "text-xs font-medium tracking-wider uppercase",
                  isToday
                    ? "text-pink-600 dark:text-pink-400"
                    : "text-muted-foreground",
                )}
              >
                {day}
              </span>
              {isToday && (
                <span className="rounded-full bg-pink-100 px-1.5 py-px text-[9px] font-semibold tracking-wide text-pink-600 uppercase dark:bg-pink-950/50 dark:text-pink-400">
                  today
                </span>
              )}
            </div>

            {/* Routine cards for this day */}
            <div className="flex flex-col gap-1.5">
              {routinesByDay[dayIndex]?.map((routine) => {
                const colors = getColors(routine.color);

                return (
                  <HoverCard key={`${routine._id}-${dayIndex}`} openDelay={200}>
                    <HoverCardTrigger asChild>
                      <div
                        className={cn(
                          "cursor-pointer rounded-r-md border-l-[3px] py-1.5 pr-2 pl-2.5",
                          colors.accent,
                          colors.bg,
                        )}
                      >
                        <p
                          className={cn(
                            "truncate text-[13px] leading-snug font-medium",
                            colors.text,
                          )}
                        >
                          {routine.title}
                        </p>
                        <p className={cn("mt-0.5 text-[11px]", colors.time)}>
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
    <div className="grid grid-cols-7 gap-2">
      {DAYS.map((day) => (
        <div
          key={day}
          className="flex min-h-44 flex-col rounded-xl border p-2.5"
        >
          <Skeleton className="mx-auto mb-2.5 h-4 w-8" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-11 w-full rounded-md" />
            <Skeleton className="h-11 w-full rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
};
