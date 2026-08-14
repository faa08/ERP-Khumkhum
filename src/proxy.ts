import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Daftar route publik yang bisa diakses tanpa login
const publicRoutes = ['/', '/login', '/forgot-password', '/reset-password'];

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  // Mengabaikan asset publik, file static, dan API (API dilindungi secara terpisah jika diperlukan)
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const isPublicRoute = publicRoutes.some((route) => pathname === route || pathname.startsWith(route + '/'));
  
  // Ambil token JWT dari custom session cookie IKM
  const token = req.cookies.get('erp_session')?.value;

  // Jika tidak ada token dan mencoba mengakses route non-publik
  if (!token && !isPublicRoute) {
    const url = new URL('/login', req.url);
    // Simpan url asal untuk redirect kembali setelah login (opsional)
    url.searchParams.set('callbackUrl', encodeURI(pathname));
    return NextResponse.redirect(url);
  }

  // Jika sudah login tapi mencoba mengakses halaman login/register
  if (token && (pathname === '/login' || pathname === '/forgot-password' || pathname === '/reset-password')) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
