"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ toastOptions, ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4 text-cyan-700 dark:text-cyan-200" />,
        info: <InfoIcon className="size-4 text-cyan-700 dark:text-cyan-200" />,
        warning: <TriangleAlertIcon className="size-4 text-amber-600 dark:text-amber-300" />,
        error: <OctagonXIcon className="size-4 text-red-600 dark:text-red-400" />,
        loading: <Loader2Icon className="size-4 animate-spin text-cyan-700 dark:text-cyan-200" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        ...toastOptions,
        style: {
          backgroundColor: "var(--popover)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          color: "var(--popover-foreground)",
          boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
          ...toastOptions?.style,
        },
        classNames: {
          toast:
            "!rounded-md !border !border-zinc-200 !bg-white !px-4 !py-3 !text-zinc-950 !shadow-sm dark:!border-zinc-800 dark:!bg-zinc-950 dark:!text-zinc-50",
          title: "!text-sm !font-semibold !text-zinc-950 dark:!text-zinc-50",
          description: "!text-sm !text-zinc-600 dark:!text-zinc-400",
          closeButton:
            "!border-zinc-300 !bg-white !text-zinc-500 hover:!text-zinc-950 dark:!border-zinc-700 dark:!bg-zinc-900 dark:!text-zinc-400 dark:hover:!text-zinc-50",
          icon: "!mr-1",
          ...toastOptions?.classNames,
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
