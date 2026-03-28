import type { Pool } from 'pg';
import type { IRewardRepository } from './contracts/reward-repository.interface.js';
import type { Reward, UserRewardState } from '../types/index.js';

export class RewardRepository implements IRewardRepository {
  constructor(private readonly pool: Pool) {}

  async createState(userId: string): Promise<UserRewardState> {
    const result = await this.pool.query<UserRewardState>(
      `INSERT INTO user_reward_state (user_id, streak_started_at)
       VALUES ($1, CURRENT_TIMESTAMP)
       RETURNING user_id as "userId", current_day as "currentDay", 
                 last_claimed_at as "lastClaimedAt", streak_started_at as "streakStartedAt"`,
      [userId]
    );
    return result.rows[0];
  }

  async getState(userId: string): Promise<UserRewardState | null> {
    const result = await this.pool.query<UserRewardState>(
      `SELECT user_id as "userId", current_day as "currentDay", 
              last_claimed_at as "lastClaimedAt", streak_started_at as "streakStartedAt"
       FROM user_reward_state WHERE user_id = $1`,
      [userId]
    );
    return result.rows[0] || null;
  }

  async getLastReward(userId: string): Promise<Reward | null> {
    const result = await this.pool.query<Reward>(
      `SELECT id, user_id as "userId", day, amount, claimed_at as "claimedAt"
       FROM rewards 
       WHERE user_id = $1 
       ORDER BY claimed_at DESC 
       LIMIT 1`,
      [userId]
    );
    return result.rows[0] || null;
  }

  async saveReward(userId: string, day: number, amount: number): Promise<Reward> {
    const insert = await this.pool.query<Reward>(
      `INSERT INTO rewards (user_id, day, amount)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, day) DO NOTHING
       RETURNING id, user_id as "userId", day, amount, claimed_at as "claimedAt"`,
      [userId, day, amount]
    );
    if (insert.rows[0]) {
      return insert.rows[0];
    }
    const existing = await this.pool.query<Reward>(
      `SELECT id, user_id as "userId", day, amount, claimed_at as "claimedAt"
       FROM rewards WHERE user_id = $1 AND day = $2`,
      [userId, day]
    );
    return existing.rows[0];
  }

  async updateState(userId: string, currentDay: number, lastClaimedAt: Date): Promise<void> {
    const query = `
      UPDATE user_reward_state 
      SET current_day = $2, 
          last_claimed_at = $3,
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
    `;
    
    await this.pool.query(query, [userId, currentDay, lastClaimedAt]);
  }

  async resetStreak(userId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`DELETE FROM rewards WHERE user_id = $1`, [userId]);
      await client.query(
        `UPDATE user_reward_state 
         SET current_day = 1, streak_started_at = CURRENT_TIMESTAMP, last_claimed_at = NULL
         WHERE user_id = $1`,
        [userId]
      );
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
}
