import dotenv from 'dotenv';

dotenv.config();

const isDocker = process.env.DOCKER_ENV === 'true';
const dbHost = isDocker ? 'postgres' : (process.env.DB_HOST || 'localhost');

export const config = {
  port: parseInt(process.env.PORT || '3000'),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'super-secret-key-2024',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '30d',
  
  db: {
    user: process.env.DB_USER || 'app',
    password: process.env.DB_PASSWORD || 'app',
    name: process.env.DB_NAME || 'app',
    port: parseInt(process.env.DB_PORT || '5432'),
    host: dbHost,
  },
  
  cycleBehavior: (process.env.CYCLE_BEHAVIOR || 'reset') as 'reset' | 'fixed',
  
  rewards: {
    amounts: [100, 200, 300, 400, 500, 700, 1000],
    maxDay: 7,
    cooldownSeconds: parseInt(process.env.REWARD_COOLDOWN_SEC || '30'),
    streakResetSeconds: parseInt(process.env.REWARD_STREAK_RESET_SEC || '60'),
  },
};

export const databaseUrl = `postgresql://${config.db.user}:${config.db.password}@${config.db.host}:${config.db.port}/${config.db.name}`;
