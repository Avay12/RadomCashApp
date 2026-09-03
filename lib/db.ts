import { neon } from '@neondatabase/serverless';

export interface UserRecord {
  id: number;
  username: string;
  password?: string;
  rewards_balance: number;
  upcoming_rewards: number;
  is_admin: boolean;
  created_at?: string;
}

export interface TransactionRecord {
  id: string;
  user_id: number;
  title: string;
  date: string;
  amount: number;
  is_negative: boolean;
  coins?: number;
  recipient?: string;
  created_at?: string;
}

// In-Memory Fallback State (used seamlessly if DATABASE_URL is not yet set in .env.local)
interface GlobalStore {
  memoryUsers: UserRecord[];
  memoryTransactions: TransactionRecord[];
  isInitialized: boolean;
}

declare global {
  var _neonDbStore: GlobalStore | undefined;
}

global._neonDbStore = global._neonDbStore || {
  memoryUsers: [
    {
      id: 1,
      username: 'admin',
      password: 'admin123',
      rewards_balance: 8573020.22,
      upcoming_rewards: 167290.62,
      is_admin: true,
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      username: 'asxa',
      password: '123',
      rewards_balance: 8573020.22,
      upcoming_rewards: 167290.62,
      is_admin: false,
      created_at: new Date().toISOString()
    }
  ],
  memoryTransactions: [
    {
      id: 'tx-1',
      user_id: 1,
      title: 'Sent 250 Coins to @user',
      date: '6/9/2026 06:22:20',
      amount: -3.03,
      is_negative: true,
      coins: 250,
      recipient: 'user'
    },
    {
      id: 'tx-2',
      user_id: 1,
      title: 'LIVE Payout',
      date: '6/1/2026 12:00:00',
      amount: 1276819.98,
      is_negative: false
    }
  ],
  isInitialized: false
};

export function getDbClient() {
  const url = process.env.DATABASE_URL;
  if (url && url.trim().length > 0) {
    return neon(url.trim());
  }
  return null;
}

