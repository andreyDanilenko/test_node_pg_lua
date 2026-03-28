import type { IRewardRepository } from '../repositories/contracts/reward-repository.interface.js';
import { config } from '../config/index.js';
import { RewardStateResponse, ClaimResponse } from '../types/index.js';

export class RewardService {
  constructor(private rewardRepo: IRewardRepository) {}

  async getState(userId: string): Promise<RewardStateResponse> {
    const state = await this.rewardRepo.getState(userId);
    if (!state) {
      return {
        currentDay: 1,
        canClaim: true,
        nextClaimInSeconds: null,
        message: 'Ready to claim!',
      };
    }

    const now = Date.now();
    const lastClaimed = state.lastClaimedAt?.getTime();

    // Первая награда
    if (!lastClaimed) {
      return {
        currentDay: state.currentDay,
        canClaim: true,
        nextClaimInSeconds: null,
        message: `Ready to claim day ${state.currentDay}!`,
      };
    }

    const cooldownMs = config.rewards.cooldownSeconds * 1000;
    const resetMs = config.rewards.streakResetSeconds * 1000;
    const timePassed = now - lastClaimed;

    // Проверяем сброс серии
    if (timePassed > resetMs) {
      return {
        currentDay: 1,
        canClaim: true,
        nextClaimInSeconds: null,
        message: 'Streak broken! Starting from day 1.',
      };
    }

    // Проверяем возможность получения
    if (timePassed >= cooldownMs) {
      let nextDay = state.currentDay;
      
      if (config.cycleBehavior === 'reset') {
        nextDay = (state.currentDay % config.rewards.maxDay) + 1;
      } else {
        nextDay = Math.min(state.currentDay + 1, config.rewards.maxDay);
      }
      
      return {
        currentDay: nextDay,
        canClaim: true,
        nextClaimInSeconds: null,
        message: `Ready to claim day ${nextDay}!`,
      };
    }

    // Нельзя получить
    const secondsLeft = Math.ceil((cooldownMs - timePassed) / 1000);
    return {
      currentDay: state.currentDay,
      canClaim: false,
      nextClaimInSeconds: secondsLeft,
      message: `Wait ${Math.floor(secondsLeft / 60)}m ${secondsLeft % 60}s`,
    };
  }

  async claim(userId: string): Promise<ClaimResponse> {
    const state = await this.rewardRepo.getState(userId);
    const lastReward = await this.rewardRepo.getLastReward(userId);
    
    const now = Date.now();
    const lastClaimed = state?.lastClaimedAt?.getTime();
  
    // Первая награда
    if (!lastClaimed) {
      const amount = config.rewards.amounts[0];
      const reward = await this.rewardRepo.saveReward(userId, 1, amount);
      await this.rewardRepo.updateState(userId, 1, new Date(reward.claimedAt));
      return {
        success: true,
        day: 1,
        amount: reward.amount,
        message: `+${reward.amount} coins! Day 1`,
      };
    }
  
    const cooldownMs = config.rewards.cooldownSeconds * 1000;
    const resetMs = config.rewards.streakResetSeconds * 1000;
    const timePassed = now - lastClaimed;
  
    // Проверка сброса серии
    if (timePassed > resetMs) {
      await this.rewardRepo.resetStreak(userId);
      const amount = config.rewards.amounts[0];
      const reward = await this.rewardRepo.saveReward(userId, 1, amount);
      await this.rewardRepo.updateState(userId, 1, new Date(reward.claimedAt));
      return {
        success: true,
        day: 1,
        amount: reward.amount,
        message: `Streak broken! Starting over. +${reward.amount} coins`,
      };
    }
  
    // Проверка кулдауна
    if (timePassed < cooldownMs) {
      const secondsLeft = Math.ceil((cooldownMs - timePassed) / 1000);
      return {
        success: false,
        message: `Please wait ${Math.floor(secondsLeft / 60)}m ${secondsLeft % 60}s`,
      };
    }
  
    let nextDay = 1;
    
    if (lastReward) {
      nextDay = lastReward.day + 1;
      
      if (nextDay > config.rewards.maxDay) {
        if (config.cycleBehavior === 'reset') {
          nextDay = 1;
        } else {
          nextDay = config.rewards.maxDay;
        }
      }
    }
  
    const amount = config.rewards.amounts[nextDay - 1];

    const reward = await this.rewardRepo.saveReward(userId, nextDay, amount);
    await this.rewardRepo.updateState(userId, nextDay, new Date(reward.claimedAt));
  
    let message = `+${amount} coins for day ${nextDay}!`;
    
    if (nextDay === config.rewards.maxDay && config.cycleBehavior === 'fixed') {
      message += 'Maximum day reached!';
    } else if (nextDay === 1 && lastReward?.day === config.rewards.maxDay) {
      message += ' New cycle started!';
    }
  
    return {
      success: true,
      day: nextDay,
      amount: reward.amount,
      message,
    };
  }
}
