// מנוע ה"ניקוד" (gamification) — ניקוד מצטבר, רצף ימים ושיא שבועי, הכל ב-localStorage.
// logAction הוא export כפונקציה רגילה (לא hook) כדי שאפשר יהיה לקרוא לה מכל מקום
// באפליקציה (כמו AppContext), ומשדר CustomEvent כדי ש-ScoreTab יתעדכן בלי תלות ישירה.

export interface WeekEntry {
  week: string; // "YYYY-Www"
  actions: number;
  points: number;
}

export interface ScoreSnapshot {
  total: number;
  streak: number;
  thisWeek: WeekEntry;
  lastWeek: WeekEntry | null;
  bestWeek: WeekEntry | null;
}

export const SCORE_ACTION_EVENT = 'score-action';

const TOTAL_KEY = 'score_total';
const STREAK_KEY = 'score_streak';
const LAST_ACTION_KEY = 'score_last_action_date';
const WEEKLY_LOG_KEY = 'score_weekly_log';
const BEST_WEEK_KEY = 'score_best_week';

const toDateStr = (d: Date) => d.toISOString().split('T')[0];

function getISOWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function readWeeklyLog(): WeekEntry[] {
  try {
    return JSON.parse(localStorage.getItem(WEEKLY_LOG_KEY) || '[]');
  } catch {
    return [];
  }
}

function readBestWeek(): WeekEntry | null {
  try {
    const raw = localStorage.getItem(BEST_WEEK_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// הרצף כפי שיוצג עכשיו: אם עברו יומיים+ בלי שום פעולה, הרצף "נשבר" לצורך תצוגה
// גם אם עוד לא נרשמה פעולה חדשה שתאפס אותו רשמית ב-storage.
function getCurrentStreakDisplay(today: Date): number {
  const lastActionStr = localStorage.getItem(LAST_ACTION_KEY);
  if (!lastActionStr) return 0;
  const todayStr = toDateStr(today);
  const yesterdayStr = toDateStr(new Date(today.getTime() - 86400000));
  if (lastActionStr !== todayStr && lastActionStr !== yesterdayStr) return 0;
  return parseInt(localStorage.getItem(STREAK_KEY) || '0', 10);
}

export function getScoreSnapshot(today: Date): ScoreSnapshot {
  const total = parseInt(localStorage.getItem(TOTAL_KEY) || '0', 10);
  const streak = getCurrentStreakDisplay(today);
  const log = readWeeklyLog();
  const thisWeekStr = getISOWeek(today);
  const lastWeekStr = getISOWeek(new Date(today.getTime() - 7 * 86400000));
  const thisWeek = log.find(w => w.week === thisWeekStr) || { week: thisWeekStr, actions: 0, points: 0 };
  const lastWeek = log.find(w => w.week === lastWeekStr) || null;
  return { total, streak, thisWeek, lastWeek, bestWeek: readBestWeek() };
}

// נקראת מכל מקום באפליקציה כשמתבצעת פעולה שראוי לתת עליה ניקוד
// (עדכון איש קשר, תרומה מתועדת וכו') — מעדכנת הכל ב-localStorage ומשדרת אירוע.
export function logAction(points: number, label: string) {
  const today = new Date();
  const todayStr = toDateStr(today);
  const lastActionStr = localStorage.getItem(LAST_ACTION_KEY);

  const total = parseInt(localStorage.getItem(TOTAL_KEY) || '0', 10) + points;
  localStorage.setItem(TOTAL_KEY, String(total));

  if (lastActionStr !== todayStr) {
    const yesterdayStr = toDateStr(new Date(today.getTime() - 86400000));
    const prevStreak = parseInt(localStorage.getItem(STREAK_KEY) || '0', 10);
    const nextStreak = lastActionStr === yesterdayStr ? prevStreak + 1 : 1;
    localStorage.setItem(STREAK_KEY, String(nextStreak));
    localStorage.setItem(LAST_ACTION_KEY, todayStr);
  }

  const weekStr = getISOWeek(today);
  const log = readWeeklyLog();
  const idx = log.findIndex(w => w.week === weekStr);
  const updatedWeek: WeekEntry = idx >= 0
    ? { week: weekStr, actions: log[idx].actions + 1, points: log[idx].points + points }
    : { week: weekStr, actions: 1, points };
  if (idx >= 0) log[idx] = updatedWeek;
  else log.push(updatedWeek);
  localStorage.setItem(WEEKLY_LOG_KEY, JSON.stringify(log));

  const bestWeek = readBestWeek();
  if (!bestWeek || updatedWeek.points > bestWeek.points) {
    localStorage.setItem(BEST_WEEK_KEY, JSON.stringify(updatedWeek));
  }

  window.dispatchEvent(new CustomEvent(SCORE_ACTION_EVENT, { detail: { points, label } }));
}
