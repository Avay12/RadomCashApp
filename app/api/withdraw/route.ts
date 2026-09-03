import { NextRequest, NextResponse } from 'next/server';
import { getUserByUsername, updateUserBalance, addTransaction, initDatabase } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { amount, authUsername } = await request.json();
    const withdrawAmount = parseFloat(amount);

    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      return NextResponse.json({ error: 'Invalid withdraw amount' }, { status: 400 });
    }

    await initDatabase();

    const activeUsername = authUsername || 'admin';
    const user = await getUserByUsername(activeUsername);

    if (!user) {
      return NextResponse.json({ error: 'User account not found' }, { status: 404 });
    }

    const currentBalance = user.rewards_balance;
    if (withdrawAmount > currentBalance) {
      return NextResponse.json({ error: 'Insufficient funds' }, { status: 400 });
    }

    const newBalance = Math.max(0, currentBalance - withdrawAmount);
    await updateUserBalance(user.id, newBalance);

    const now = new Date();
    const dateFormatted = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const newTx = await addTransaction(
      user.id,
      'Withdrawal to Bank',
      dateFormatted,
      -withdrawAmount,
      true
    );

    return NextResponse.json({
      success: true,
      transaction: newTx,
      updatedBalance: newBalance,
      completedAt: now.toLocaleString('en-US')
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Withdrawal failed' }, { status: 500 });
  }
}
