import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { completedWorkoutExists, exerciseExists } from "./server/route-exists";

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
export default async function proxy(request: NextRequest) {
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

  // `expired` is set by the server when the cookie exists but is not valid
  // (expired, tampered with, or its account was deleted). Without it the two
  // redirects would bounce; with it the stale cookie is cleared, which signs
  // the browser out.
  const authMatch = pathname.match(AUTH_PAGES);
  const expired = searchParams.has("expired");
  if (authMatch && hasSession && !expired) {
    const url = request.nextUrl.clone();
    url.pathname = `/${authMatch[1]}/today`;
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (hasSession && request.method === "GET" && (await isMissingPage(request))) {
    const url = request.nextUrl.clone();
    url.pathname = `/${pathname.split("/")[1]}/not-found`;
    url.search = "";
    // The catch-all route renders the translated not-found screen.
    return NextResponse.rewrite(url, { status: 404 });
  }

  const response = handleI18n(request);
  if (authMatch && expired) {
    // Long tokens are split into `<name>.0`, `<name>.1`, ...
    for (const { name } of request.cookies.getAll()) {
      if (SESSION_COOKIES.some((base) => name === base || name.startsWith(`${base}.`))) {
        // Browsers ignore a `__Secure-` cookie set without `Secure`, even
        // one that only clears it.
        response.cookies.set(name, "", {
          path: "/",
          maxAge: 0,
          secure: name.startsWith("__Secure-"),
          httpOnly: true,
          sameSite: "lax",
        });
      }
    }
  }
  return response;
}

const EXERCISE_PAGE = /^\/(?:ar|en)\/exercises\/([^/]+)\/?$/;
const WORKOUT_SUMMARY = /^\/(?:ar|en)\/workout\/([^/]+)\/done\/?$/;

/**
 * Whether the address names an exercise or a workout summary that does not
 * exist. The pages render inside Suspense, so by the time they could call
 * `notFound()` the response has already started with a 200; checking here
 * lets the response carry a real 404. Any doubt (a database error, an
 * unreadable token) falls through to the page, which still shows not-found.
 */
async function isMissingPage(request: NextRequest): Promise<boolean> {
  const { pathname } = request.nextUrl;
  const exercise = pathname.match(EXERCISE_PAGE);
  const workout = exercise ? null : pathname.match(WORKOUT_SUMMARY);
  if (!exercise && !workout) return false;

  try {
    if (exercise) return !(await exerciseExists(decodeURIComponent(exercise[1])));

    const token = await getToken({
      req: request,
      secret: process.env.AUTH_SECRET,
      secureCookie: request.nextUrl.protocol === "https:",
    });
    if (!token?.sub) return false;
    return !(await completedWorkoutExists(token.sub, decodeURIComponent(workout![1])));
  } catch {
    return false;
  }
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
