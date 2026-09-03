import { NextRequest, NextResponse } from 'next/server';
import { getUserByUsername, updateUserBalance, addTransaction, initDatabase } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { username, coins, amountUsd, authUsername } = await request.json();
    const numCoins = parseInt(coins, 10);
    const cost = parseFloat(amountUsd);

    if (!numCoins || isNaN(cost) || cost <= 0) {
      return NextResponse.json({ error: 'Invalid exchange details' }, { status: 400 });
    }

    await initDatabase();

    // Find the logged-in account or default account
    const activeUsername = authUsername || 'admin';
    const user = await getUserByUsername(activeUsername);

    if (!user) {
      return NextResponse.json({ error: 'User account not found' }, { status: 404 });
    }

    const currentBalance = user.rewards_balance;
    const newBalance = Math.max(0, currentBalance - cost);

    await updateUserBalance(user.id, newBalance);

    const now = new Date();
    const dateFormatted = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    
    const newTx = await addTransaction(
      user.id,
      `Sent ${numCoins.toLocaleString()} Coins to @${username}`,
      dateFormatted,
      -cost,
      true,
      numCoins,
      username
    );

    return NextResponse.json({
      success: true,
      transaction: newTx,
      updatedBalance: newBalance,
      completedAt: now.toLocaleString('en-US')
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Exchange failed' }, { status: 500 });
  }
}
