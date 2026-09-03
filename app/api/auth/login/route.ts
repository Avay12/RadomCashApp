import { NextRequest, NextResponse } from 'next/server';
import { getUserByUsername, getUserTransactions, initDatabase } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();
    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    await initDatabase();
    const user = await getUserByUsername(username);

    if (!user) {
      return NextResponse.json({ error: 'User not found. Please contact admin.' }, { status: 404 });
    }

    // Password check
    if (user.password && password !== user.password) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    const txs = await getUserTransactions(user.id);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        rewards_balance: user.rewards_balance,
        upcoming_rewards: user.upcoming_rewards,
        is_admin: user.is_admin
      },
      transactions: txs
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Login failed' }, { status: 500 });
  }
}
