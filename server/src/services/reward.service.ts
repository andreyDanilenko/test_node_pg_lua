import type { IRewardRepository } from '../repositories/contracts/reward-repository.interface.js';
import { config } from '../config/index.js';
import { RewardStateResponse, ClaimResponse } from '../types/index.js';

export class RewardService {
  constructor(private rewardRepo: IRewardRepository) {}

  async getState(userId: string): Promise<RewardStateResponse> {
    const coins = await this.rewardRepo.getTotalClaimedCoins(userId);
    const withCoins = (
      partial: Omit<RewardStateResponse, 'coins'>
    ): RewardStateResponse => ({ ...partial, coins });

    const state = await this.rewardRepo.getState(userId);
    if (!state) {
      return withCoins({
        currentDay: 1,
        canClaim: true,
        nextClaimInSeconds: null,
        message: 'Ready to claim!',
      });
    }

    const now = Date.now();
    const lastClaimed = state.lastClaimedAt?.getTime();

    // Первая награда
    if (!lastClaimed) {
      return withCoins({
        currentDay: state.currentDay,
        canClaim: true,
        nextClaimInSeconds: null,
        message: `Ready to claim day ${state.currentDay}!`,
      });
    }

    const cooldownMs = config.rewards.cooldownSeconds * 1000;
    const resetMs = config.rewards.streakResetSeconds * 1000;
    const timePassed = now - lastClaimed;

    // Проверяем сброс серии
    if (timePassed > resetMs) {
      return withCoins({
        currentDay: 1,
        canClaim: true,
        nextClaimInSeconds: null,
        message: 'Streak broken! Starting from day 1.',
      });
    }

    // Проверяем возможность получения
    if (timePassed >= cooldownMs) {
      let nextDay = state.currentDay;

      if (config.cycleBehavior === 'reset') {
        nextDay = (state.currentDay % config.rewards.maxDay) + 1;
      } else {
        nextDay = Math.min(state.currentDay + 1, config.rewards.maxDay);
      }

      return withCoins({
        currentDay: nextDay,
        canClaim: true,
        nextClaimInSeconds: null,
        message: `Ready to claim day ${nextDay}!`,
      });
    }

    // Нельзя получить
    const secondsLeft = Math.ceil((cooldownMs - timePassed) / 1000);
    return withCoins({
      currentDay: state.currentDay,
      canClaim: false,
      nextClaimInSeconds: secondsLeft,
      message: `Wait ${Math.floor(secondsLeft / 60)}m ${secondsLeft % 60}s`,
    });
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
        message: `Серия прервана! Новый цикл начался с Дня 1. +${reward.amount} монет`,
      };
    }

    // Если цикл фиксированный и игрок уже взял максимальный день,
    // не даём бесконечно фармить день maxDay каждые cooldown секунд.
    if (
      config.cycleBehavior === 'fixed' &&
      lastReward?.day === config.rewards.maxDay &&
      timePassed <= resetMs 
    ) {
      return {
        success: false,
        message: 'Серия завершена. Чтобы начать заново, дождитесь сброса серии по времени.',
      };
    }

    // В режиме fixed запрещаем брать награду, ТОЛЬКО если время сброса еще прошло
    if (
      config.cycleBehavior === 'fixed' &&
      lastReward?.day === config.rewards.maxDay &&
      timePassed <= resetMs 
    ) {
      return {
        success: false,
        message: 'Серия завершена. Чтобы начать заново, дождитесь сброса серии по времени.',
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
  
    let message = `+${amount} монет за День ${nextDay}!`;

    if (nextDay === config.rewards.maxDay && config.cycleBehavior === 'fixed') {
      message = `${message} Это последняя награда в серии — завтра новая награда недоступна.`;
    } else if (nextDay === config.rewards.maxDay && config.cycleBehavior === 'reset') {
      message = `${message} Серия завершена — завтра начнётся новая с Дня 1.`;
    } else if (
      nextDay === 1 &&
      lastReward?.day === config.rewards.maxDay &&
      config.cycleBehavior === 'reset'
    ) {
      message = `Новая серия началась! +${amount} монет за День 1.`;
    }
  
    return {
      success: true,
      day: nextDay,
      amount: reward.amount,
      message,
    };
  }
}
