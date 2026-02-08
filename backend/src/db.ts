import { Pool, PoolClient, QueryResult } from 'pg';
import { config } from './config';

// Create connection pool
export const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.database,
  user: config.db.user,
  password: config.db.password,
  max: config.db.max,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
  process.exit(-1);
});

// Query helper
export const query = async (text: string, params?: any[]): Promise<QueryResult> => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    
    if (config.nodeEnv === 'development') {
      console.log('Executed query', { text, duration, rows: res.rowCount });
    }
    
    return res;
  } catch (error) {
    console.error('Database query error:', { text, error });
    throw error;
  }
};

// Transaction helper
export const transaction = async <T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Get a single client for complex operations
export const getClient = async (): Promise<PoolClient> => {
  return await pool.connect();
};

// Close pool (for graceful shutdown)
export const closePool = async (): Promise<void> => {
  await pool.end();
  console.log('Database pool closed');
};

// Health check
export const healthCheck = async (): Promise<boolean> => {
  try {
    const result = await query('SELECT NOW()');
    return result.rowCount !== null && result.rowCount > 0;
  } catch (error) {
    return false;
  }
};
