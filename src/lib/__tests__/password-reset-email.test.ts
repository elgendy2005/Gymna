import { describe, expect, it } from "vitest";
import { renderPasswordResetEmail } from "@/lib/email/password-reset-email";

const LINK = "https://gymna.example/ar/reset-password?token=abc_DEF-123";

describe("renderPasswordResetEmail", () => {
  it("renders Arabic right-to-left", () => {
    const email = renderPasswordResetEmail("ar", LINK);
    expect(email.subject).toContain("كلمة مرور");
    expect(email.html).toContain('<html lang="ar" dir="rtl">');
    expect(email.html).toContain('dir="rtl"');
    expect(email.html).toContain(`href="${LINK}"`);
    expect(email.text).toContain(LINK);
    expect(email.text).toContain("ساعة");
  });

  it("renders English left-to-right", () => {
    const email = renderPasswordResetEmail("en", LINK);
    expect(email.subject).toBe("Reset your Gymna password");
    expect(email.html).toContain('<html lang="en" dir="ltr">');
    expect(email.text).toContain("expires in 1 hour");
  });

  it("escapes the link in HTML", () => {
    const email = renderPasswordResetEmail("en", 'https://x.example/?a=1&b="2"');
    expect(email.html).toContain("a=1&amp;b=&quot;2&quot;");
    expect(email.html).not.toContain('b="2"');
  });
});
