/**
 * Sync manager — tracks auth mode and handles server ↔ API data operations.
 *
 * Secure mode (Supabase configured): server is the source of truth.
 *   - loadFromServer() fetches trades + goals and returns them (caller sets store state).
 *   - serverCreate/Delete/Update* functions push mutations to the server in the background.
 *
 * Local mode (no Supabase): localStorage only (managed by userStorage.js).
 *
 * No store imports here — that avoids a circular dependency with tradeStore/goalStore,
 * which import isSecureMode and the server* helpers from this file.
 */
import { tradesApi, goalsApi } from './api'

let _mode = 'local'
let _email = null
let _displayName = null

export function setSyncMode(mode) { _mode = mode }
export function getSyncMode()     { return _mode }
export function isSecureMode()    { return _mode === 'secure' }

/** Called on login/activate so stores can sync leaderboard without touching authStore. */
export function setCurrentUser(email, displayName) {
  _email       = email       || null
  _displayName = displayName || null
}

export function getCurrentUserEmail()       { return _email }
export function getCurrentUserDisplayName() { return _displayName }

/* ── Format converters ─────────────────────────────────────────── */

export function serverTradeToClient(t) {
  return {
    id:             t.id,
    date:           t.date,
    symbol:         t.symbol,
    direction:      t.direction,
    timeframe:      t.timeframe,
    assetClass:     t.asset_class,
    entryPrice:     t.entry_price,
    exitPrice:      t.exit_price,
    stopLoss:       t.stop_loss,
    takeProfit:     t.take_profit,
    positionSize:   t.position_size,
    commission:     t.commission,
    followedPlan:   t.followed_plan,
    movedStop:      t.moved_stop,
    overRisked:     t.sized_correctly,
    preTrade:       t.pre_trade,
    postTrade:      t.post_trade,
    mindsetNotes:   t.mindset_notes,
    strategyName:   t.strategy_name,
    tradeNotes:     t.trade_notes,
    scripture:      t.scripture,
    prayer:         t.prayer,
    gratitude:      t.gratitude,
    entryQuality:        t.entry_quality,
    exitQuality:         t.exit_quality,
    faithRating:         t.faith_rating,
    grossPnl:            t.gross_pnl,
    netPnl:              t.net_pnl,
    pctPnl:              t.pct_pnl,
    result:              t.result,
    createdAt:           t.created_at || new Date().toISOString(),
    // Execution extras
    waitedConfirmation:  t.waited_confirmation,
    enteredAtLevel:      t.entered_at_level,
    exitDecision:        t.exit_decision,
    rushedEntry:         t.rushed_entry,
    tradeManagement:     t.trade_management,
    // Psychology extras
    sleepQuality:        t.sleep_quality,
    focusLevel:          t.focus_level,
    stressLevel:         t.stress_level,
    energyLevel:         t.energy_level,
    revengeTrade:        t.revenge_trade,
    customAnswers:       t.custom_answers || {},
  }
}

export function clientTradeToServer(t) {
  const toNum = v => { const n = parseFloat(v); return isFinite(n) && n > 0 ? n : null }
  return {
    date:            t.date,
    symbol:          t.symbol,
    direction:       t.direction,
    timeframe:       t.timeframe,
    asset_class:     t.assetClass,
    entry_price:     toNum(t.entryPrice),
    exit_price:      toNum(t.exitPrice),
    stop_loss:       toNum(t.stopLoss)   || null,
    take_profit:     toNum(t.takeProfit) || null,
    position_size:   toNum(t.positionSize),
    commission:      parseFloat(t.commission) || 0,
    followed_plan:   t.followedPlan,
    moved_stop:      t.movedStop,
    sized_correctly: t.overRisked,
    pre_trade:       t.preTrade,
    post_trade:      t.postTrade,
    mindset_notes:   t.mindsetNotes,
    strategy_name:   t.strategyName,
    trade_notes:     t.tradeNotes,
    scripture:       t.scripture,
    prayer:          t.prayer,
    gratitude:       t.gratitude,
    entry_quality:        t.entryQuality   || null,
    exit_quality:         t.exitQuality    || null,
    faith_rating:         t.faithRating    || null,
    // Client-computed PnL — used when prices are absent (CSV imports, manual results)
    net_pnl:   parseFloat(t.netPnl)   || null,
    gross_pnl: parseFloat(t.grossPnl) || null,
    result:    t.result || null,
    // Execution extras
    waited_confirmation:  t.waitedConfirmation,
    entered_at_level:     t.enteredAtLevel,
    exit_decision:        t.exitDecision,
    rushed_entry:         t.rushedEntry,
    trade_management:     t.tradeManagement,
    // Psychology extras
    sleep_quality:        t.sleepQuality,
    focus_level:          t.focusLevel,
    stress_level:         t.stressLevel,
    energy_level:         t.energyLevel,
    revenge_trade:        t.revengeTrade,
    // Answers to the trader's own custom questions — without this they only
    // ever lived in localStorage and never followed the account.
    custom_answers:       t.customAnswers || {},
  }
}

