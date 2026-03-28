import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '../services/auth.service.js';

export class AuthController {
  constructor(private authService: AuthService) {}

  async guestLogin(request: FastifyRequest, reply: FastifyReply) {
    const result = await this.authService.guestLogin();
    return reply.send({ success: true, data: result });
  }
}
