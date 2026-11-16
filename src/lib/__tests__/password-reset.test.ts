import { describe, expect, it } from "vitest";
import {
  RESET_TOKEN_TTL_MS,
  checkResetToken,
  consumeResetToken,
  createResetToken,
  generateResetToken,
  hashResetToken,
} from "@/lib/password-reset";
import { memoryStore } from "./helpers/memory-store";

const EMAIL = "sara@example.com";
const T0 = new Date("2026-11-17T10:00:00Z");
const later = (ms: number) => new Date(T0.getTime() + ms);

describe("generateResetToken", () => {
  it("is 32 random bytes, URL-safe", () => {
    const token = generateResetToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(Buffer.from(token, "base64url")).toHaveLength(32);
    expect(generateResetToken()).not.toBe(token);
  });

  it("hashes to a stable SHA-256 hex digest", () => {
    expect(hashResetToken("abc")).toBe(hashResetToken("abc"));
    expect(hashResetToken("abc")).toMatch(/^[0-9a-f]{64}$/);
    expect(hashResetToken("abc")).not.toBe(hashResetToken("abd"));
  });
});

describe("createResetToken", () => {
  it("stores only the hash, never the raw token", async () => {
    const store = memoryStore();
    const token = await createResetToken(store, EMAIL, T0);

    expect(store.rows).toHaveLength(1);
    const [row] = store.rows;
    expect(row.token).toBe(hashResetToken(token));
    expect(JSON.stringify(store.rows)).not.toContain(token);
  });

  it("expires one hour after it is created", async () => {
    const store = memoryStore();
    await createResetToken(store, EMAIL, T0);
    expect(store.rows[0].expires).toEqual(later(RESET_TOKEN_TTL_MS));
  });

  it("invalidates the previous token for the same email", async () => {
    const store = memoryStore();
    const first = await createResetToken(store, EMAIL, T0);
    const second = await createResetToken(store, EMAIL, later(1000));

    expect(store.rows).toHaveLength(1);
    expect(await checkResetToken(store, first, later(2000))).toEqual({ status: "invalid" });
    expect(await checkResetToken(store, second, later(2000))).toEqual({
      status: "valid",
      email: EMAIL,
    });
  });

  it("leaves other emails' tokens alone", async () => {
    const store = memoryStore();
    const other = await createResetToken(store, "omar@example.com", T0);
    await createResetToken(store, EMAIL, T0);
    expect((await checkResetToken(store, other, T0)).status).toBe("valid");
  });
});

describe("consumeResetToken", () => {
  it("returns the email for a fresh token", async () => {
    const store = memoryStore();
    const token = await createResetToken(store, EMAIL, T0);
    expect(await consumeResetToken(store, token, later(59 * 60 * 1000))).toEqual({
      status: "valid",
      email: EMAIL,
    });
  });

  it("works only once", async () => {
    const store = memoryStore();
    const token = await createResetToken(store, EMAIL, T0);
    expect((await consumeResetToken(store, token, T0)).status).toBe("valid");
    expect(await consumeResetToken(store, token, T0)).toEqual({ status: "used" });
    expect(await checkResetToken(store, token, T0)).toEqual({ status: "used" });
  });

  it("allows only one of two simultaneous uses", async () => {
    const store = memoryStore();
    const token = await createResetToken(store, EMAIL, T0);
    const results = await Promise.all([
      consumeResetToken(store, token, T0),
      consumeResetToken(store, token, T0),
    ]);
    expect(results.filter((r) => r.status === "valid")).toHaveLength(1);
  });

  it("refuses an expired token", async () => {
    const store = memoryStore();
    const token = await createResetToken(store, EMAIL, T0);
    expect(await consumeResetToken(store, token, later(RESET_TOKEN_TTL_MS))).toEqual({
      status: "expired",
    });
    expect(store.rows[0].identifier).toBe(`password-reset:${EMAIL}`);
  });

  it("refuses unknown and malformed tokens", async () => {
    const store = memoryStore();
    await createResetToken(store, EMAIL, T0);
    for (const bad of [generateResetToken(), "", "short", null, 42, "x".repeat(200)]) {
      expect(await consumeResetToken(store, bad, T0)).toEqual({ status: "invalid" });
    }
  });

  it("refuses the hash itself used as a token", async () => {
    const store = memoryStore();
    await createResetToken(store, EMAIL, T0);
    expect(await consumeResetToken(store, store.rows[0].token, T0)).toEqual({
      status: "invalid",
    });
  });
});