/* ── Server fetch (returns data; caller sets store state) ──────── */

/**
 * Fetch all trades and goals from the server.
 * Only works in secure mode. Returns null in local mode or on error.
 */
export async function fetchServerData() {
  if (_mode !== 'secure') return null
  try {
    const [tradesRes, goalsRes] = await Promise.allSettled([
      tradesApi.list(),
      goalsApi.list(),
    ])

    const trades = tradesRes.status === 'fulfilled'
      ? (tradesRes.value?.trades ?? []).map(serverTradeToClient)
      : null

    const goals = goalsRes.status === 'fulfilled'
      ? (goalsRes.value?.goals ?? []).map(g => ({
          id:        g.id,
          text:      g.text,
          createdAt: g.created_at,
        }))
      : null

    const completions = goalsRes.status === 'fulfilled'
      ? (goalsRes.value?.completions ?? {})
      : null

    return { trades, goals, completions }
  } catch (e) {
    console.warn('[syncManager] fetchServerData failed:', e?.message)
    return null
  }
}

/* ── Trade mutations ───────────────────────────────────────────── */

/**
 * Create a trade on the server. Returns the server trade (with UUID id) or null.
 * Caller should swap the temp local id with the server UUID on success.
 */
export async function serverCreateTrade(clientTrade) {
  if (_mode !== 'secure') return null
  try {
    const res = await tradesApi.create(clientTradeToServer(clientTrade))
    return serverTradeToClient(res.trade)
  } catch (e) {
    console.warn('[syncManager] serverCreateTrade failed:', e?.message)
    return null
  }
}

export async function serverUpdateTrade(id, clientTrade) {
  if (_mode !== 'secure') return
  try {
    await tradesApi.update(id, clientTradeToServer(clientTrade))
  } catch (e) {
    console.warn('[syncManager] serverUpdateTrade failed:', e?.message)
  }
}

export async function serverDeleteTrade(id) {
  if (_mode !== 'secure') return
  try {
    await tradesApi.delete(id)
  } catch (e) {
    console.warn('[syncManager] serverDeleteTrade failed:', e?.message)
  }
}

/* ── Goal mutations ────────────────────────────────────────────── */

/**
 * Create a goal on the server. Returns { id, text, createdAt } or null.
 */
export async function serverCreateGoal(text) {
  if (_mode !== 'secure') return null
  try {
    const res = await goalsApi.create(text)
    return { id: res.goal.id, text: res.goal.text, createdAt: res.goal.created_at }
  } catch (e) {
    console.warn('[syncManager] serverCreateGoal failed:', e?.message)
    return null
  }
}

export async function serverUpdateGoal(id, data) {
  if (_mode !== 'secure') return
  try {
    await goalsApi.update(id, data)
  } catch (e) {
    console.warn('[syncManager] serverUpdateGoal failed:', e?.message)
  }
}

export async function serverDeleteGoal(id) {
  if (_mode !== 'secure') return
  try {
    await goalsApi.delete(id)
  } catch (e) {
    console.warn('[syncManager] serverDeleteGoal failed:', e?.message)
  }
}

export async function serverToggleGoalCompletion(goalId, date) {
  if (_mode !== 'secure') return
  try {
    await goalsApi.toggleCompletion(goalId, date)
  } catch (e) {
    console.warn('[syncManager] serverToggleGoalCompletion failed:', e?.message)
  }
}
