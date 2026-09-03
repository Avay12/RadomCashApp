import { NextRequest, NextResponse } from 'next/server';
import { getAllUsers, createUser, updateUserBalance, deleteUser, getUserByUsername, initDatabase } from '@/lib/db';

export async function GET() {
  try {
    await initDatabase();
    const users = await getAllUsers();
    return NextResponse.json({ success: true, users });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { username, password, rewards_balance, upcoming_rewards, is_admin } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    const existing = await getUserByUsername(username);
    if (existing) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 400 });
    }

    const newUser = await createUser(
      username,
      password,
      parseFloat(rewards_balance) || 0,
      parseFloat(upcoming_rewards) || 0,
      !!is_admin
    );

    return NextResponse.json({ success: true, user: newUser });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId, rewards_balance, upcoming_rewards } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const updated = await updateUserBalance(
      parseInt(userId, 10),
      parseFloat(rewards_balance) || 0,
      upcoming_rewards !== undefined ? parseFloat(upcoming_rewards) : undefined
    );

    return NextResponse.json({ success: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const deleted = await deleteUser(parseInt(userId, 10));
    return NextResponse.json({ success: deleted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
