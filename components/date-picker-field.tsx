"use client";

import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import {
  formatIsoDate,
  formatReadableDate,
  parseIsoDate,
} from "@/lib/dates";
import { cn } from "@/lib/utils";

function calendarDateToIso(date: Date) {
  return formatIsoDate(
    new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0)
    )
  );
}

export function DatePickerField({
  id,
  name = "date",
  defaultValue,
}: {
  id?: string;
  name?: string;
  defaultValue: string;
}) {
  const [date, setDate] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const selectedDate = parseIsoDate(date);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <input type="hidden" name={name} value={date} />
      <PopoverAnchor asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-start px-3 text-left font-normal",
            !date && "text-zinc-500 dark:text-zinc-400"
          )}
          onClick={() => setOpen((current) => !current)}
        >
          <CalendarIcon className="h-4 w-4" />
          {date ? formatReadableDate(date) : "Pick a date"}
        </Button>
      </PopoverAnchor>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selectedDate}
          defaultMonth={selectedDate}
          onSelect={(nextDate) => {
            if (nextDate) {
              setDate(calendarDateToIso(nextDate));
              setOpen(false);
            }
          }}
          required
        />
      </PopoverContent>
    </Popover>
  );
}
