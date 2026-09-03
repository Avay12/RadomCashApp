// =========================================================
// TIKTOK COIN EXCHANGER & LIVE REWARDS - APP CONTROLLER
// =========================================================

// State
let appState = {
  rewardsBalance: 8573020.22,
  upcomingRewards: 167290.62,
  coinRatio: 706416866 / 8573020.22,
  currentUsername: 'asxa',
  currentUserProfile: null,
  selectedPreset: { coins: 500, usd: 6.07 },
  customCoins: 288,
  isCustomActive: false,
  transactions: []
};

// Numpad state
let numpadValue = '2';

// DOM elements cache
let el = {};

document.addEventListener('DOMContentLoaded', () => {
  cacheElements();
  initEventListeners();
  loadInitialState();
});

function cacheElements() {
  el.screenLogin = document.getElementById('screen-login');
  el.screenApp = document.getElementById('screen-app-container');
  el.viewRewards = document.getElementById('view-rewards');
  el.viewExchange = document.getElementById('view-exchange');

  el.inputUsername = document.getElementById('input-tiktok-username');
  el.btnClearUsername = document.getElementById('btn-clear-username');
  el.userLoadingState = document.getElementById('user-loading-state');
  el.searchingLabel = document.getElementById('searching-label');
  el.userProfileCard = document.getElementById('user-profile-card');
  el.userAvatarImg = document.getElementById('user-avatar-img');
  el.userDisplayHandle = document.getElementById('user-display-handle');
  el.userFollowersCount = document.getElementById('user-followers-count');
  el.userFollowingCount = document.getElementById('user-following-count');

  el.customSheet = document.getElementById('custom-sheet-overlay');
  el.customCoinDisplay = document.getElementById('custom-coin-input-display');
  el.customEquivEur = document.getElementById('custom-equiv-eur');
  el.customEquivUsd = document.getElementById('custom-equiv-usd');
  el.sheetTotalVal = document.getElementById('sheet-total-val');
  el.customAmountPlaceholder = document.getElementById('custom-amount-placeholder');
  el.customTriggerBtn = document.getElementById('btn-custom-amount-trigger');

  el.modalConfirm = document.getElementById('modal-confirm-exchange');
  el.confirmTitle = document.getElementById('confirm-modal-title');
  el.confirmDesc = document.getElementById('confirm-modal-desc');

  el.modalReceipt = document.getElementById('modal-completed-receipt');
  el.receiptCoinsHighlight = document.getElementById('receipt-coins-highlight');
  el.receiptRecipientVal = document.getElementById('receipt-recipient-val');
  el.receiptCoinsVal = document.getElementById('receipt-coins-val');
  el.receiptDeductedVal = document.getElementById('receipt-deducted-val');
  el.receiptTimeVal = document.getElementById('receipt-time-val');

  el.modalSettings = document.getElementById('modal-settings');
  el.txList = document.getElementById('tx-list');
}

function initEventListeners() {
  // Toggle password visibility in login
  const btnTogglePwd = document.getElementById('btn-toggle-pwd');
  const pwdInput = document.getElementById('password');
  if (btnTogglePwd && pwdInput) {
    btnTogglePwd.addEventListener('click', () => {
      if (pwdInput.type === 'password') {
        pwdInput.type = 'text';
      } else {
        pwdInput.type = 'password';
      }
    });
  }

  // Username input typing & debounced live search
  let searchTimeout = null;
  el.inputUsername.addEventListener('input', (e) => {
    const val = e.target.value.trim().replace(/^@/, '');
    const wrapper = document.getElementById('username-search-wrapper');

    if (val.length > 0) {
      wrapper.classList.add('has-value');
      el.btnClearUsername.classList.add('active');
    } else {
      wrapper.classList.remove('has-value');
      el.btnClearUsername.classList.remove('active');
    }

    if (searchTimeout) clearTimeout(searchTimeout);

    if (!val) {
      el.userLoadingState.style.display = 'none';
      el.userProfileCard.style.display = 'none';
      return;
    }

    // Show red loading spinner immediately
    el.userProfileCard.style.display = 'none';
    el.searchingLabel.textContent = `Searching @${val}...`;
    el.userLoadingState.style.display = 'flex';

    searchTimeout = setTimeout(() => {
      fetchTikTokAccount(val);
    }, 450);
  });
}

