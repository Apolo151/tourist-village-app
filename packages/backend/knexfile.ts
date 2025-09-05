import { Knex } from 'knex';
import dotenv from 'dotenv';

dotenv.config();

// Helper function to process DATABASE_URL properly
const getConnectionConfig = (env: string): Knex.PgConnectionConfig => {
  if (process.env.DATABASE_URL) {
    // For connection strings, use this format
    console.log("Using connection string from DATABASE_URL");
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: env === 'production' ? { rejectUnauthorized: false } : undefined
    };
  }
  
  // For object-based configuration
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: env === 'testing' ? 
      (process.env.DB_NAME || 'tourist_village_db_test') : 
      (process.env.DB_NAME || 'tourist_village_db'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    ssl: env === 'production' ? { rejectUnauthorized: false } : undefined
  };
};

const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'postgresql',
    connection: getConnectionConfig('development'),
    migrations: {
      directory: './src/database/migrations',
      extension: 'ts',
    },
    seeds: {
      directory: './src/database/seeds',
      extension: 'ts',
    },
  },
  testing: {
    client: 'postgresql',
    connection: getConnectionConfig('testing'),
    migrations: {
      directory: './src/database/migrations',
      extension: 'ts',
    },
    seeds: {
      directory: './src/database/seeds',
      extension: 'ts',
    },
  },
  production: {
    client: 'postgresql',
    connection: getConnectionConfig('production'),
    migrations: {
      directory: './src/database/migrations',
      extension: 'js',
    },
    seeds: {
      directory: './src/database/seeds',
      extension: 'js',
    },
    pool: {
      min: 3,
      max: 10
    }
  },
};

export default config;