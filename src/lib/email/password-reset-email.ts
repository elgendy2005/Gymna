/**
 * The password reset email, in Arabic and English. Plain inline-styled HTML
 * (email clients ignore stylesheets) with `dir` set on the document and the
 * content, plus a plain-text part for clients that do not show HTML.
 */

type Copy = {
  subject: string;
  heading: string;
  intro: string;
  button: string;
  fallback: string;
  expiry: string;
  ignore: string;
  signoff: string;
};

const COPY: Record<"ar" | "en", Copy> = {
  en: {
    subject: "Reset your Gymna password",
    heading: "Reset your password",
    intro: "We received a request to reset the password for your Gymna account.",
    button: "Choose a new password",
    fallback: "If the button does not work, copy this link into your browser:",
    expiry: "The link works once and expires in 1 hour.",
    ignore: "If you did not ask for this, you can ignore this email. Your password stays the same.",
    signoff: "The Gymna team",
  },
  ar: {
    subject: "إعادة تعيين كلمة مرور Gymna",
    heading: "إعادة تعيين كلمة المرور",
    intro: "وصلنا طلب لإعادة تعيين كلمة المرور لحسابك في Gymna.",
    button: "اختر كلمة مرور جديدة",
    fallback: "إذا لم يعمل الزر، انسخ هذا الرابط في المتصفح:",
    expiry: "يعمل الرابط مرة واحدة وتنتهي صلاحيته خلال ساعة.",
    ignore: "إذا لم تطلب ذلك، تجاهل هذه الرسالة. ستبقى كلمة مرورك كما هي.",
    signoff: "فريق Gymna",
  },
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type RenderedEmail = { subject: string; html: string; text: string };

export function renderPasswordResetEmail(locale: string, link: string): RenderedEmail {
  const lang = locale === "en" ? "en" : "ar";
  const copy = COPY[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";
  const align = dir === "rtl" ? "right" : "left";
  const href = escapeHtml(link);
  const font =
    lang === "ar"
      ? "Tahoma, 'Segoe UI', Arial, sans-serif"
      : "-apple-system, 'Segoe UI', Roboto, Arial, sans-serif";

  const html = `<!doctype html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>${escapeHtml(copy.subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f3f5f7;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f5f7;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" dir="${dir}" style="max-width:480px;background:#ffffff;border-radius:16px;font-family:${font};color:#1a1f24;text-align:${align};">
<tr><td style="padding:32px 28px;">
<p style="margin:0 0 24px;font-size:20px;font-weight:700;color:#0f7a55;">Gymna</p>
<h1 style="margin:0 0 12px;font-size:22px;line-height:1.4;">${escapeHtml(copy.heading)}</h1>
<p style="margin:0 0 24px;font-size:16px;line-height:1.7;">${escapeHtml(copy.intro)}</p>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:12px;background:#0f7a55;">
<a href="${href}" style="display:inline-block;padding:14px 24px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;">${escapeHtml(copy.button)}</a>
</td></tr></table>
<p style="margin:24px 0 8px;font-size:14px;line-height:1.7;color:#4a5560;">${escapeHtml(copy.fallback)}</p>
<p dir="ltr" style="margin:0 0 24px;font-size:13px;line-height:1.6;word-break:break-all;text-align:left;"><a href="${href}" style="color:#0f7a55;">${href}</a></p>
<p style="margin:0 0 8px;font-size:14px;line-height:1.7;color:#4a5560;">${escapeHtml(copy.expiry)}</p>
<p style="margin:0 0 24px;font-size:14px;line-height:1.7;color:#4a5560;">${escapeHtml(copy.ignore)}</p>
<p style="margin:0;font-size:14px;color:#4a5560;">${escapeHtml(copy.signoff)}</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    copy.heading,
    "",
    copy.intro,
    "",
    `${copy.button}:`,
    link,
    "",
    copy.expiry,
    copy.ignore,
    "",
    copy.signoff,
  ].join("\n");

  return { subject: copy.subject, html, text };
}
