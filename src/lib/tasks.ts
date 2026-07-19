// משימות חג/אירוע — כולל "משימת הזמנה" מיוחדת: רשימת אנשים להתקשר אליהם,
// עם צ'קליסט לפי איש והערכת זמן כוללת (3 דקות שיחה לכל אדם).

export interface TaskItem {
  text: string;
  done: boolean;
  kind?: 'invite';
  people?: string[];
  doneNames?: string[];
}

export const MINUTES_PER_CALL = 3;

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
