import { describe, expect, it, vi } from "vitest";
import { hashResetToken } from "@/lib/password-reset";
import {
  requestPasswordReset,
  resetPassword,
  type RequestDeps,
  type ResetEmail,
} from "@/lib/password-reset-flow";
import type { RateLimitStore } from "@/lib/rate-limit";
import { memoryStore } from "./helpers/memory-store";

function memoryRateLimits(): RateLimitStore {
  const rows: { key: string; expires: Date }[] = [];
  return {
    async count(key, now) {
      return rows.filter((row) => row.key === key && row.expires > now).length;
    },
    async add(key, expires) {
      rows.push({ key, expires });
    },
  };
}

const KNOWN = "sara@example.com";
const T0 = new Date("2026-11-17T10:00:00Z");

function setup(overrides: Partial<RequestDeps> = {}) {
  const tokens = memoryStore();
  const sent: ResetEmail[] = [];
  const tasks: (() => Promise<void>)[] = [];
  const deps: RequestDeps = {
    rateLimits: memoryRateLimits(),
    tokens,
    findUser: async (email) => (email === KNOWN ? { email } : null),
    sendEmail: async (email) => {
      sent.push(email);
    },
    defer: (task) => tasks.push(task),
    linkBase: "https://gymna.example",
    now: T0,
    ...overrides,
  };
  const flush = async () => {
    while (tasks.length) await tasks.shift()!();
  };
  return { deps, tokens, sent, tasks, flush };
}

const ctx = { ip: "203.0.113.7", locale: "en" };

describe("requestPasswordReset", () => {
  it("answers the same for a known and an unknown email", async () => {
    const { deps, flush } = setup();
    const known = await requestPasswordReset({ email: KNOWN }, ctx, deps);
    const unknown = await requestPasswordReset({ email: "nobody@example.com" }, ctx, deps);
    expect(known).toEqual({ ok: true });
    expect(unknown).toEqual(known);
    await flush();
  });

  it("does the account lookup only after answering", async () => {
    const findUser = vi.fn(async () => null);
    const { deps, tasks } = setup({ findUser });
    await requestPasswordReset({ email: "nobody@example.com" }, ctx, deps);
    expect(findUser).not.toHaveBeenCalled();
    expect(tasks).toHaveLength(1);
  });

  it("emails a link only when the account exists", async () => {
    const { deps, sent, tokens, flush } = setup();
    await requestPasswordReset({ email: "nobody@example.com" }, ctx, deps);
    await flush();
    expect(sent).toHaveLength(0);
    expect(tokens.rows).toHaveLength(0);

    await requestPasswordReset({ email: "  Sara@Example.com " }, { ...ctx, locale: "ar" }, deps);
    await flush();
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe(KNOWN);
    expect(sent[0].locale).toBe("ar");

    const token = new URL(sent[0].link).searchParams.get("token")!;
    expect(sent[0].link).toBe(`https://gymna.example/ar/reset-password?token=${token}`);
    expect(tokens.rows).toEqual([
      expect.objectContaining({ identifier: `password-reset:${KNOWN}`, token: hashResetToken(token) }),
    ]);
  });

  it("still answers neutrally when sending fails, without logging the link", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { deps, flush } = setup({
      sendEmail: async () => {
        throw new Error("Resend answered 500");
      },
    });
    expect(await requestPasswordReset({ email: KNOWN }, ctx, deps)).toEqual({ ok: true });
    await flush();
    const logged = JSON.stringify(error.mock.calls);
    expect(logged).not.toContain("token=");
    error.mockRestore();
  });

  it("refuses a malformed email", async () => {
    const { deps, tasks } = setup();
    expect(await requestPasswordReset({ email: "not-an-email" }, ctx, deps)).toEqual({
      ok: false,
      error: "invalid_input",
    });
    expect(tasks).toHaveLength(0);
  });

  it("allows 3 requests per email per hour, known or not", async () => {
    for (const email of [KNOWN, "nobody@example.com"]) {
      const { deps } = setup();
      for (let i = 0; i < 3; i++) {
        expect(await requestPasswordReset({ email }, { ...ctx, ip: `10.0.0.${i}` }, deps)).toEqual({
          ok: true,
        });
      }
      expect(await requestPasswordReset({ email }, { ...ctx, ip: "10.0.0.9" }, deps)).toEqual({
        ok: false,
        error: "rate_limited",
      });
      // An hour later the window has passed.
      deps.now = new Date(T0.getTime() + 60 * 60 * 1000);
      expect((await requestPasswordReset({ email }, ctx, deps)).ok).toBe(true);
    }
  });

  it("allows 10 requests per IP per hour across emails", async () => {
    const { deps } = setup();
    for (let i = 0; i < 10; i++) {
      expect((await requestPasswordReset({ email: `u${i}@example.com` }, ctx, deps)).ok).toBe(true);
    }
    expect(await requestPasswordReset({ email: "u99@example.com" }, ctx, deps)).toEqual({
      ok: false,
      error: "rate_limited",
    });
    expect(
      (await requestPasswordReset({ email: "u99@example.com" }, { ...ctx, ip: "198.51.100.1" }, deps)).ok,
    ).toBe(true);
  });

  it("does not count refused requests against the email", async () => {
    const { deps } = setup();
    for (let i = 0; i < 10; i++) {
      await requestPasswordReset({ email: `u${i}@example.com` }, ctx, deps);
    }
    // Refused by the IP limit; the email's own count stays at zero.
    for (let i = 0; i < 5; i++) {
      await requestPasswordReset({ email: KNOWN }, ctx, deps);
    }
    expect((await requestPasswordReset({ email: KNOWN }, { ...ctx, ip: "198.51.100.1" }, deps)).ok).toBe(
      true,
    );
  });
});

