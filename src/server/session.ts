import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth";

export type SessionUser = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
};

/** The signed-in user, or null. Deduplicated within one request. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || !user.email) return null;
  return {
    id: user.id,
    name: user.name ?? null,
    email: user.email,
    image: user.image ?? null,
  };
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
