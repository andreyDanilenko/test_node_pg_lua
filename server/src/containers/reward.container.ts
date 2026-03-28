import { RewardService } from '../services/reward.service.js';
import { RewardController } from '../controllers/reward.controller.js';
import type { IRewardRepository } from '../repositories/contracts/reward-repository.interface.js';

export const createRewardContainer = (rewardRepo: IRewardRepository) => {
  const rewardService = new RewardService(rewardRepo);
  const rewardController = new RewardController(rewardService);
  
  return { rewardService, rewardController };
};
