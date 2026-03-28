import { AuthService } from '../services/auth.service.js';
import { AuthController } from '../controllers/auth.controller.js';
import type { IUserRepository } from '../repositories/contracts/user-repository.interface.js';
import type { IRewardRepository } from '../repositories/contracts/reward-repository.interface.js';

export const createAuthContainer = (
  userRepo: IUserRepository,
  rewardRepo: IRewardRepository,
  jwt: any
) => {
  const authService = new AuthService(userRepo, rewardRepo, jwt);
  const authController = new AuthController(authService);
  
  return { authService, authController };
};
