import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import dotenv from 'dotenv';

import { config } from './config/index.js';
import { createPool } from './config/database.js';
import { authPlugin } from './middlewares/auth.plugin.js';
import { UserRepository } from './repositories/user.repository.js';
import { RewardRepository } from './repositories/reward.repository.js';
import { createAuthContainer } from './containers/auth.container.js';
import { createRewardContainer } from './containers/reward.container.js';
import { registerRoutes } from './routes/index.js';

dotenv.config();

const app = Fastify({ logger: true, ignoreTrailingSlash: true });

await app.register(cors, { origin: true });

// JWT
await app.register(jwt, { secret: config.jwtSecret });

await app.register(authPlugin);

const pool = createPool();

const userRepo = new UserRepository(pool);
const rewardRepo = new RewardRepository(pool);

// Containers
const { authController } = createAuthContainer(userRepo, rewardRepo, app.jwt);
const { rewardController } = createRewardContainer(rewardRepo);

// Routes
await registerRoutes(app, authController, rewardController);

// Health
app.get('/health', async () => {
  let dbStatus: 'ok' | 'error' = 'ok';
  try {
    await pool.query('SELECT 1');
  } catch {
    dbStatus = 'error';
  }
  return { status: 'ok', db: dbStatus, cycle: config.cycleBehavior };
});

// Start
const port = config.port;
app.listen({ port, host: '0.0.0.0' }, () => {
  console.log(`\n✅ Server: http://localhost:${port}`);
  console.log(`🔄 Cycle: ${config.cycleBehavior}\n`);
});
