import postgres from 'postgres';

export function createDb(env: { HYPERDRIVE?: { connectionString: string }; SUPABASE_URL?: string; DATABASE_URL?: string }) {
  const connectionString = env.HYPERDRIVE?.connectionString
    || env.DATABASE_URL
    || '';
  if (!connectionString) {
    throw new Error('Database connection string not configured');
  }
  return postgres(connectionString, { prepare: false });
}

export type Db = ReturnType<typeof postgres>;
