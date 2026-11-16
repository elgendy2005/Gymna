export type SessionUser = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
};

type SessionClaim = { id?: string | null; email?: string | null } | null | undefined;

type UserRow = { id: string; name: string | null; email: string | null; image: string | null };

/**
 * Turns the user claimed by a session cookie into the signed-in user, but
 * only if that user still exists. A JWT session outlives a deleted account,
 * so the cookie alone is not proof. The row's values win over the cookie's,
 * which may be up to a month old.
 */
export async function confirmSessionUser(
  claim: SessionClaim,
  findUser: (id: string) => Promise<UserRow | null>,
): Promise<SessionUser | null> {
  if (!claim?.id) return null;
  const row = await findUser(claim.id);
  if (!row?.email) return null;
  return { id: row.id, name: row.name, email: row.email, image: row.image };
}
