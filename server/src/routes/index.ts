import { FastifyInstance } from 'fastify';
import { AuthController } from '../controllers/auth.controller.js';
import { RewardController } from '../controllers/reward.controller.js';

export async function registerRoutes(
  fastify: FastifyInstance,
  authController: AuthController,
  rewardController: RewardController
) {
  await fastify.register(
    async (instance) => {
      await instance.register(import('./auth.routes.js'), { controller: authController });
    },
    { prefix: '/api/v1/auth' }
  );

  await fastify.register(
    async (instance) => {
      await instance.register(import('./reward.routes.js'), { controller: rewardController });
    },
    { prefix: '/api/v1/daily-rewards' }
  );
}
