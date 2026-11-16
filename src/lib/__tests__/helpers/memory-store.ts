import type { ResetTokenStore, TokenRow } from "@/lib/password-reset";

/** An in-memory stand-in for the VerificationToken table. */
export function memoryStore(): ResetTokenStore & { rows: TokenRow[] } {
  const rows: TokenRow[] = [];
  return {
    rows,
    async deleteByIdentifier(identifier) {
      for (let i = rows.length - 1; i >= 0; i--) {
        if (rows[i].identifier === identifier) rows.splice(i, 1);
      }
    },
    async create(row) {
      rows.push({ ...row });
    },
    async findByHash(hash) {
      return rows.find((row) => row.token === hash) ?? null;
    },
    async claim(hash, from, to, now) {
      const row = rows.find(
        (r) => r.token === hash && r.identifier === from && r.expires > now,
      );
      if (!row) return false;
      row.identifier = to;
      return true;
    },
  };
}