describe("resetPassword", () => {
  async function issued() {
    const { deps, sent, tokens, flush } = setup();
    await requestPasswordReset({ email: KNOWN }, ctx, deps);
    await flush();
    const token = new URL(sent[0].link).searchParams.get("token")!;
    const setPassword = vi.fn(async () => true);
    const resetDeps = {
      tokens,
      hashPassword: async (password: string) => `hashed(${password})`,
      setPassword,
      now: T0,
    };
    return { token, resetDeps, setPassword };
  }

  const good = { password: "newpass123", confirm: "newpass123" };

  it("sets the hashed password once, then refuses the same link", async () => {
    const { token, resetDeps, setPassword } = await issued();
    expect(await resetPassword(token, good, resetDeps)).toEqual({ ok: true });
    expect(setPassword).toHaveBeenCalledWith(KNOWN, "hashed(newpass123)");
    expect(await resetPassword(token, good, resetDeps)).toEqual({
      ok: false,
      error: "token_used",
    });
    expect(setPassword).toHaveBeenCalledTimes(1);
  });

  it("refuses an expired link", async () => {
    const { token, resetDeps, setPassword } = await issued();
    const now = new Date(T0.getTime() + 61 * 60 * 1000);
    expect(await resetPassword(token, good, { ...resetDeps, now })).toEqual({
      ok: false,
      error: "token_expired",
    });
    expect(setPassword).not.toHaveBeenCalled();
  });

  it("refuses an unknown link", async () => {
    const { resetDeps } = await issued();
    expect(await resetPassword("x".repeat(43), good, resetDeps)).toEqual({
      ok: false,
      error: "token_invalid",
    });
  });

  it("applies the signup password rules and the confirmation", async () => {
    const { token, resetDeps, setPassword } = await issued();
    for (const input of [
      { password: "short1", confirm: "short1" },
      { password: "onlyletters", confirm: "onlyletters" },
      { password: "12345678", confirm: "12345678" },
      { password: "newpass123", confirm: "newpass124" },
    ]) {
      expect(await resetPassword(token, input, resetDeps)).toEqual({
        ok: false,
        error: "invalid_input",
      });
    }
    expect(setPassword).not.toHaveBeenCalled();
    // The link was not used up by the refused attempts.
    expect((await resetPassword(token, good, resetDeps)).ok).toBe(true);
  });
});
