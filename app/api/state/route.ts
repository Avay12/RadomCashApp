import { NextRequest, NextResponse } from 'next/server';

interface AppState {
  rewardsBalance: number;
  upcomingRewards: number;
  coinRatio: number;
  transactions: Array<{
    id: string;
    title: string;
    date: string;
    amount: number;
    isNegative: boolean;
    coins?: number;
    recipient?: string;
  }>;
}

declare global {
  var _appState: AppState | undefined;
}

global._appState = global._appState || {
  rewardsBalance: 8573020.22,
  upcomingRewards: 167290.62,
  coinRatio: 706416866 / 8573020.22,
  transactions: [
    {
      id: 'tx-1',
      title: 'Sent 250 Coins to @user',
      date: '6/9/2026 06:22:20',
      amount: -3.03,
      isNegative: true,
      coins: 250,
      recipient: 'user'
    },
    {
      id: 'tx-2',
      title: 'LIVE Payout',
      date: '6/1/2026 12:00:00',
      amount: 1276819.98,
      isNegative: false
    }
  ]
};

export async function GET() {
  return NextResponse.json(global._appState);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rewardsBalance, upcomingRewards } = body;
    if (rewardsBalance !== undefined && global._appState) {
      global._appState.rewardsBalance = parseFloat(rewardsBalance);
    }
    if (upcomingRewards !== undefined && global._appState) {
      global._appState.upcomingRewards = parseFloat(upcomingRewards);
    }
    return NextResponse.json(global._appState);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update state' }, { status: 500 });
  }
}
