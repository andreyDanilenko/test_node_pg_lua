export interface User {
    id: string;
    userType: string;
    createdAt: Date;
    updatedAt: Date;
  }
  
  export interface Reward {
    id: string;
    userId: string;
    day: number;
    amount: number;
    claimedAt: Date;
  }
  
  export interface UserRewardState {
    userId: string;
    currentDay: number;
    lastClaimedAt: Date | null;
    streakStartedAt: Date;
  }
  
  export interface GuestAuthResponse {
    userId: string;
    token: string;
  }
  
  export interface RewardStateResponse {
    currentDay: number;
    canClaim: boolean;
    nextClaimInSeconds: number | null;
    message: string;
    coins: number;
  }
  
  export interface ClaimResponse {
    success: boolean;
    day?: number;
    amount?: number;
    message: string;
  }
