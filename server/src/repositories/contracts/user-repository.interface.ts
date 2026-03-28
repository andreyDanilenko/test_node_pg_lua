import type { User } from '../../types/index.js';

export interface IUserRepository {
  createGuest(): Promise<User>;
  findById(id: string): Promise<User | null>;
}
