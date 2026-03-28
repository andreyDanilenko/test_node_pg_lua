import { FastifyRequest, FastifyReply } from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
  }
}

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  // CORS preflight: must not run JWT (browser would see failed / hanging auth)
  if (request.method === 'OPTIONS') {
    return;
  }

  const path = request.url.split('?')[0] ?? request.url;
  const publicRoutes = ['/api/v1/auth/guest', '/health'];

  if (publicRoutes.some((route) => path === route || path.startsWith(`${route}/`))) {
    return;
  }
  
  try {
    await request.jwtVerify();
    request.userId = (request.user as any).userId;
  } catch {
    return reply.status(401).send({ success: false, error: 'Unauthorized' });
  }
}
