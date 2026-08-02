import { TaskItem, PRIORITY_META } from './tasks';

export type TaskSortKey = 'date' | 'priority';

// התאריך שלפיו ממיינים משימה: dueDate מפורש (כולל 'תאריך המופע' על תזכורות
// אירוע) קודם, אחריו תאריך ההקשר שהקורא מעביר (למשל תאריך החג/האירוע שהמשימה
// שייכת אליו), ולבסוף תאריך היצירה כברירת מחדל אחרונה — כך שלכל משימה יש
// "תאריך" למיון גם בלי דדליין מפורש (ראה בקשת המשתמש: "כל משימה מקבלת
// אוטומטית תאריך — או שבו נוצרה, או של האירוע/החג").
export function effectiveDate(task: TaskItem, contextDate?: Date | null): Date | null {
  if (task.dueDate) {
    const d = new Date(task.dueDate);
    if (!isNaN(d.getTime())) return d;
  }
  if (contextDate) return contextDate;
  if (task.createdAt) {
    const d = new Date(task.createdAt);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

function priorityWeight(task: TaskItem): number {
  return task.priority ? PRIORITY_META[task.priority].weight : PRIORITY_META.medium.weight;
}

// משווה שתי משימות למיון: ב'priority' — לפי דחיפות (דחוף קודם), עם תאריך
// כשובר-שוויון; ב'date' — לפי התאריך האפקטיבי (הקרוב קודם, ריקים לסוף.
export function compareTasks(
  a: TaskItem, b: TaskItem, key: TaskSortKey,
  aDate: Date | null, bDate: Date | null
): number {
  if (key === 'priority') {
    const diff = priorityWeight(a) - priorityWeight(b);
    if (diff !== 0) return diff;
  }
  if (aDate && bDate) return aDate.getTime() - bDate.getTime();
  if (aDate) return -1;
  if (bDate) return 1;
  return 0;
}

export { priorityWeight };
