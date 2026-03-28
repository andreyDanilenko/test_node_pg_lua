import type { Pool } from 'pg';
import type { IUserRepository } from './contracts/user-repository.interface.js';
import type { User } from '../types/index.js';

export class UserRepository implements IUserRepository {
  constructor(private readonly pool: Pool) {}

  async createGuest(): Promise<User> {
    const result = await this.pool.query<User>(
      `INSERT INTO users (user_type) 
       VALUES ('guest') 
       RETURNING id, user_type as "userType", created_at as "createdAt", updated_at as "updatedAt"`
    );
    return result.rows[0];
  }

  async findById(id: string): Promise<User | null> {
    const result = await this.pool.query<User>(
      `SELECT id, user_type as "userType", created_at as "createdAt", updated_at as "updatedAt"
       FROM users WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }
}
