import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import { authMiddleware } from './auth.middleware.js';

const authPluginImpl: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authMiddleware);
};

export const authPlugin = fp(authPluginImpl, {
  name: 'auth-plugin',
  dependencies: ['@fastify/jwt'],
});