// Fetch initial data from backend API
async function loadInitialState() {
  try {
    const res = await fetch('/api/state');
    if (res.ok) {
      const data = await res.json();
      appState.rewardsBalance = data.rewardsBalance;
      appState.upcomingRewards = data.upcomingRewards;
      appState.transactions = data.transactions || [];
    }
  } catch (err) {
    console.log('Using local state default');
  }
  updateBalanceDisplays();
  renderTransactions();
}

function updateBalanceDisplays() {
  const formattedUsd = '$' + appState.rewardsBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formattedUpcoming = '$' + appState.upcomingRewards.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const calculatedCoins = Math.round(appState.rewardsBalance * appState.coinRatio).toLocaleString('en-US');

  document.querySelectorAll('.display-balance-usd').forEach(item => item.textContent = formattedUsd);
  document.querySelectorAll('.display-upcoming-usd').forEach(item => item.textContent = formattedUpcoming);
  document.querySelectorAll('.display-balance-coins').forEach(item => item.textContent = calculatedCoins);
}

function renderTransactions() {
  if (!el.txList) return;
  el.txList.innerHTML = '';

  appState.transactions.forEach(tx => {
    const item = document.createElement('div');
    item.className = 'tx-item';
    
    const formattedAmount = (tx.isNegative ? '-' : '+') + '$' + Math.abs(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const amountClass = tx.isNegative ? 'negative' : 'positive';

    item.innerHTML = `
      <div class="tx-item-left">
        <div class="tx-item-title">${escapeHtml(tx.title)}</div>
        <div class="tx-item-date">${escapeHtml(tx.date)}</div>
      </div>
      <div class="tx-item-amount ${amountClass}">${formattedAmount}</div>
    `;
    el.txList.appendChild(item);
  });
}

// Real TikTok Profile Fetcher
async function fetchTikTokAccount(username) {
  try {
    const res = await fetch(`/api/tiktok/user/${encodeURIComponent(username)}`);
    if (!res.ok) throw new Error('Account lookup failed');
    const data = await res.json();

    appState.currentUsername = data.username;
    appState.currentUserProfile = data;

    // Populate profile card
    el.userAvatarImg.src = data.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${data.username}`;
    el.userDisplayHandle.textContent = `@${data.username}`;
    el.userFollowersCount.textContent = `${formatStatNumber(data.followerCount)} followers`;
    el.userFollowingCount.textContent = `${formatStatNumber(data.followingCount)} following`;

    el.userLoadingState.style.display = 'none';
    el.userProfileCard.style.display = 'flex';
  } catch (err) {
    // Fallback profile if API network error
    el.userAvatarImg.src = `https://api.dicebear.com/7.x/adventurer/svg?seed=${username}`;
    el.userDisplayHandle.textContent = `@${username}`;
    el.userFollowersCount.textContent = `45 followers`;
    el.userFollowingCount.textContent = `2 following`;

    el.userLoadingState.style.display = 'none';
    el.userProfileCard.style.display = 'flex';
  }
}

function formatStatNumber(num) {
  if (!num) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function clearUsernameInput() {
  el.inputUsername.value = '';
  document.getElementById('username-search-wrapper').classList.remove('has-value');
  el.btnClearUsername.classList.remove('active');
  el.userLoadingState.style.display = 'none';
  el.userProfileCard.style.display = 'none';
  el.inputUsername.focus();
}

// Screen Navigation
function navigateToScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(screenId);
  if (target) {
    target.classList.add('active');
  }
}

function showView(viewId) {
  document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active'));
  const target = document.getElementById(viewId);
  if (target) {
    target.classList.add('active');
  }
}

// Login Handler
function handleLogin() {
  const btn = document.getElementById('btn-login-submit');
  btn.textContent = 'Signing in...';
  btn.style.opacity = '0.8';

  setTimeout(() => {
    btn.textContent = 'Log in';
    btn.style.opacity = '1';
    navigateToScreen('screen-app-container');
    showView('view-rewards');
  }, 400);
}

function openExchangeView() {
  showView('view-exchange');
  // Auto-search default user '@asxa' as in screenshot if input is empty
  if (!el.inputUsername.value) {
    el.inputUsername.value = 'asxa';
    el.inputUsername.dispatchEvent(new Event('input'));
  }
}

function openWithdrawModal() {
  alert('Daily withdrawal limit: $1,000/$1,000 available.');
}

function closeBanner() {
  const banner = document.getElementById('scaled-rewards-banner');
  if (banner) banner.style.display = 'none';
}

function handleContactAdmin(e) {
  e.preventDefault();
  openSettingsModal();
}

// Preset Selection
function selectPreset(cardElement) {
  document.querySelectorAll('.preset-card').forEach(c => c.classList.remove('active'));
  cardElement.classList.add('active');

  const coins = parseInt(cardElement.dataset.coins, 10);
  const usd = parseFloat(cardElement.dataset.usd);

  appState.selectedPreset = { coins, usd };
  appState.isCustomActive = false;

  // Reset custom trigger styling
  el.customTriggerBtn.classList.remove('has-custom');
  el.customAmountPlaceholder.textContent = 'Enter a custom number or amount';
}

// Custom Amount Bottom Sheet Flow
function openCustomAmountSheet() {
  numpadValue = numpadValue || '2';
  updateNumpadDisplay();
  el.customSheet.style.display = 'flex';
}

function closeCustomAmountSheet(event) {
  if (event && event.target !== el.customSheet && !event.target.classList.contains('sheet-close-btn')) {
    return;
  }
  el.customSheet.style.display = 'none';
}

function handleNumpadDigit(digit) {
  if (numpadValue === '0' || numpadValue === '') {
    numpadValue = digit === '000' ? '0' : digit;
  } else {
    if (numpadValue.length < 9) {
      numpadValue += digit;
    }
  }
  updateNumpadDisplay();
}

function handleNumpadBackspace() {
  if (numpadValue.length > 1) {
    numpadValue = numpadValue.slice(0, -1);
  } else {
    numpadValue = '0';
  }
  updateNumpadDisplay();
}

function handleNumpadAll() {
  // Convert full available balance to coins
  const maxCoins = Math.floor(appState.rewardsBalance * appState.coinRatio);
  numpadValue = maxCoins.toString();
  updateNumpadDisplay();
}

function updateNumpadDisplay() {
  const coins = parseInt(numpadValue, 10) || 0;
  el.customCoinDisplay.textContent = coins.toLocaleString('en-US');

  // Exact TikTok coin rate math (approx ~$0.0121 per coin)
  const usdCost = (coins * 0.01208333).toFixed(2);
  const eurCost = (coins * 0.0112).toFixed(2);

  el.customEquivEur.textContent = `€${eurCost}`;
  el.customEquivUsd.textContent = `$${usdCost}`;
  el.sheetTotalVal.textContent = `$${usdCost}`;
}

function submitCustomAmount() {
  const coins = parseInt(numpadValue, 10) || 0;
  if (coins <= 0) return;

  const usdCost = parseFloat((coins * 0.01208333).toFixed(2));

  appState.customCoins = coins;
  appState.isCustomActive = true;

  // Unselect preset cards
  document.querySelectorAll('.preset-card').forEach(c => c.classList.remove('active'));

  // Mark custom trigger as active
  el.customTriggerBtn.classList.add('has-custom');
  el.customAmountPlaceholder.textContent = `${coins.toLocaleString('en-US')} Coins ($${usdCost.toFixed(2)})`;

  // Close sheet
  el.customSheet.style.display = 'none';

  // Open confirmation modal for exchange
  triggerConfirmModal(coins, usdCost);
}

// Exchange Flow & Confirmation Modal
function initiateExchange() {
  let coins = 0;
  let usd = 0;

  if (appState.isCustomActive) {
    coins = appState.customCoins;
    usd = parseFloat((coins * 0.01208333).toFixed(2));
  } else if (appState.selectedPreset) {
    coins = appState.selectedPreset.coins;
    usd = appState.selectedPreset.usd;
  }

  if (!coins || coins <= 0) {
    alert('Please choose or enter a coin amount to exchange.');
    return;
  }

  triggerConfirmModal(coins, usd);
}

function triggerConfirmModal(coins, usdCost) {
  const handle = el.inputUsername.value.trim().replace(/^@/, '') || appState.currentUsername || 'asxa';
  appState.currentUsername = handle;

  el.confirmTitle.textContent = `Complete exchange for ${coins.toLocaleString('en-US')} Coins?`;
  el.confirmDesc.textContent = `$${usdCost.toFixed(2)} will be deducted from estimated LIVE rewards`;

  el.modalConfirm.style.display = 'flex';
}

function closeConfirmModal() {
  el.modalConfirm.style.display = 'none';
}

async function executeConfirmedExchange() {
  const completeBtn = document.getElementById('btn-confirm-complete');
  completeBtn.textContent = 'Processing...';

  let coins = appState.isCustomActive ? appState.customCoins : appState.selectedPreset.coins;
  let usdCost = appState.isCustomActive ? parseFloat((coins * 0.01208333).toFixed(2)) : appState.selectedPreset.usd;
  let username = el.inputUsername.value.trim().replace(/^@/, '') || appState.currentUsername || 'asxa';

  try {
    const res = await fetch('/api/exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        coins,
        amountUsd: usdCost
      })
    });

    if (res.ok) {
      const data = await res.json();
      appState.rewardsBalance = data.updatedState.rewardsBalance;
      appState.transactions = data.updatedState.transactions;
      showCompletedReceipt(username, coins, usdCost, data.completedAt);
    } else {
      throw new Error('Exchange failed');
    }
  } catch (err) {
    // Local fallback deduction
    appState.rewardsBalance = Math.max(0, appState.rewardsBalance - usdCost);
    const now = new Date();
    const formattedDate = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}, ${now.toLocaleTimeString('en-US')}`;
    
    appState.transactions.unshift({
      id: `tx-${Date.now()}`,
      title: `Sent ${coins.toLocaleString()} Coins to @${username}`,
      date: formattedDate,
      amount: -usdCost,
      isNegative: true,
      coins,
      recipient: username
    });

    showCompletedReceipt(username, coins, usdCost, formattedDate);
  } finally {
    completeBtn.textContent = 'Complete';
    closeConfirmModal();
  }
}

// Completed Receipt Screen
function showCompletedReceipt(username, coins, usdCost, timeStr) {
  el.receiptCoinsHighlight.textContent = `${coins.toLocaleString('en-US')} Coins`;
  el.receiptRecipientVal.textContent = `@${username}`;
  el.receiptCoinsVal.textContent = `${coins.toLocaleString('en-US')} Coins`;
  el.receiptDeductedVal.textContent = `$${usdCost.toFixed(2)}`;
  el.receiptTimeVal.textContent = timeStr || new Date().toLocaleString('en-US');

  el.modalReceipt.style.display = 'flex';
}

function closeReceiptAndRefresh() {
  el.modalReceipt.style.display = 'none';
  updateBalanceDisplays();
  renderTransactions();
  // Return to Exchange view with updated balance (matching image 5)
  showView('view-exchange');
}

// Settings Modal
function openSettingsModal() {
  document.getElementById('setting-balance-usd').value = appState.rewardsBalance.toFixed(2);
  document.getElementById('setting-upcoming-usd').value = appState.upcomingRewards.toFixed(2);
  document.getElementById('setting-default-handle').value = appState.currentUsername;
  el.modalSettings.style.display = 'flex';
}

function closeSettingsModal(e) {
  if (e && e.target !== el.modalSettings && !e.target.classList.contains('sheet-close-btn')) {
    return;
  }
  el.modalSettings.style.display = 'none';
}

async function saveSettings() {
  const newBal = parseFloat(document.getElementById('setting-balance-usd').value);
  const newUp = parseFloat(document.getElementById('setting-upcoming-usd').value);
  const handle = document.getElementById('setting-default-handle').value.trim();

  if (!isNaN(newBal)) appState.rewardsBalance = newBal;
  if (!isNaN(newUp)) appState.upcomingRewards = newUp;
  if (handle) appState.currentUsername = handle;

  try {
    await fetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rewardsBalance: appState.rewardsBalance, upcomingRewards: appState.upcomingRewards })
    });
  } catch (e) {}

  updateBalanceDisplays();
  el.modalSettings.style.display = 'none';
}

function resetDefaults() {
  appState.rewardsBalance = 8573020.22;
  appState.upcomingRewards = 167290.62;
  appState.currentUsername = 'asxa';
  saveSettings();
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
