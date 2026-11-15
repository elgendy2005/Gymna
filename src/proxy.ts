import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const handleI18n = createMiddleware(routing);

const PROTECTED =
  /^\/(ar|en)\/(today|dashboard|onboarding|plan|workout|exercises|progress|settings)(\/|$)/;
const AUTH_PAGES = /^\/(ar|en)\/(login|signup)(\/|$)/;

const SESSION_COOKIES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
];

// Optimistic check only: it looks at whether a session cookie exists so
// signed-out visitors skip a wasted render. Real authorization happens on the
// server in `requireUser()` and inside every server action.
export default function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const hasSession = SESSION_COOKIES.some((name) => request.cookies.has(name));

  // A server function call is a POST to the page it is used on. Each one
  // checks the session itself and answers "unauthorized", which the screen
  // shows; redirecting the call instead leaves the tap with no answer at all.
  const isServerFunction = request.method === "POST" && request.headers.has("next-action");

  const protectedMatch = pathname.match(PROTECTED);
  if (protectedMatch && !hasSession && !isServerFunction) {
    const url = request.nextUrl.clone();
    url.pathname = `/${protectedMatch[1]}/login`;
    url.search = "";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // `expired` is set by the server when the cookie exists but is not valid,
  // which would otherwise bounce between the two redirects.
  const authMatch = pathname.match(AUTH_PAGES);
  if (authMatch && hasSession && !searchParams.has("expired")) {
    const url = request.nextUrl.clone();
    url.pathname = `/${authMatch[1]}/today`;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return handleI18n(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
