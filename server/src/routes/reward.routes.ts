import { FastifyInstance } from 'fastify';
import { RewardController } from '../controllers/reward.controller.js';

export async function rewardRoutes(
  fastify: FastifyInstance,
  { controller }: { controller: RewardController }
) {
  fastify.get('/', controller.getState.bind(controller));
  fastify.post('/claim', controller.claim.bind(controller));
}

export default rewardRoutes;
