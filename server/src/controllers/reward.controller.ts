import { FastifyRequest, FastifyReply } from 'fastify';
import { RewardService } from '../services/reward.service.js';

interface AuthRequest extends FastifyRequest {
  userId?: string;
}

export class RewardController {
  constructor(private rewardService: RewardService) {}

  async getState(request: AuthRequest, reply: FastifyReply) {
    const state = await this.rewardService.getState(request.userId!);
    console.log('state', state);
    return reply.send({ success: true, data: state });
  }

  async claim(request: AuthRequest, reply: FastifyReply) {
    const result = await this.rewardService.claim(request.userId!);
    const code = result.success ? 200 : 400;
    console.log('result', result);
    console.log('code', code);  
    return reply.code(code).send({ success: result.success, data: result });
  }
}
