export { default } from 'next-auth/middleware';

export const config = {
  matcher: ['/((?!api/auth|api/admin/init|api/admin/seed|login|_next|favicon.ico).*)']
};
