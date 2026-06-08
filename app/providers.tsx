"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { useState, type ReactNode } from "react";
import { trpc } from "@/lib/trpc-client";

function userIdFromPath() {
  if (typeof window === "undefined") {
    return null;
  }

  const pathMatch = window.location.pathname.match(/^\/u\/([^/]+)/);
  const pathUserId = pathMatch?.[1] ? decodeURIComponent(pathMatch[1]) : null;

  return pathUserId ?? window.localStorage.getItem("awm_user_id");
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: "/api/trpc",
          headers() {
            const userId = userIdFromPath();

            return userId
              ? {
                  "x-user-id": userId,
                }
              : {};
          },
        }),
      ],
    }),
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
