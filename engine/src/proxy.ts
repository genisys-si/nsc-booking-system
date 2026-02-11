import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  async function proxy(req) {  
    const token = req.nextauth.token;

    if (!token) {
      return NextResponse.redirect(new URL("/auth/signin", req.url));
    }

    const pathname = req.nextUrl.pathname;

    if (pathname.startsWith("/dashboard")) {
      if (token.role === "user") {
        return NextResponse.redirect(new URL("/", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ["/dashboard/:path*"],
};