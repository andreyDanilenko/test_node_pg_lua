import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { registerRoutes } from '../routes/index.js';
import { createAuthContainer } from '../containers/auth.container.js';
import { createRewardContainer } from '../containers/reward.container.js';
import type { IUserRepository } from '../repositories/contracts/user-repository.interface.js';
import type { IRewardRepository } from '../repositories/contracts/reward-repository.interface.js';
import type { Reward, User, UserRewardState } from '../types/index.js';
import { authPlugin } from './auth.plugin.js';

describe('auth plugin (integration)', () => {
  let app: FastifyInstance;
  const SECRET = 'test-secret';

  beforeAll(async () => {
    const rewardStates = new Map<string, UserRewardState>();

    const userRepo: IUserRepository = {
      async createGuest(): Promise<User> {
        const now = new Date();
        return {
          id: 'test-guest-user',
          userType: 'guest',
          createdAt: now,
          updatedAt: now,
        };
      },
      async findById(id: string): Promise<User | null> {
        if (id === 'test-guest-user') {
          const now = new Date();
          return { id, userType: 'guest', createdAt: now, updatedAt: now };
        }
        return null;
      },
    };

    const rewardRepo: IRewardRepository = {
      async createState(userId: string): Promise<UserRewardState> {
        const state: UserRewardState = {
          userId,
          currentDay: 1,
          lastClaimedAt: null,
          streakStartedAt: new Date(),
        };
        rewardStates.set(userId, state);
        return state;
      },
      async getState(userId: string): Promise<UserRewardState | null> {
        return rewardStates.get(userId) ?? null;
      },
      async getTotalClaimedCoins(): Promise<number> {
        return 0;
      },
      async getLastReward(): Promise<Reward | null> {
        return null;
      },
      async saveReward(userId: string, day: number, amount: number): Promise<Reward> {
        return {
          id: 'reward-1',
          userId,
          day,
          amount,
          claimedAt: new Date(),
        };
      },
      async updateState(): Promise<void> {},
      async resetStreak(): Promise<void> {},
    };

    app = Fastify({ logger: false, ignoreTrailingSlash: true });
    await app.register(cors, { origin: true });
    await app.register(jwt, { secret: SECRET });
    await app.register(authPlugin);

    const { authController } = createAuthContainer(userRepo, rewardRepo, app.jwt);
    const { rewardController } = createRewardContainer(rewardRepo);
    await registerRoutes(app, authController, rewardController);

    app.get('/health', async () => ({ status: 'ok' }));
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('allows public /health without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
  });

  it('allows public POST /api/v1/auth/guest without token', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/auth/guest' });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { success: boolean; data: { userId: string; token: string } };
    expect(body.success).toBe(true);
    expect(body.data.userId).toBe('test-guest-user');
    expect(typeof body.data.token).toBe('string');
  });

  it('returns 401 for protected GET /api/v1/daily-rewards without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/daily-rewards' });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ success: false, error: 'Unauthorized' });
  });

  it('allows GET /api/v1/daily-rewards with valid JWT', async () => {
    const token = app.jwt.sign({ userId: 'test-guest-user' });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/daily-rewards',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { success: boolean; data: { currentDay: number } };
    expect(body.success).toBe(true);
    expect(body.data).toMatchObject({
      currentDay: 1,
      canClaim: true,
    });
  });

  it('returns 401 for invalid token on protected route', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/daily-rewards',
      headers: { authorization: 'Bearer not-a-jwt' },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ success: false, error: 'Unauthorized' });
  });

  it('does not run JWT for OPTIONS preflight on protected path', async () => {
    const res = await app.inject({ method: 'OPTIONS', url: '/api/v1/daily-rewards' });
    expect(res.statusCode).not.toBe(401);
  });
});
