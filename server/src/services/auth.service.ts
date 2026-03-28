import type { IUserRepository } from '../repositories/contracts/user-repository.interface.js';
import type { IRewardRepository } from '../repositories/contracts/reward-repository.interface.js';
import { GuestAuthResponse } from '../types/index.js';

export class AuthService {
  constructor(
    private userRepo: IUserRepository,
    private rewardRepo: IRewardRepository,
    private jwt: any
  ) {}

  async guestLogin(): Promise<GuestAuthResponse> {
    const user = await this.userRepo.createGuest();
    
    await this.rewardRepo.createState(user.id);
    
    const token = this.jwt.sign({ userId: user.id });
    
    return { userId: user.id, token };
  }

  async validateToken(token: string): Promise<string | null> {
    try {
      const decoded = this.jwt.verify(token);
      const user = await this.userRepo.findById(decoded.userId);
      return user ? decoded.userId : null;
    } catch {
      return null;
    }
  }
}
