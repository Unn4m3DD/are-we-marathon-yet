"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  defaultValue?: string;
  name?: string;
  children: React.ReactNode;
  className?: string;
}

interface SelectItemProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

const SelectContext = React.createContext<{
  value?: string;
  onValueChange?: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  selectedText?: string;
  setSelectedText?: (text: string) => void;
} | null>(null);

export function Select({ value, onValueChange, defaultValue, name, children, className }: SelectProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue || "");
  const [open, setOpen] = React.useState(false);
  const [selectedText, setSelectedText] = React.useState("");
  const controlledValue = value ?? internalValue;

  const handleValueChange = React.useCallback((newValue: string, text?: string) => {
    if (onValueChange) {
      onValueChange(newValue);
    } else {
      setInternalValue(newValue);
    }
    if (text) {
      setSelectedText(text);
    }
    setOpen(false);
  }, [onValueChange]);

  return (
    <SelectContext.Provider value={{ 
      value: controlledValue, 
      onValueChange: (val) => handleValueChange(val), 
      open, 
      setOpen,
      selectedText,
      setSelectedText
    }}>
      <div className={cn("relative", className)}>
        {name && <input type="hidden" name={name} value={controlledValue} />}
        {children}
      </div>
    </SelectContext.Provider>
  );
}

export function SelectTrigger({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const context = React.useContext(SelectContext);
  if (!context) throw new Error("SelectTrigger must be used within a Select");

  return (
    <button
      type="button"
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50",
        className
      )}
      onClick={() => context.setOpen(!context.open)}
      {...props}
    >
      <span className="truncate">{children}</span>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </button>
  );
}

export function SelectValue({ placeholder, className, children }: { placeholder?: string; className?: string; children?: React.ReactNode }) {
  const context = React.useContext(SelectContext);
  if (!context) throw new Error("SelectValue must be used within a Select");

  const displayText = children || context.selectedText || placeholder;

  return (
    <span className={cn("truncate", !context.value && "text-zinc-500 dark:text-zinc-400", className)}>
      {displayText}
    </span>
  );
}

export function SelectContent({ children, className }: { children: React.ReactNode; className?: string }) {
  const context = React.useContext(SelectContext);
  if (!context) throw new Error("SelectContent must be used within a Select");

  if (!context.open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={() => context.setOpen(false)} />
      <div className={cn(
        "absolute top-full z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-950",
        className
      )}>
        {children}
      </div>
    </>
  );
}

export function SelectItem({ value, children, className }: SelectItemProps) {
  const context = React.useContext(SelectContext);
  if (!context) throw new Error("SelectItem must be used within a Select");

  const isSelected = context.value === value;

  return (
    <button
      type="button"
      className={cn(
        "w-full px-3 py-2 text-left text-sm hover:bg-zinc-100 focus:bg-zinc-100 dark:hover:bg-zinc-800 dark:focus:bg-zinc-800",
        isSelected && "bg-cyan-50 text-cyan-900 dark:bg-cyan-950 dark:text-cyan-100",
        className
      )}
      onClick={() => {
        context.onValueChange?.(value);
        context.setSelectedText?.(typeof children === 'string' ? children : value);
      }}
    >
      {children}
    </button>
  );
}