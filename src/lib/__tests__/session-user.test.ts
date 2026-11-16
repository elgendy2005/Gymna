import { describe, expect, it, vi } from "vitest";
import { confirmSessionUser } from "@/lib/session-user";

const row = { id: "u1", name: "Sara", email: "sara@example.com", image: null };

describe("confirmSessionUser", () => {
  it("returns null when there is no session", async () => {
    const find = vi.fn();
    expect(await confirmSessionUser(null, find)).toBeNull();
    expect(await confirmSessionUser({ email: "x@example.com" }, find)).toBeNull();
    expect(find).not.toHaveBeenCalled();
  });

  it("returns null when the account was deleted", async () => {
    const find = vi.fn().mockResolvedValue(null);
    expect(await confirmSessionUser({ id: "u1", email: "sara@example.com" }, find)).toBeNull();
    expect(find).toHaveBeenCalledWith("u1");
  });

  it("returns the stored user, not the cookie's copy", async () => {
    const find = vi.fn().mockResolvedValue({ ...row, name: "Sara A." });
    expect(await confirmSessionUser({ id: "u1", email: "old@example.com" }, find)).toEqual({
      ...row,
      name: "Sara A.",
    });
  });

  it("returns null for a row without an email", async () => {
    const find = vi.fn().mockResolvedValue({ ...row, email: null });
    expect(await confirmSessionUser({ id: "u1" }, find)).toBeNull();
  });
});