// Initialize tables if connected to Neon DB
export async function initDatabase(): Promise<{ success: boolean; isNeon: boolean; message?: string }> {
  const sql = getDbClient();
  if (!sql) {
    return { success: true, isNeon: false, message: 'Local Mode (Set DATABASE_URL in .env.local to connect Neon DB)' };
  }

  if (global._neonDbStore?.isInitialized) {
    return { success: true, isNeon: true, message: 'Connected to Neon PostgreSQL' };
  }

  try {
    // Create Users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        rewards_balance NUMERIC(15, 2) DEFAULT 8573020.22,
        upcoming_rewards NUMERIC(15, 2) DEFAULT 167290.62,
        is_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Create Transactions table
    await sql`
      CREATE TABLE IF NOT EXISTS transactions (
        id VARCHAR(100) PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        date VARCHAR(100) NOT NULL,
        amount NUMERIC(15, 2) NOT NULL,
        is_negative BOOLEAN NOT NULL,
        coins INTEGER,
        recipient VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Seed default admin if table is empty
    const existingUsers = await sql`SELECT id FROM users LIMIT 1`;
    if (existingUsers.length === 0) {
      await sql`
        INSERT INTO users (username, password, rewards_balance, upcoming_rewards, is_admin)
        VALUES 
          ('admin', 'admin123', 8573020.22, 167290.62, TRUE),
          ('asxa', '123', 8573020.22, 167290.62, FALSE);
      `;
    } else {
      // Ensure admin password is valid
      await sql`UPDATE users SET password = 'admin123' WHERE username = 'admin' AND password = '••••••••'`;
    }

    if (global._neonDbStore) global._neonDbStore.isInitialized = true;
    return { success: true, isNeon: true, message: 'Connected to Neon PostgreSQL & Schema Ready' };
  } catch (err: any) {
    console.error('Neon DB Schema Init Error:', err);
    return { success: false, isNeon: true, message: `Database error: ${err.message}` };
  }
}

// User CRUD Operations
export async function getUserByUsername(username: string): Promise<UserRecord | null> {
  const clean = username.trim().toLowerCase();
  const sql = getDbClient();

  if (sql) {
    try {
      await initDatabase();
      const rows = await sql`SELECT * FROM users WHERE LOWER(username) = ${clean} LIMIT 1`;
      if (rows.length > 0) {
        const u = rows[0];
        return {
          id: u.id,
          username: u.username,
          password: u.password,
          rewards_balance: parseFloat(u.rewards_balance),
          upcoming_rewards: parseFloat(u.upcoming_rewards),
          is_admin: !!u.is_admin,
          created_at: u.created_at
        };
      }
      return null;
    } catch (e) {
      console.error('Error fetching user from Neon DB:', e);
    }
  }

  // Fallback memory search
  const found = global._neonDbStore?.memoryUsers.find(u => u.username.toLowerCase() === clean);
  return found || null;
}

export async function getAllUsers(): Promise<UserRecord[]> {
  const sql = getDbClient();
  if (sql) {
    try {
      await initDatabase();
      const rows = await sql`SELECT id, username, password, rewards_balance, upcoming_rewards, is_admin, created_at FROM users ORDER BY id ASC`;
      return rows.map((u: any) => ({
        id: u.id,
        username: u.username,
        password: u.password,
        rewards_balance: parseFloat(u.rewards_balance),
        upcoming_rewards: parseFloat(u.upcoming_rewards),
        is_admin: !!u.is_admin,
        created_at: u.created_at
      }));
    } catch (e) {
      console.error('Error getting all users from Neon DB:', e);
    }
  }

  return global._neonDbStore?.memoryUsers || [];
}

export async function createUser(
  username: string,
  password: string,
  rewards_balance: number = 8573020.22,
  upcoming_rewards: number = 167290.62,
  is_admin: boolean = false
): Promise<UserRecord> {
  const clean = username.trim();
  const sql = getDbClient();

  if (sql) {
    await initDatabase();
    const rows = await sql`
      INSERT INTO users (username, password, rewards_balance, upcoming_rewards, is_admin)
      VALUES (${clean}, ${password}, ${rewards_balance}, ${upcoming_rewards}, ${is_admin})
      RETURNING id, username, password, rewards_balance, upcoming_rewards, is_admin, created_at;
    `;
    const u = rows[0];
    return {
      id: u.id,
      username: u.username,
      password: u.password,
      rewards_balance: parseFloat(u.rewards_balance),
      upcoming_rewards: parseFloat(u.upcoming_rewards),
      is_admin: !!u.is_admin,
      created_at: u.created_at
    };
  }

  // Memory store
  const newId = (global._neonDbStore?.memoryUsers.length || 0) + 1;
  const newUser: UserRecord = {
    id: newId,
    username: clean,
    password,
    rewards_balance,
    upcoming_rewards,
    is_admin,
    created_at: new Date().toISOString()
  };
  global._neonDbStore?.memoryUsers.push(newUser);
  return newUser;
}

export async function updateUserBalance(
  userId: number,
  newBalance: number,
  newUpcoming?: number
): Promise<boolean> {
  const sql = getDbClient();
  if (sql) {
    try {
      if (newUpcoming !== undefined) {
        await sql`UPDATE users SET rewards_balance = ${newBalance}, upcoming_rewards = ${newUpcoming} WHERE id = ${userId}`;
      } else {
        await sql`UPDATE users SET rewards_balance = ${newBalance} WHERE id = ${userId}`;
      }
      return true;
    } catch (e) {
      console.error('Error updating balance in Neon DB:', e);
      return false;
    }
  }

  if (global._neonDbStore) {
    const u = global._neonDbStore.memoryUsers.find(x => x.id === userId);
    if (u) {
      u.rewards_balance = newBalance;
      if (newUpcoming !== undefined) u.upcoming_rewards = newUpcoming;
      return true;
    }
  }
  return false;
}

export async function deleteUser(userId: number): Promise<boolean> {
  const sql = getDbClient();
  if (sql) {
    try {
      await sql`DELETE FROM users WHERE id = ${userId}`;
      return true;
    } catch (e) {
      return false;
    }
  }

  if (global._neonDbStore) {
    global._neonDbStore.memoryUsers = global._neonDbStore.memoryUsers.filter(u => u.id !== userId);
    return true;
  }
  return false;
}

// Transaction Operations
export async function addTransaction(
  userId: number,
  title: string,
  date: string,
  amount: number,
  isNegative: boolean,
  coins?: number,
  recipient?: string
): Promise<TransactionRecord> {
  const id = `tx-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
  const sql = getDbClient();

  if (sql) {
    try {
      await sql`
        INSERT INTO transactions (id, user_id, title, date, amount, is_negative, coins, recipient)
        VALUES (${id}, ${userId}, ${title}, ${date}, ${amount}, ${isNegative}, ${coins || null}, ${recipient || null});
      `;
    } catch (e) {
      console.error('Error adding transaction in Neon DB:', e);
    }
  }

  const newTx: TransactionRecord = {
    id,
    user_id: userId,
    title,
    date,
    amount,
    is_negative: isNegative,
    coins,
    recipient,
    created_at: new Date().toISOString()
  };

  if (global._neonDbStore) {
    global._neonDbStore.memoryTransactions.unshift(newTx);
  }
  return newTx;
}

export async function getUserTransactions(userId: number): Promise<TransactionRecord[]> {
  const sql = getDbClient();
  if (sql) {
    try {
      const rows = await sql`SELECT * FROM transactions WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT 50`;
      return rows.map((r: any) => ({
        id: r.id,
        user_id: r.user_id,
        title: r.title,
        date: r.date,
        amount: parseFloat(r.amount),
        is_negative: !!r.is_negative,
        coins: r.coins ? parseInt(r.coins, 10) : undefined,
        recipient: r.recipient || undefined,
        created_at: r.created_at
      }));
    } catch (e) {
      console.error('Error fetching transactions from Neon DB:', e);
    }
  }

  return global._neonDbStore?.memoryTransactions.filter(t => t.user_id === userId) || [];
}
