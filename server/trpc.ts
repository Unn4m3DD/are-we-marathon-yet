import { initTRPC, TRPCError } from "@trpc/server";
import { uuidV4Schema } from "@/lib/training-schema";

export type TRPCContext = {
  userId: string | null;
};

function cookieValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) {
    return null;
  }

  const match = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));

  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

export async function createTRPCContext({ req }: { req: Request }): Promise<TRPCContext> {
  const rawUserId =
    req.headers.get("x-user-id") ?? cookieValue(req.headers.get("cookie"), "awm_user_id");
  const parsed = uuidV4Schema.safeParse(rawUserId);

  return {
    userId: parsed.success ? parsed.data : null,
  };
}

const t = initTRPC.context<TRPCContext>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "A valid user UUID is required.",
    });
  }

  return next({
    ctx: {
      userId: ctx.userId,
    },
  });
});
