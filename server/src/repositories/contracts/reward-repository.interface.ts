import type { Reward, UserRewardState } from '../../types/index.js';

export interface IRewardRepository {
  createState(userId: string): Promise<UserRewardState>;
  getState(userId: string): Promise<UserRewardState | null>;
  getTotalClaimedCoins(userId: string): Promise<number>;
  getLastReward(userId: string): Promise<Reward | null>;
  saveReward(userId: string, day: number, amount: number): Promise<Reward>;
  updateState(userId: string, currentDay: number, lastClaimedAt: Date): Promise<void>;
  resetStreak(userId: string): Promise<void>;
}
