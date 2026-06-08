"use client";

import { KeyRound, PlusCircle } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uuidV4Schema } from "@/lib/training-schema";

export default function Home() {
  const router = useRouter();
  const [uuid, setUuid] = useState("");
  const [error, setError] = useState<string | null>(null);

  function completeLogin(value: string) {
    const parsed = uuidV4Schema.safeParse(value.trim());

    if (!parsed.success) {
      setError("Enter a valid UUIDv4.");
      return;
    }

    setError(null);
    window.localStorage.setItem("awm_user_id", parsed.data);
    document.cookie = `awm_user_id=${encodeURIComponent(parsed.data)}; path=/; SameSite=Lax; max-age=31536000`;
    router.push(`/u/${parsed.data}`);
  }

  function signUp() {
    const nextUuid = crypto.randomUUID();
    setUuid(nextUuid);
    completeLogin(nextUuid);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-10 dark:bg-zinc-950">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Are We Marathon Yet</CardTitle>
          <CardDescription>
            Use your UUID as the only sign-in secret for your marathon training plan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              completeLogin(uuid);
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="user-uuid">User UUID</Label>
              <Input
                id="user-uuid"
                name="marathon-user-uuid"
                type="password"
                autoComplete="current-password"
                inputMode="text"
                spellCheck={false}
                value={uuid}
                onChange={(event) => setUuid(event.target.value)}
                placeholder="xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx"
              />
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button type="submit">
                <KeyRound className="h-4 w-4" />
                Sign In
              </Button>
              <Button type="button" variant="secondary" onClick={signUp}>
                <PlusCircle className="h-4 w-4" />
                Sign Up
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
