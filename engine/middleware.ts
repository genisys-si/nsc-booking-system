import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyJwt } from '@/lib/jwt';

export function middleware(req: NextRequest) {
  // Echo the incoming Origin (if present) so we can allow credentials.
  const origin = req.headers.get('origin');

  const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept',
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin',
  };

  // If the request has an Origin header (browser), echo it back instead of using '*'
  if (origin) {
    corsHeaders['Access-Control-Allow-Origin'] = origin;
  } else {
    corsHeaders['Access-Control-Allow-Origin'] = '*';
  }

  // Fast reply to preflight
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: corsHeaders });
  }

  // If an Authorization Bearer JWT is present, verify it and forward user info
  const auth = req.headers.get('authorization') || req.headers.get('Authorization');
  if (auth && auth.toLowerCase().startsWith('bearer ')) {
    const token = auth.split(' ')[1];
    const secret = process.env.JWT_SECRET || '';
    if (secret) {
      const payload = verifyJwt(token, secret);
      if (payload) {
        // forward user info as header for API handlers
        const requestHeaders = new Headers(req.headers);
        try {
          requestHeaders.set('x-user', JSON.stringify({ id: payload.sub || payload.id, role: payload.role, email: payload.email }));
        } catch (e) {
          // ignore
        }
        const resWithUser = NextResponse.next({ request: { headers: requestHeaders } });
        Object.entries(corsHeaders).forEach(([k, v]) => resWithUser.headers.set(k, v));
        return resWithUser;
      }
    }
  }

  const res = NextResponse.next();
  Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

export const config = {
  matcher: '/api/:path*',
};
