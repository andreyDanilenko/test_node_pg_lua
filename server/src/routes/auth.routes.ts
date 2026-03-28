import { FastifyInstance } from 'fastify';
import { AuthController } from '../controllers/auth.controller.js';

export async function authRoutes(
  fastify: FastifyInstance,
  { controller }: { controller: AuthController }
) {
  fastify.post('/guest', controller.guestLogin.bind(controller));
}

export default authRoutes;
