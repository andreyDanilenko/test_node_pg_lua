import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { registerRoutes } from '../routes/index.js';
import { createAuthContainer } from '../containers/auth.container.js';
import type { IUserRepository } from '../repositories/contracts/user-repository.interface.js';
import type { IRewardRepository } from '../repositories/contracts/reward-repository.interface.js';
import type { Reward, User, UserRewardState } from '../types/index.js';
import type { RewardService } from '../services/reward.service.js';
import { authPlugin } from '../middlewares/auth.plugin.js';
import { RewardController } from './reward.controller.js';

describe('RewardController (HTTP, mocked service)', () => {
  let app: FastifyInstance;
  const jwtSecret = 'reward-controller-test-secret';

  async function startApp(rewardService: Pick<RewardService, 'getState' | 'claim'>) {
    const userRepo: IUserRepository = {
      async createGuest(): Promise<User> {
        const now = new Date();
        return { id: 'test-guest-user', userType: 'guest', createdAt: now, updatedAt: now };
      },
      async findById(id: string): Promise<User | null> {
        if (id !== 'test-guest-user') return null;
        const now = new Date();
        return { id, userType: 'guest', createdAt: now, updatedAt: now };
      },
    };

    const rewardRepo: IRewardRepository = {
      async createState(userId: string): Promise<UserRewardState> {
        return {
          userId,
          currentDay: 1,
          lastClaimedAt: null,
          streakStartedAt: new Date(),
        };
      },
      async getState(): Promise<UserRewardState | null> {
        return null;
      },
      async getLastReward(): Promise<Reward | null> {
        return null;
      },
      async saveReward(userId: string, day: number, amount: number): Promise<Reward> {
        return { id: 'reward-1', userId, day, amount, claimedAt: new Date() };
      },
      async updateState(): Promise<void> {},
      async resetStreak(): Promise<void> {},
    };

    const instance = Fastify({ logger: false, ignoreTrailingSlash: true });
    await instance.register(cors, { origin: true });
    await instance.register(jwt, { secret: jwtSecret });
    await instance.register(authPlugin);

    const { authController } = createAuthContainer(userRepo, rewardRepo, instance.jwt);
    const rewardController = new RewardController(rewardService as RewardService);
    await registerRoutes(instance, authController, rewardController);

    instance.get('/health', async () => ({ status: 'ok' }));
    await instance.ready();
    return instance;
  }

  afterEach(async () => {
    if (app) await app.close();
    vi.restoreAllMocks();
  });

  it('GET /api/v1/daily-rewards returns 200 and calls getState with userId from JWT', async () => {
    const mockState = {
      currentDay: 2,
      canClaim: false,
      nextClaimInSeconds: 60,
      message: 'Wait',
    };
    const getState = vi.fn().mockResolvedValue(mockState);
    const claim = vi.fn();
    app = await startApp({ getState, claim });

    const token = app.jwt.sign({ userId: 'user-test-123' });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/daily-rewards',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ success: true, data: mockState });
    expect(getState).toHaveBeenCalledWith('user-test-123');
    expect(claim).not.toHaveBeenCalled();
  });

  it('GET /api/v1/daily-rewards returns 401 without token; getState not called', async () => {
    const getState = vi.fn();
    const claim = vi.fn();
    app = await startApp({ getState, claim });

    const res = await app.inject({ method: 'GET', url: '/api/v1/daily-rewards' });

    expect(res.statusCode).toBe(401);
    expect(getState).not.toHaveBeenCalled();
  });

  it('GET /api/v1/daily-rewards returns 401 for invalid JWT; getState not called', async () => {
    const getState = vi.fn();
    app = await startApp({ getState, claim: vi.fn() });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/daily-rewards',
      headers: { authorization: 'Bearer not-a-jwt' },
    });

    expect(res.statusCode).toBe(401);
    expect(getState).not.toHaveBeenCalled();
  });

  it('GET /api/v1/daily-rewards returns 500 when service throws', async () => {
    const getState = vi.fn().mockRejectedValue(new Error('DB connection failed'));
    app = await startApp({ getState, claim: vi.fn() });

    const token = app.jwt.sign({ userId: 'user-456' });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/daily-rewards',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(500);
  });

  it('POST /api/v1/daily-rewards/claim returns 200 when claim succeeds', async () => {
    const mockResult = {
      success: true as const,
      day: 1,
      amount: 50,
      message: '+50 coins! Day 1',
    };
    const claim = vi.fn().mockResolvedValue(mockResult);
    app = await startApp({ getState: vi.fn(), claim });

    const token = app.jwt.sign({ userId: 'user-claim-789' });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/daily-rewards/claim',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ success: true, data: mockResult });
    expect(claim).toHaveBeenCalledWith('user-claim-789');
  });

  it('POST /api/v1/daily-rewards/claim returns 400 when service reports failure', async () => {
    const mockResult = {
      success: false as const,
      message: 'Already claimed',
    };
    const claim = vi.fn().mockResolvedValue(mockResult);
    app = await startApp({ getState: vi.fn(), claim });

    const token = app.jwt.sign({ userId: 'user-already' });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/daily-rewards/claim',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(400);
    const body = res.json() as { success: boolean; data: typeof mockResult };
    expect(body.success).toBe(false);
    expect(body.data).toEqual(mockResult);
  });
});
