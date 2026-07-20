// משימות חג/אירוע — כולל "משימת הזמנה" מיוחדת: רשימת אנשים להתקשר אליהם,
// עם צ'קליסט לפי איש והערכת זמן כוללת (3 דקות שיחה לכל אדם).

export interface TaskItem {
  text: string;
  done: boolean;
  kind?: 'invite';
  people?: string[];
  doneNames?: string[];
  dueDate?: string; // ISO date, רק למשימות חד-פעמיות שאין להן תאריך טבעי (חג/אירוע)
}

export const MINUTES_PER_CALL = 3;

// מזהה שמור בתוך holidayExtras עבור משימות חד-פעמיות שלא שייכות לחג/אירוע ספציפי
// (אותה טכניקת "piggyback" על אחסון קיים ומסונכרן לענן, כמו __nameMerges__)
export const STANDALONE_TASKS_ID = '__standalone__';

// מחשב את המופע הקרוב הבא של אירוע חוזר (עבור "כמה זמן נותר" למשימות אירוע)
export function nextEventOccurrence(ev: { date?: string; freq?: string; time?: string }, from: Date): Date | null {
  if (!ev.date) return null;
  const base = new Date(`${ev.date}T${ev.time || '00:00'}`);
  if (isNaN(base.getTime())) return null;
  if (ev.freq === 'oneoff') return base;
  const d = new Date(base);
  const stepDays = ev.freq === 'weekly' ? 7 : ev.freq === 'biweekly' ? 14 : null;
  if (stepDays) {
    while (d.getTime() < from.getTime()) d.setDate(d.getDate() + stepDays);
  } else {
    while (d.getTime() < from.getTime()) d.setMonth(d.getMonth() + 1);
  }
  return d;
}

// מציג "כמה זמן נותר" (ימים ושעות) עד לדדליין נתון
export function formatRemaining(target: Date, now: Date): string {
  const diffMs = target.getTime() - now.getTime();
  if (diffMs <= 0) return 'המועד עבר';
  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  if (days > 0) return `נותרו ${days} ימים ו-${hours} שעות`;
  if (hours > 0) return `נותרו ${hours} שעות`;
  return 'פחות משעה';
}

export function createInviteTask(label: string, people: string[]): TaskItem {
  return {
    text: `📞 הזמנת ${label} — ${people.length} אנשים`,
    done: people.length === 0,
    kind: 'invite',
    people,
    doneNames: [],
  };
}

export function inviteRemainingMinutes(task: TaskItem): number {
  const total = task.people?.length || 0;
  const done = task.doneNames?.length || 0;
  return Math.max(0, total - done) * MINUTES_PER_CALL;
}

export function toggleInvitePerson(task: TaskItem, personName: string): TaskItem {
  const doneNames = task.doneNames || [];
  const nextDone = doneNames.includes(personName)
    ? doneNames.filter(n => n !== personName)
    : [...doneNames, personName];
  const total = task.people?.length || 0;
  return { ...task, doneNames: nextDone, done: total > 0 && nextDone.length >= total };
}
