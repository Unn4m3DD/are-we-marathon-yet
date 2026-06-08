import { redirect } from "next/navigation";
import { UserShell } from "@/components/user-shell";
import { uuidV4Schema } from "@/lib/training-schema";

export default async function UserLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ userId: string }>;
}) {
  const { userId: rawUserId } = await params;
  const parsed = uuidV4Schema.safeParse(rawUserId);

  if (!parsed.success) {
    redirect("/");
  }

  return <UserShell userId={parsed.data}>{children}</UserShell>;
}
