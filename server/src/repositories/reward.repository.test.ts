import type { Pool } from 'pg';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RewardRepository } from './reward.repository.js';

function mockPool() {
  return {
    query: vi.fn(),
    connect: vi.fn(),
  };
}

describe('RewardRepository', () => {
  let pool: ReturnType<typeof mockPool>;
  let repo: RewardRepository;

  beforeEach(() => {
    pool = mockPool();
    repo = new RewardRepository(pool as unknown as Pool);
  });

  it('createState inserts and returns mapped row', async () => {
    const row = {
      userId: 'u1',
      currentDay: 1,
      lastClaimedAt: null,
      streakStartedAt: new Date(),
    };
    pool.query.mockResolvedValueOnce({ rows: [row] });

    const out = await repo.createState('u1');

    expect(out).toEqual(row);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO user_reward_state'),
      ['u1']
    );
  });

  it('getState returns null when no row', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const out = await repo.getState('u1');

    expect(out).toBeNull();
  });

  it('getLastReward returns row or null', async () => {
    const row = {
      id: 'r1',
      userId: 'u1',
      day: 2,
      amount: 10,
      claimedAt: new Date(),
    };
    pool.query.mockResolvedValueOnce({ rows: [row] });

    const out = await repo.getLastReward('u1');

    expect(out).toEqual(row);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('FROM rewards'),
      ['u1']
    );
  });

  it('saveReward returns row from INSERT when RETURNING is non-empty', async () => {
    const row = {
      id: 'r-new',
      userId: 'u1',
      day: 1,
      amount: 5,
      claimedAt: new Date(),
    };
    pool.query.mockResolvedValueOnce({ rows: [row] });

    const out = await repo.saveReward('u1', 1, 5);

    expect(out).toEqual(row);
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  it('saveReward selects existing row when ON CONFLICT returns nothing', async () => {
    const existing = {
      id: 'r-old',
      userId: 'u1',
      day: 1,
      amount: 5,
      claimedAt: new Date(),
    };
    pool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [existing] });

    const out = await repo.saveReward('u1', 1, 5);

    expect(out).toEqual(existing);
    expect(pool.query).toHaveBeenCalledTimes(2);
    expect(pool.query.mock.calls[1]![1]).toEqual(['u1', 1]);
  });

  it('updateState runs UPDATE with params', async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 1 });
    const at = new Date();

    await repo.updateState('u1', 3, at);

    expect(pool.query).toHaveBeenCalledTimes(1);
    const [, params] = pool.query.mock.calls[0]!;
    expect(params).toEqual(['u1', 3, at]);
    expect(pool.query.mock.calls[0]![0]).toContain('UPDATE user_reward_state');
  });

  it('resetStreak runs transaction and releases client', async () => {
    const client = {
      query: vi.fn().mockResolvedValue({ rowCount: 1 }),
      release: vi.fn(),
    };
    pool.connect.mockResolvedValueOnce(client);

    await repo.resetStreak('u1');

    expect(client.query).toHaveBeenCalledTimes(4);
    expect(client.query.mock.calls[0]![0]).toBe('BEGIN');
    expect(client.query.mock.calls[1]![0]).toContain('DELETE FROM rewards');
    expect(client.query.mock.calls[2]![0]).toContain('UPDATE user_reward_state');
    expect(client.query.mock.calls[3]![0]).toBe('COMMIT');
    expect(client.release).toHaveBeenCalledOnce();
  });

  it('resetStreak rolls back and releases on error', async () => {
    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('db fail')),
      release: vi.fn(),
    };
    pool.connect.mockResolvedValueOnce(client);

    await expect(repo.resetStreak('u1')).rejects.toThrow('db fail');

    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.release).toHaveBeenCalledOnce();
  });
});
