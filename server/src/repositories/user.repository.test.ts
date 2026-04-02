import type { Pool } from 'pg';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRepository } from './user.repository.js';

function mockPool() {
  return { query: vi.fn() };
}

describe('UserRepository', () => {
  let pool: ReturnType<typeof mockPool>;
  let repo: UserRepository;

  beforeEach(() => {
    pool = mockPool();
    repo = new UserRepository(pool as unknown as Pool);
  });

  it('createGuest inserts guest and returns mapped row', async () => {
    const row = {
      id: 'u-1',
      userType: 'guest',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    };
    pool.query.mockResolvedValueOnce({ rows: [row], rowCount: 1 });

    const user = await repo.createGuest();

    expect(user).toEqual(row);
    expect(pool.query).toHaveBeenCalledTimes(1);
    const [sql, params] = pool.query.mock.calls[0]!;
    expect(sql).toContain('INSERT INTO users');
    expect(sql).toContain('guest');
    expect(params).toBeUndefined();
  });

  it('findById returns user when row exists', async () => {
    const row = {
      id: 'x',
      userType: 'guest',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    pool.query.mockResolvedValueOnce({ rows: [row], rowCount: 1 });

    const found = await repo.findById('x');

    expect(found).toEqual(row);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('FROM users WHERE id'),
      ['x']
    );
  });

  it('findById returns null when no row', async () => {
    pool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const found = await repo.findById('missing');

    expect(found).toBeNull();
  });
});
