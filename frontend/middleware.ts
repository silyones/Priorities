import { NextResponse, type NextRequest } from "next/server";
import { MP_SESSION_COOKIE, verifySessionToken } from "@/lib/server/session";

const PROTECTED_PREFIXES = ["/dashboard", "/mp", "/showcase", "/insights", "/issues"];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get(MP_SESSION_COOKIE)?.value;
  const session = sessionToken ? await verifySessionToken(sessionToken) : null;

  if (pathname === "/" && session) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (isProtectedPath(pathname) && !session) {
    const loginUrl = new URL("/", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/mp/:path*", "/showcase/:path*", "/insights/:path*", "/issues/:path*"],
};
