import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { confirmSessionUser, type SessionUser } from "@/lib/session-user";
import { auth } from "@/server/auth";
import { db } from "@/server/db";

export type { SessionUser };

/**
 * The signed-in user, or null. Deduplicated within one request.
 * Returns null when the cookie is valid but the account behind it was
 * deleted; `requireUser` then sends the browser to the login page, where the
 * proxy clears the stale cookie.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  // Auth.js draws random values while it sets up, before it touches the
  // request. Declaring the request dependency first keeps that work out of
  // the prerendered shell.
  await connection();
  const session = await auth();
  return confirmSessionUser(session?.user, (id) =>
    db.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, image: true },
    }),
  );
});

/**
 * The signed-in user, or a redirect to login. This is the authorization
 * check for pages; the proxy only does an optimistic cookie check.
 */
export async function requireUser(locale: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`/${locale}/login?expired=1`);
  return user;
}
