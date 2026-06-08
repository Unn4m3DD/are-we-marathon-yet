"use client";

import * as React from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, getDefaultClassNames } from "react-day-picker";
import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  const defaultClassNames = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        root: cn(defaultClassNames.root),
        months: "flex flex-col gap-4",
        month: "space-y-4",
        month_caption: "relative flex items-center justify-center",
        caption_label: "text-sm font-medium",
        nav: "absolute inset-x-0 top-0 flex items-center justify-between",
        button_previous: cn(
          "inline-flex h-7 w-7 items-center justify-center rounded-md border border-zinc-300 bg-white text-zinc-700 opacity-70 shadow-sm transition-colors hover:bg-zinc-100 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 disabled:pointer-events-none disabled:opacity-30 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800",
          defaultClassNames.button_previous
        ),
        button_next: cn(
          "inline-flex h-7 w-7 items-center justify-center rounded-md border border-zinc-300 bg-white text-zinc-700 opacity-70 shadow-sm transition-colors hover:bg-zinc-100 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 disabled:pointer-events-none disabled:opacity-30 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800",
          defaultClassNames.button_next
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday:
          "w-9 rounded-md text-[0.8rem] font-normal text-zinc-500 dark:text-zinc-400",
        week: "mt-2 flex w-full",
        day: cn("relative h-9 w-9 p-0 text-center text-sm", defaultClassNames.day),
        day_button:
          "h-9 w-9 rounded-md p-0 font-normal transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 dark:hover:bg-zinc-800",
        today: "text-cyan-700 dark:text-cyan-300",
        selected:
          "rounded-md bg-cyan-600 text-white hover:bg-cyan-600 hover:text-white focus:bg-cyan-600 focus:text-white dark:bg-cyan-500 dark:text-zinc-950",
        outside: "text-zinc-400 opacity-50 dark:text-zinc-600",
        disabled: "text-zinc-400 opacity-50 dark:text-zinc-600",
        hidden: "invisible",
        chevron: "h-4 w-4",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className, ...props }) => {
          if (orientation === "left") {
            return <ChevronLeft className={cn("h-4 w-4", className)} {...props} />;
          }

          if (orientation === "right") {
            return <ChevronRight className={cn("h-4 w-4", className)} {...props} />;
          }

          return <ChevronDown className={cn("h-4 w-4", className)} {...props} />;
        },
      }}
      {...props}
    />
  );
}
