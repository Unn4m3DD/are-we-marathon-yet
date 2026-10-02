"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DurationField({ id, defaultValue }: { id: string; defaultValue: number | null }) {
  const [hours, setHours] = useState(defaultValue == null ? "" : String(Math.floor(defaultValue / 60)));
  const [minutes, setMinutes] = useState(defaultValue == null ? "" : String(defaultValue % 60));
  const totalMinutes = hours === "" && minutes === "" ? "" : Number(hours || 0) * 60 + Number(minutes || 0);

  return (
    <div className="flex items-start gap-2">
      <input type="hidden" name="durationMin" value={totalMinutes} />
      <div className="min-w-0 flex-1 space-y-1">
        <Input
          id={id}
          type="number"
          inputMode="numeric"
          min="0"
          step="1"
          placeholder="0"
          value={hours}
          onChange={(event) => setHours(event.target.value)}
        />
        <Label htmlFor={id} className="text-xs text-zinc-500 dark:text-zinc-400">Hours</Label>
      </div>
      <span aria-hidden="true" className="pt-2 text-zinc-500">:</span>
      <div className="min-w-0 flex-1 space-y-1">
        <Input
          id={`${id}-minutes`}
          type="number"
          inputMode="numeric"
          min="0"
          max="59"
          step="any"
          placeholder="00"
          value={minutes}
          onChange={(event) => setMinutes(event.target.value)}
        />
        <Label htmlFor={`${id}-minutes`} className="text-xs text-zinc-500 dark:text-zinc-400">Minutes</Label>
      </div>
    </div>
  );
}
