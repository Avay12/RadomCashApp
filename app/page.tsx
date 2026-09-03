'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';

interface Transaction {
  id: string;
  title: string;
  date: string;
  amount: number;
  isNegative: boolean;
  coins?: number;
  recipient?: string;
}

interface UserProfile {
  username: string;
  nickname: string;
  avatar: string;
  followerCount: number | string;
  followingCount: number | string;
  verified?: boolean;
}

interface UserAccount {
  id: number;
  username: string;
  password?: string;
  rewards_balance: number;
  upcoming_rewards: number;
  is_admin: boolean;
  created_at?: string;
}

interface PresetOption {
  coins: number;
  usd: number;
}

function MainApp() {

  // Screen and View State
  const [currentScreen, setCurrentScreen] = useState<'login' | 'app' | 'admin'>('login');
  const [currentView, setCurrentView] = useState<'rewards' | 'exchange' | 'receipt'>('rewards');
  
  // Logged-in User State
  const [activeAccount, setActiveAccount] = useState<UserAccount>({
    id: 1,
    username: 'admin',
    rewards_balance: 8573020.22,
    upcoming_rewards: 167290.62,
    is_admin: true
  });

  // Login form state
  const [loginUser, setLoginUser] = useState<string>('');
  const [loginPass, setLoginPass] = useState<string>('');
  const [showPass, setShowPass] = useState<boolean>(false);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string>('');

  // App Balances & Transactions State
  const [rewardsBalance, setRewardsBalance] = useState<number>(8573020.22);
  const [displayedRewardsBalance, setDisplayedRewardsBalance] = useState<number>(8573020.22);
  const [isDecreasingBalance, setIsDecreasingBalance] = useState<boolean>(false);
  const [upcomingRewards, setUpcomingRewards] = useState<number>(167290.62);
  const [transactions, setTransactions] = useState<Transaction[]>([
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
  ]);
  const coinRatio = 706416866 / 8573020.22;

  // Withdraw Modal State
  const [showWithdrawModal, setShowWithdrawModal] = useState<boolean>(false);
  const [withdrawAmountInput, setWithdrawAmountInput] = useState<string>('1000');
  const [isWithdrawing, setIsWithdrawing] = useState<boolean>(false);

  // Top Notification Pop-up State
  const [showNotification, setShowNotification] = useState<boolean>(false);
  const notificationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Smooth decreasing number animation
  const prevBalanceRef = useRef<number>(8573020.22);

  const animateBalanceCountDown = (fromVal: number, toVal: number, duration: number = 1400) => {
    if (fromVal === toVal) return;
    setIsDecreasingBalance(true);
    const startTime = performance.now();

    const step = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = fromVal + (toVal - fromVal) * ease;
      setDisplayedRewardsBalance(current);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        setDisplayedRewardsBalance(toVal);
        setIsDecreasingBalance(false);
      }
    };
    requestAnimationFrame(step);
  };

  // Banner State
  const [showBanner, setShowBanner] = useState<boolean>(true);

  // TikTok Account Search State
  const [usernameInput, setUsernameInput] = useState<string>('');
  const [isSearchingUser, setIsSearchingUser] = useState<boolean>(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Presets & Custom Selection State (No preset selected by default)
  const [selectedPreset, setSelectedPreset] = useState<PresetOption | null>(null);
  const [isCustomActive, setIsCustomActive] = useState<boolean>(false);
  const [customCoins, setCustomCoins] = useState<number>(0);

  // Custom Numpad Bottom Sheet State
  const [showCustomSheet, setShowCustomSheet] = useState<boolean>(false);
  const [numpadValue, setNumpadValue] = useState<string>('');

  // Confirmation Modal State
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [confirmDetails, setConfirmDetails] = useState<{ coins: number; usd: number; username: string }>({
    coins: 250,
    usd: 3.03,
    username: 'user'
  });
  const [isCompletingExchange, setIsCompletingExchange] = useState<boolean>(false);

  // Receipt State
  const [receiptDetails, setReceiptDetails] = useState<{
    recipient: string;
    coins: number;
    amount: number;
    time: string;
  }>({
    recipient: 'asxa',
    coins: 288,
    amount: 3.48,
    time: '9/3/2026, 12:27:31 PM'
  });

  // Admin Dashboard State
  const [adminUsers, setAdminUsers] = useState<UserAccount[]>([]);
  const [newUsername, setNewUsername] = useState<string>('');
  const [newUserPassword, setNewUserPassword] = useState<string>('');
  const [newUserBalance, setNewUserBalance] = useState<string>('8573020.22');
  const [newUserUpcoming, setNewUserUpcoming] = useState<string>('167290.62');
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editBalanceInput, setEditBalanceInput] = useState<string>('');
  const [adminSuccessMsg, setAdminSuccessMsg] = useState<string>('');
  const [adminErrorMsg, setAdminErrorMsg] = useState<string>('');

  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load Admin Data on demand
  const loadAdminData = async () => {
    try {
      const usersRes = await fetch('/api/admin/users');
      if (usersRes.ok) {
        const data = await usersRes.json();
        setAdminUsers(data.users || []);
      }
    } catch (e) {}
  };

  // Live TikTok user fetch with debounce
  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/^@/, '');
    setUsernameInput(val);

    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    if (!val.trim()) {
      setIsSearchingUser(false);
      setUserProfile(null);
      return;
    }

    setIsSearchingUser(true);
    setUserProfile(null);

    searchTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/tiktok/user/${encodeURIComponent(val.trim())}`);
        if (res.ok) {
          const data: UserProfile = await res.json();
          setUserProfile(data);
        } else {
          setUserProfile({
            username: val.trim(),
            nickname: val.trim(),
            avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${val.trim()}`,
            followerCount: 45,
            followingCount: 2
          });
        }
      } catch (e) {
        setUserProfile({
          username: val.trim(),
          nickname: val.trim(),
          avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${val.trim()}`,
          followerCount: 45,
          followingCount: 2
        });
      } finally {
        setIsSearchingUser(false);
      }
    }, 450);
  };

  const clearUsername = () => {
    setUsernameInput('');
    setUserProfile(null);
    setIsSearchingUser(false);
  };

  // Login handler
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: loginUser.trim(),
          password: loginPass
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setActiveAccount(data.user);
        setRewardsBalance(data.user.rewards_balance);
        setDisplayedRewardsBalance(data.user.rewards_balance);
        setUpcomingRewards(data.user.upcoming_rewards);
        setTransactions(data.transactions || []);
        
        if (data.user.is_admin) {
          loadAdminData();
          setCurrentScreen('admin');
        } else {
          setCurrentScreen('app');
          setCurrentView('rewards');
        }
      } else {
        setLoginError(data.error || 'Invalid credentials or user not found.');
      }
    } catch (err: any) {
      setLoginError('Failed to sign in. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Quick switch or test login from admin panel
  const loginAsUser = (user: UserAccount) => {
    setActiveAccount(user);
    setRewardsBalance(user.rewards_balance);
    setDisplayedRewardsBalance(user.rewards_balance);
    setUpcomingRewards(user.upcoming_rewards);
    setCurrentScreen('app');
    setCurrentView('rewards');
  };

  // Preset Selection
  const handleSelectPreset = (coins: number, usd: number) => {
    setSelectedPreset({ coins, usd });
    setIsCustomActive(false);
  };

  // Custom Numpad Handlers
  const handleOpenCustomSheet = () => {
    setNumpadValue(numpadValue || '2');
    setShowCustomSheet(true);
  };

  const handleNumpadDigit = (digit: string) => {
    if (numpadValue === '0' || numpadValue === '') {
      setNumpadValue(digit === '000' ? '0' : digit);
    } else {
      if (numpadValue.length < 9) {
        setNumpadValue(prev => prev + digit);
      }
    }
  };

  const handleNumpadBackspace = () => {
    if (numpadValue.length > 1) {
      setNumpadValue(prev => prev.slice(0, -1));
    } else {
      setNumpadValue('0');
    }
  };

  const handleNumpadAll = () => {
    const maxCoins = Math.floor(rewardsBalance * coinRatio);
    setNumpadValue(maxCoins.toString());
  };

  const handleCustomSubmit = () => {
    const coins = parseInt(numpadValue, 10) || 0;
    if (coins <= 0) return;

    const usdCost = parseFloat((coins * 0.01208333).toFixed(2));
    setCustomCoins(coins);
    setIsCustomActive(true);
    setShowCustomSheet(false);

    // Open confirmation modal
    const handle = usernameInput.trim() || 'asxa';
    setConfirmDetails({ coins, usd: usdCost, username: handle });
    setShowConfirmModal(true);
  };

  // Initiate Exchange from main button
  const handleInitiateExchange = () => {
    let coins = 0;
    let usd = 0;

    if (isCustomActive && customCoins > 0) {
      coins = customCoins;
      usd = parseFloat((coins * 0.01208333).toFixed(2));
    } else if (selectedPreset) {
      coins = selectedPreset.coins;
      usd = selectedPreset.usd;
    } else {
      // Default to 250 preset if none was selected
      coins = 250;
      usd = 3.03;
      setSelectedPreset({ coins: 250, usd: 3.03 });
    }

    if (!coins || coins <= 0) return;

    const handle = usernameInput.trim() || 'user';
    setConfirmDetails({ coins, usd, username: handle });
    setShowConfirmModal(true);
  };

  // Execute Exchange API call
  const handleExecuteExchange = async () => {
    setIsCompletingExchange(true);
    const { coins, usd, username } = confirmDetails;
    prevBalanceRef.current = rewardsBalance;

    try {
      const res = await fetch('/api/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          coins,
          amountUsd: usd,
          authUsername: activeAccount.username
        })
      });

      if (res.ok) {
        const data = await res.json();
        setRewardsBalance(data.updatedBalance);
        if (data.transaction) {
          setTransactions(prev => [data.transaction, ...prev]);
        }
        setReceiptDetails({
          recipient: username,
          coins,
          amount: usd,
          time: data.completedAt || new Date().toLocaleString('en-US')
        });
      } else {
        throw new Error();
      }
    } catch (err) {
      // Fallback local deduction
      const newBal = Math.max(0, rewardsBalance - usd);
      setRewardsBalance(newBal);
      const nowStr = new Date().toLocaleString('en-US');
      setTransactions(prev => [
        {
          id: `tx-${Date.now()}`,
          title: `Sent ${coins.toLocaleString()} Coins to @${username}`,
          date: nowStr,
          amount: -usd,
          isNegative: true,
          coins,
          recipient: username
        },
        ...prev
      ]);
      setReceiptDetails({
        recipient: username,
        coins,
        amount: usd,
        time: nowStr
      });
    } finally {
      setIsCompletingExchange(false);
      setShowConfirmModal(false);
      setCurrentView('receipt');
    }
  };

  // Go back from Receipt to LIVE rewards with balance animation and notification pop-up
  const handleReceiptGoBack = () => {
    setCurrentView('rewards');
    animateBalanceCountDown(displayedRewardsBalance, rewardsBalance, 1400);
    setShowNotification(true);
    if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
    notificationTimerRef.current = setTimeout(() => {
      setShowNotification(false);
    }, 5000);
  };

  // Execute Withdraw
  const handleExecuteWithdraw = async () => {
    const amount = parseFloat(withdrawAmountInput) || 0;
    if (amount <= 0 || amount > rewardsBalance) return;

    setIsWithdrawing(true);
    prevBalanceRef.current = rewardsBalance;

    try {
      const res = await fetch('/api/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          authUsername: activeAccount.username
        })
      });

      if (res.ok) {
        const data = await res.json();
        setRewardsBalance(data.updatedBalance);
        if (data.transaction) {
          setTransactions(prev => [data.transaction, ...prev]);
        }
        setShowWithdrawModal(false);
        animateBalanceCountDown(displayedRewardsBalance, data.updatedBalance, 1500);
      } else {
        throw new Error();
      }
    } catch (e) {
      const newBal = Math.max(0, rewardsBalance - amount);
      setRewardsBalance(newBal);
      const nowStr = new Date().toLocaleString('en-US');
      setTransactions(prev => [
        {
          id: `tx-${Date.now()}`,
          title: 'Withdrawal to Bank',
          date: nowStr,
          amount: -amount,
          isNegative: true
        },
        ...prev
      ]);
      setShowWithdrawModal(false);
      animateBalanceCountDown(displayedRewardsBalance, newBal, 1500);
    } finally {
      setIsWithdrawing(false);
    }
  };

  // Admin Create User
  const handleAdminCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminSuccessMsg('');
    setAdminErrorMsg('');

    if (!newUsername || !newUserPassword) {
      setAdminErrorMsg('Please enter username and password');
      return;
    }

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUsername.trim(),
          password: newUserPassword,
          rewards_balance: parseFloat(newUserBalance) || 0,
          upcoming_rewards: parseFloat(newUserUpcoming) || 0,
          is_admin: false
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setAdminSuccessMsg(`User @${newUsername} created with balance $${parseFloat(newUserBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
        setNewUsername('');
        setNewUserPassword('');
        loadAdminData();
      } else {
        setAdminErrorMsg(data.error || 'Failed to create user');
      }
    } catch (e: any) {
      setAdminErrorMsg(e.message || 'Error creating user');
    }
  };

  // Admin Update Balance
  const handleAdminSaveBalance = async (userId: number) => {
    const amount = parseFloat(editBalanceInput);
    if (isNaN(amount)) return;

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, rewards_balance: amount })
      });

      if (res.ok) {
        setAdminSuccessMsg('User balance updated!');
        setEditingUserId(null);
        loadAdminData();
      }
    } catch (e) {}
  };

  // Admin Delete User
  const handleAdminDeleteUser = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      const res = await fetch(`/api/admin/users?userId=${userId}`, { method: 'DELETE' });
      if (res.ok) {
        setAdminSuccessMsg('User deleted');
        loadAdminData();
      }
    } catch (e) {}
  };

  // Math formatting helpers
  const formatUSD = (val: number) => '$' + Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatCoins = (bal: number) => Math.round(bal * coinRatio).toLocaleString('en-US');
  const numpadCoins = parseInt(numpadValue, 10) || 0;
  const numpadUsd = (numpadCoins * 0.01208333).toFixed(2);
  const numpadEur = (numpadCoins * 0.0112).toFixed(2);

  return (
    <div className="app-root" suppressHydrationWarning>
      
      {/* SCREEN 1: LOGIN PAGE */}
      <div id="screen-login" className={`screen ${currentScreen === 'login' ? 'active' : ''}`}>
        <div className="login-bg-glow"></div>
        <div className="login-card">
          <div className="login-header">
            <div className="tiktok-logo-box">
              <svg className="tiktok-svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.82 4.47 6.27 6.27 0 0 0 1.86-4.47V8.69a8.18 8.18 0 0 0 4.91 1.63V6.87a4.9 4.9 0 0 1-1-.18z"/>
              </svg>
            </div>
            <button
              className="icon-btn-settings"
              onClick={() => {
                loadAdminData();
                setCurrentScreen('admin');
              }}
              title="Open Admin Dashboard"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
            </button>
          </div>

          <div className="login-badge">SECURE EXCHANGE ACCESS</div>
          <h1 className="login-title">Coin Exchanger</h1>
          <p className="login-desc">Sign in to your exchange workspace. Your account is protected by administrator-managed timed access.</p>

          <form className="login-form" onSubmit={handleLoginSubmit}>
            <div className="form-group">
              <label htmlFor="username">USERNAME</label>
              <input
                type="text"
                id="username"
                name="username"
                className="login-input"
                value={loginUser}
                onChange={(e) => setLoginUser(e.target.value)}
                placeholder="Enter assigned username"
                autoComplete="username"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">PASSWORD</label>
              <div className="password-wrap">
                <input
                  type={showPass ? 'text' : 'password'}
                  id="password"
                  name="password"
                  className="login-input"
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="btn-pwd-eye"
                  onClick={() => setShowPass(!showPass)}
                  title={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {loginError && (
              <div style={{ color: '#ff5252', fontSize: '12px', marginBottom: '12px', fontWeight: 600 }}>
                {loginError}
              </div>
            )}

            <button type="submit" className="btn-login-emerald" disabled={isLoggingIn}>
              {isLoggingIn ? (
                <span className="btn-loading-wrap">
                  <span className="spinner-login-emerald"></span>
                  <span>Signing in...</span>
                </span>
              ) : (
                'Log in'
              )}
            </button>
          </form>

          <div className="login-footer-alerts">
            <a
              href="#"
              className="contact-admin-link"
              onClick={(e) => {
                e.preventDefault();
                alert('Please contact your administrator to request exchange access or account credentials.');
              }}
            >
              Contact admin
            </a>
            <p className="custom-hint">Use the gear to customize your exchange display</p>
          </div>
        </div>
      </div>


      {/* ADMIN DASHBOARD VIEW */}
      {currentScreen === 'admin' && (
        <div className="admin-portal-wrapper">
          <div className="admin-portal-card">
            <div className="admin-top-bar">
              <div>
                <h1 className="admin-main-title">Admin Management Dashboard</h1>
                <p className="admin-main-sub">Create user workspaces, set passwords, and manage rewards balances.</p>
              </div>
              <button
                className="btn-admin-exit"
                onClick={() => setCurrentScreen('login')}
              >
                ← Back to Login
              </button>
            </div>

            {adminSuccessMsg && <div className="admin-alert success" style={{ marginBottom: '16px' }}>{adminSuccessMsg}</div>}
            {adminErrorMsg && <div className="admin-alert error" style={{ marginBottom: '16px' }}>{adminErrorMsg}</div>}

            {/* Create New User Card */}
            <div className="admin-section-box">
              <div className="admin-section-header">
                <h3>Add New User Account</h3>
              </div>
              <form onSubmit={handleAdminCreateUser} className="admin-user-create-grid">
                <div className="form-group">
                  <label>USERNAME</label>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="e.g. trader_john"
                    className="admin-form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>PASSWORD</label>
                  <input
                    type="text"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="e.g. pass123"
                    className="admin-form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>INITIAL REWARDS BALANCE ($ USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newUserBalance}
                    onChange={(e) => setNewUserBalance(e.target.value)}
                    className="admin-form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>UPCOMING REWARDS ($ USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newUserUpcoming}
                    onChange={(e) => setNewUserUpcoming(e.target.value)}
                    className="admin-form-input"
                  />
                </div>
                <div className="admin-create-btn-wrap">
                  <button type="submit" className="btn-admin-primary">
                    + Add User & Assign Balance
                  </button>
                </div>
              </form>
            </div>

            {/* Users List & Balance Editor Table */}
            <div className="admin-section-box">
              <div className="admin-section-header">
                <h3>Registered User Accounts ({adminUsers.length})</h3>
                <button className="btn-refresh-users" onClick={loadAdminData}>↻ Refresh</button>
              </div>

              <div className="users-table-wrap">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Username</th>
                      <th>Password</th>
                      <th>Rewards Balance</th>
                      <th>Upcoming</th>
                      <th>Role</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminUsers.map((u) => (
                      <tr key={u.id}>
                        <td>#{u.id}</td>
                        <td>
                          <strong>@{u.username}</strong>
                        </td>
                        <td>
                          <code className="pwd-code">{u.password || '••••••••'}</code>
                        </td>
                        <td>
                          {editingUserId === u.id ? (
                            <div className="inline-edit-wrap">
                              <input
                                type="number"
                                step="0.01"
                                value={editBalanceInput}
                                onChange={(e) => setEditBalanceInput(e.target.value)}
                                className="inline-edit-input"
                              />
                              <button className="btn-inline-save" onClick={() => handleAdminSaveBalance(u.id)}>✓</button>
                              <button className="btn-inline-cancel" onClick={() => setEditingUserId(null)}>✕</button>
                            </div>
                          ) : (
                            <span className="user-bal-display">{formatUSD(u.rewards_balance)}</span>
                          )}
                        </td>
                        <td>{formatUSD(u.upcoming_rewards)}</td>
                        <td>
                          <span className={`role-tag ${u.is_admin ? 'admin' : 'user'}`}>
                            {u.is_admin ? 'Admin' : 'User'}
                          </span>
                        </td>
                        <td>
                          <div className="table-actions">
                            <button
                              className="btn-tbl-action"
                              title="Edit Balance"
                              onClick={() => {
                                setEditingUserId(u.id);
                                setEditBalanceInput(u.rewards_balance.toString());
                              }}
                            >
                              Edit Balance
                            </button>
                            <button
                              className="btn-tbl-action launch"
                              title="Log In As User"
                              onClick={() => loginAsUser(u)}
                            >
                              Launch App
                            </button>
                            {!u.is_admin && (
                              <button
                                className="btn-tbl-action delete"
                                title="Delete User"
                                onClick={() => handleAdminDeleteUser(u.id)}
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MOBILE APP CONTAINER (SCREENS 2, 3 & 4) */}
      <div id="screen-app-container" className={`screen ${currentScreen === 'app' ? 'active' : ''}`}>
        <div className="phone-frame">

          {/* SCREEN 2: LIVE REWARDS VIEW */}
          <div className={`app-view ${currentView === 'rewards' ? 'active' : ''}`}>
            
            {/* Top iOS / TikTok Floating Notification */}
            {showNotification && (
              <div className="top-live-rewards-notification animate-slide-down">
                <div className="notif-box-icon">
                  <svg className="tiktok-svg-notif" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.82 4.47 6.27 6.27 0 0 0 1.86-4.47V8.69a8.18 8.18 0 0 0 4.91 1.63V6.87a4.9 4.9 0 0 1-1-.18z"/>
                  </svg>
                </div>
                <div className="notif-text-wrap">
                  <div className="notif-header">
                    <span className="notif-app-name">TikTok LIVE Rewards</span>
                    <span className="notif-timestamp">Now</span>
                  </div>
                  <div className="notif-message">
                    Successfully sent coins to recipient
                  </div>
                </div>
                <button className="notif-dismiss" onClick={() => setShowNotification(false)}>✕</button>
              </div>
            )}

            <div className="view-navbar">
              <button className="nav-back-btn" onClick={() => setCurrentScreen('login')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              </button>
              <h2 className="nav-title">LIVE rewards</h2>
              <button
                className="nav-settings-btn"
                onClick={() => {
                  loadAdminData();
                  setCurrentScreen('admin');
                }}
                title="Admin Dashboard"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
              </button>
            </div>

            <div className="view-scroll-content">
              {showBanner && (
                <div className="banner-card">
                  <div className="banner-top">
                    <h3 className="banner-title">Say hi to Scaled LIVE Rewards</h3>
                    <button className="banner-close" onClick={() => setShowBanner(false)}>✕</button>
                  </div>
                  <p className="banner-text">Your dedication to quality content could get you a rewards percentage of up to 53%.</p>
                  <a href="#" className="banner-link" onClick={(e) => e.preventDefault()}>Learn more</a>
                </div>
              )}

              <div className="stats-grid">
                <div className="stat-card">
                  <span className="stat-label">Available rewards</span>
                  <span className={`stat-value ${isDecreasingBalance ? 'counting-highlight' : ''}`}>{formatUSD(displayedRewardsBalance)}</span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Upcoming rewards</span>
                  <span className="stat-value">{formatUSD(upcomingRewards)}</span>
                </div>
              </div>

              <div className="hero-balance-section">
                <span className="hero-balance-label">Available rewards</span>
                <div className={`hero-balance-val ${isDecreasingBalance ? 'counting-highlight' : ''}`}>{formatUSD(displayedRewardsBalance)}</div>
                <div className="hero-balance-sub">
                  = <span>{formatUSD(displayedRewardsBalance)}</span>
                  <span className="coin-sub-box">
                    ( <span className="tiktok-coin-icon-gold"></span> <span>{formatCoins(displayedRewardsBalance)}</span> )
                  </span>
                </div>
              </div>

              <div className="actions-section">
                <button className="btn-primary-tiktok" onClick={() => setCurrentView('exchange')}>Exchange</button>
                <button className="btn-secondary-tiktok" onClick={() => setCurrentView('exchange')}>Withdraw</button>
              </div>

              <div className="withdrawal-limit-note">
                Daily withdrawal limit (Remain/Total): $1,000/$1,000
              </div>

              <div className="transactions-section">
                <div className="tx-header">
                  <h3 className="tx-heading">Transactions</h3>
                  <div className="tx-dropdown">
                    <span>Jun 2026</span>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                      <path d="M7 10l5 5 5-5z"/>
                    </svg>
                  </div>
                </div>

                <div className="tx-list">
                  {transactions.map(tx => (
                    <div key={tx.id} className="tx-item">
                      <div className="tx-item-left">
                        <div className="tx-item-title">{tx.title}</div>
                        <div className="tx-item-date">{tx.date}</div>
                      </div>
                      <div className={`tx-item-amount ${tx.isNegative ? 'negative' : 'positive'}`}>
                        {(tx.isNegative ? '-' : '+') + formatUSD(Math.abs(tx.amount))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>


          {/* SCREEN 3: EXCHANGE VIEW */}
          <div className={`app-view ${currentView === 'exchange' ? 'active' : ''}`}>
            <div className="view-navbar">
              <button className="nav-back-btn" onClick={() => setCurrentView('rewards')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              </button>
              <h2 className="nav-title">Exchange</h2>
              <div className="nav-spacer"></div>
            </div>

            <div className="view-scroll-content">
              {/* Header Balance Banner */}
              <div className="exchange-balance-block">
                <div className="ex-bal-label">TikTok Coins Balance</div>
                <div className="ex-bal-number">{formatUSD(rewardsBalance)}</div>
                <div className="ex-bal-sub">
                  = <span>{formatUSD(rewardsBalance)}</span>
                  <span className="coin-sub-box">
                    ( <span className="tiktok-coin-icon-gold"></span> <span>{formatCoins(rewardsBalance)}</span> )
                  </span>
                </div>
                <div className="ex-bal-helper">Available balance to exchange the Coins</div>
              </div>

              {/* TikTok Username Search */}
              <div className="exchange-input-group">
                <label className="exchange-section-title">TikTok username</label>
                <div className={`input-handle-box ${usernameInput ? 'has-value' : ''}`}>
                  <span className="handle-at">@</span>
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={handleUsernameChange}
                    placeholder="your TikTok handle"
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck="false"
                  />
                  {usernameInput && (
                    <button type="button" className="btn-clear-input active" onClick={clearUsername}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  )}
                </div>

                {/* Animated Red Loader */}
                {isSearchingUser && (
                  <div className="user-loading-box">
                    <div className="loading-label">Searching @{usernameInput}...</div>
                    <div className="spinner-red-ring"></div>
                  </div>
                )}

                {/* TikTok Profile Found Card */}
                {!isSearchingUser && userProfile && (
                  <div className="user-profile-card">
                    <img
                      className="user-avatar"
                      src={userProfile.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${userProfile.username}`}
                      alt="Avatar"
                    />
                    <div className="user-info-text">
                      <div className="user-name-row">
                        <span className="user-badge-heart">🧡</span>
                        <span className="user-handle-tag">@{userProfile.username}</span>
                      </div>
                      <div className="user-stats-row">
                        <span>{userProfile.followerCount} followers</span>
                        <span>{userProfile.followingCount} following</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Presets Grid (Unselected by default) */}
              <div className="exchange-earnings-section">
                <label className="exchange-section-title">Exchange earnings for Coins</label>
                <div className="preset-cards-grid">
                  <div
                    className={`preset-card ${!isCustomActive && selectedPreset?.coins === 250 ? 'active' : ''}`}
                    onClick={() => handleSelectPreset(250, 3.03)}
                  >
                    <div className="preset-coins">
                      <span className="tiktok-coin-icon-gold"></span>
                      <span className="preset-coin-num">250</span>
                    </div>
                    <div className="preset-price">$3.03</div>
                  </div>

                  <div
                    className={`preset-card ${!isCustomActive && selectedPreset?.coins === 500 ? 'active' : ''}`}
                    onClick={() => handleSelectPreset(500, 6.07)}
                  >
                    <div className="preset-coins">
                      <span className="tiktok-coin-icon-gold"></span>
                      <span className="preset-coin-num">500</span>
                    </div>
                    <div className="preset-price">$6.07</div>
                  </div>

                  <div
                    className={`preset-card ${!isCustomActive && selectedPreset?.coins === 15000 ? 'active' : ''}`}
                    onClick={() => handleSelectPreset(15000, 182.04)}
                  >
                    <div className="preset-coins">
                      <span className="tiktok-coin-icon-gold"></span>
                      <span className="preset-coin-num">15,000</span>
                    </div>
                    <div className="preset-price">$182.04</div>
                  </div>
                </div>

                {/* Custom Amount Button */}
                <div
                  className={`custom-amount-trigger ${isCustomActive ? 'has-custom' : ''}`}
                  onClick={handleOpenCustomSheet}
                >
                  <span>
                    {isCustomActive && customCoins > 0
                      ? `${customCoins.toLocaleString('en-US')} Coins ($${(customCoins * 0.01208333).toFixed(2)})`
                      : 'Enter a custom number or amount'}
                  </span>
                </div>
              </div>

              <div className="policy-disclaimer-card">
                Coins obtained through this exchange are subject to our <strong>Virtual Items Policy</strong>. Since you are accepting your Rewards in the form of Coins, this exchange is also subject to our <strong>Rewards Policy</strong>. This exchange cannot be canceled or reversed.
              </div>
            </div>

            <div className="exchange-sticky-bottom">
              <button className="btn-primary-tiktok full" onClick={handleInitiateExchange}>
                Exchange
              </button>
            </div>
          </div>


          {/* SCREEN 4: FULL-PAGE EXCHANGE COMPLETED RECEIPT */}
          <div className={`app-view ${currentView === 'receipt' ? 'active' : ''}`}>
            <div className="view-navbar">
              <button className="nav-back-btn" onClick={handleReceiptGoBack}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              </button>
              <h2 className="nav-title">Exchange</h2>
              <div className="nav-spacer"></div>
            </div>

            <div className="view-scroll-content receipt-scroll-wrap">
              <div className="receipt-hero-center">
                <div className="receipt-success-badge-large">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <h1 className="receipt-page-title">Exchange Completed!</h1>
                <div className="receipt-page-subtitle">
                  You exchanged for <span className="tiktok-coin-icon-gold"></span> <strong>{receiptDetails.coins.toLocaleString('en-US')} Coins</strong>
                </div>
              </div>

              <div className="receipt-details-table-card">
                <div className="receipt-detail-row">
                  <span className="receipt-detail-label">Recipient</span>
                  <span className="receipt-detail-value">@{receiptDetails.recipient}</span>
                </div>
                <div className="receipt-detail-row">
                  <span className="receipt-detail-label">Coins Exchanged</span>
                  <span className="receipt-detail-value font-bold">{receiptDetails.coins.toLocaleString('en-US')} Coins</span>
                </div>
                <div className="receipt-detail-row">
                  <span className="receipt-detail-label">Deducted Amount</span>
                  <span className="receipt-detail-value font-bold">${receiptDetails.amount.toFixed(2)}</span>
                </div>
                <div className="receipt-detail-row">
                  <span className="receipt-detail-label">Time</span>
                  <span className="receipt-detail-value">{receiptDetails.time}</span>
                </div>
              </div>

              {/* Start Gifter Level Promo Card */}
              <div className="gifter-promo-card">
                <div className="gifter-icon-box">
                  <svg className="tiktok-svg" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.82 4.47 6.27 6.27 0 0 0 1.86-4.47V8.69a8.18 8.18 0 0 0 4.91 1.63V6.87a4.9 4.9 0 0 1-1-.18z"/>
                  </svg>
                </div>
                <div className="gifter-text-group">
                  <h4 className="gifter-title">Start gifter level</h4>
                  <p className="gifter-desc">Send your first Gift to begin your gifter journey and unlock more rewards as you level up.</p>
                </div>
              </div>
            </div>

            <div className="receipt-sticky-bottom">
              <button className="btn-goback-green full" onClick={handleReceiptGoBack}>
                ← Go back
              </button>
            </div>
          </div>

        </div>
      </div>


      {/* SCREEN 5: CUSTOM AMOUNT NUMPAD BOTTOM SHEET */}
      {showCustomSheet && (
        <div className="bottom-sheet-overlay" onClick={() => setShowCustomSheet(false)}>
          <div className="bottom-sheet-content" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-header">
              <div className="sheet-title">Custom</div>
              <button className="sheet-close-btn" onClick={() => setShowCustomSheet(false)}>✕</button>
            </div>

            <div className="sheet-type-dropdown">
              <span>Number of Coins</span>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path d="M7 10l5 5 5-5z"/>
              </svg>
            </div>

            <div className="custom-display-row">
              <div className="custom-coin-left">
                <span className="tiktok-coin-icon-gold lg"></span>
                <span className="custom-number-text">{numpadCoins.toLocaleString('en-US')}</span>
              </div>
              <button type="button" className="btn-all-coins" onClick={handleNumpadAll}>All</button>
            </div>

            <div className="custom-currency-equiv">
              <span>€{numpadEur}</span>
              <span className="approx-symbol">≈</span>
              <span>${numpadUsd}</span>
            </div>

            <div className="numpad-grid">
              <button type="button" className="numpad-key" onClick={() => handleNumpadDigit('1')}>1</button>
              <button type="button" className="numpad-key key-active-border" onClick={() => handleNumpadDigit('2')}>2</button>
              <button type="button" className="numpad-key" onClick={() => handleNumpadDigit('3')}>3</button>
              <button type="button" className="numpad-key key-backspace" onClick={handleNumpadBackspace}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"></path>
                  <line x1="18" y1="9" x2="12" y2="15"></line>
                  <line x1="12" y1="9" x2="18" y2="15"></line>
                </svg>
              </button>

              <button type="button" className="numpad-key" onClick={() => handleNumpadDigit('4')}>4</button>
              <button type="button" className="numpad-key" onClick={() => handleNumpadDigit('5')}>5</button>
              <button type="button" className="numpad-key" onClick={() => handleNumpadDigit('6')}>6</button>
              <button type="button" className="numpad-key" onClick={() => handleNumpadDigit('000')}>000</button>

              <button type="button" className="numpad-key" onClick={() => handleNumpadDigit('7')}>7</button>
              <button type="button" className="numpad-key" onClick={() => handleNumpadDigit('8')}>8</button>
              <button type="button" className="numpad-key" onClick={() => handleNumpadDigit('9')}>9</button>
              <button type="button" className="numpad-key" onClick={() => handleNumpadDigit('0')}>0</button>
            </div>

            <div className="numpad-policy-text">
              <span className="info-bubble">?</span>
              <span>€0.00 ≈ $0.00</span>
              Coins obtained through this exchange are subject to our <strong>Virtual Items Policy...</strong>
            </div>

            <div className="sheet-bottom-action">
              <div className="sheet-total-row">
                <span className="total-label">Total</span>
                <span className="total-val">${numpadUsd}</span>
              </div>
              <button className="btn-primary-tiktok full" onClick={handleCustomSubmit}>Exchange</button>
            </div>
          </div>
        </div>
      )}


      {/* SCREEN 6: CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div className="dialog-overlay open" id="confirmDialog" onClick={() => setShowConfirmModal(false)}>
          <div className="dialog-box" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-icon-container">
              <img src="/coin.png" alt="Coin" className="dialog-main-coin" id="dialogMainCoinImg" />
            </div>
            <div className="dialog-title" id="dialogTitleText">
              Complete exchange for {confirmDetails.coins.toLocaleString('en-US')} Coins?
            </div>
            <div className="dialog-msg" id="dialogMsgText">
              ${confirmDetails.usd.toFixed(2)} will be deducted from estimated LIVE rewards
            </div>
            <div className="dialog-actions">
              <button className="dialog-btn dialog-btn-cancel" id="cancelDialogBtn" onClick={() => setShowConfirmModal(false)}>
                Go back
              </button>
              <button
                className="dialog-btn dialog-btn-confirm"
                id="finalExchangeBtn"
                onClick={handleExecuteExchange}
                disabled={isCompletingExchange}
              >
                {isCompletingExchange ? 'Completing...' : 'Complete'}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* WITHDRAW MODAL */}
      {showWithdrawModal && (
        <div className="dialog-backdrop" onClick={() => setShowWithdrawModal(false)}>
          <div className="settings-dialog-card" onClick={(e) => e.stopPropagation()}>
            <div className="settings-modal-header">
              <h3>Withdraw Rewards</h3>
              <button className="sheet-close-btn" onClick={() => setShowWithdrawModal(false)}>✕</button>
            </div>
            <div className="settings-body">
              <div className="withdrawal-limit-note" style={{ textAlign: 'left', marginBottom: '12px' }}>
                Daily limit available: <strong>$1,000 / $1,000</strong>
              </div>
              <div className="form-group">
                <label>Withdraw Amount ($ USD)</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  max="1000"
                  value={withdrawAmountInput}
                  onChange={(e) => setWithdrawAmountInput(e.target.value)}
                  className="setting-input"
                />
              </div>
              <div className="preset-cards-grid" style={{ marginBottom: '12px' }}>
                <div className="preset-card" onClick={() => setWithdrawAmountInput('100')}>
                  <div className="preset-price" style={{ fontSize: '13px', fontWeight: 700, color: '#161823' }}>$100</div>
                </div>
                <div className="preset-card" onClick={() => setWithdrawAmountInput('500')}>
                  <div className="preset-price" style={{ fontSize: '13px', fontWeight: 700, color: '#161823' }}>$500</div>
                </div>
                <div className="preset-card" onClick={() => setWithdrawAmountInput('1000')}>
                  <div className="preset-price" style={{ fontSize: '13px', fontWeight: 700, color: '#161823' }}>$1,000</div>
                </div>
              </div>
            </div>
            <div className="settings-footer">
              <button className="btn-dialog-back" onClick={() => setShowWithdrawModal(false)}>Cancel</button>
              <button className="btn-dialog-complete" onClick={handleExecuteWithdraw} disabled={isWithdrawing}>
                {isWithdrawing ? 'Withdrawing...' : 'Withdraw Now'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

const HomePage = dynamic(() => Promise.resolve(MainApp), {
  ssr: false,
});

export default HomePage;
