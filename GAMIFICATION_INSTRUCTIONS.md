# הוראות: הוסף לשונית "ניקוד" לאפליקציית בית חבד עפולה

## מה לבנות
לשונית חדשה בשם **"ניקוד"** (`score`) שמציגה gamification — ניקוד על פעולות, רצף ימים, סיכום שבועי עם אחוזים, ובר התקדמות. **אל תשנה שום לשונית קיימת.** רק הוסף.

---

## שלב 1: צור קובץ `src/components/ScoreTab.tsx`

הקובץ כולו כתוב ב-RTL (`dir="rtl"`). השתמש ב-Tailwind classes בלבד (אין styled-components).

### לוגיקת הנתונים

כל הנתונים מגיעים מ-`useAppStore()` שכבר קיים. הייבוא:
```ts
import { useAppStore } from '../store/AppContext';
```

**חישוב ניקוד מהנתונים הקיימים:**

```ts
const { crm, donations } = useAppStore();

// כל פגישה/עדכון ב-CRM = 10 נקודות
// כל תרומה מתועדת = 15 נקודות
// פגישה ראשונה עם איש קשר חדש = 25 נקודות בונוס (בדוק ב-crm[name].meetings?.length === 1)
```

**לשמור ב-localStorage (מפתחות):**
- `score_total` — מספר שלם, סה"כ נקודות מצטבר
- `score_streak` — ימים רצופים (מספר שלם)
- `score_last_action_date` — תאריך ISO של הפעולה האחרונה (`2025-07-18`)
- `score_weekly_log` — JSON של מערך: `[{ week: "2025-W28", actions: number, points: number }]`
- `score_best_week` — JSON של `{ week: string, actions: number, points: number }`

**לוגיקת רצף (streak):**
```ts
// בכל כניסה ללשונית:
const today = new Date().toISOString().split('T')[0];
const lastAction = localStorage.getItem('score_last_action_date');
// אם lastAction === אתמול → streak++ 
// אם lastAction === היום → streak נשאר
// אם lastAction לפני יומיים+ → streak = 0
```

**הוסף פונקציה `logAction(points: number, label: string)` שנקראת מבחוץ:**
- מוסיפה לניקוד
- מעדכנת streak ותאריך אחרון
- מעדכנת weekly_log
- שמורה הכל ב-localStorage
- מציגה toast קצר (2 שניות) עם "+X נקודות"

**חשוב:** `logAction` צריכה להיות exported כפונקציה רגילה (לא hook) כדי שאפשר לקרוא לה מרכיבים אחרים:
```ts
export function logAction(points: number, label: string) { ... }
```

---

### ממשק המשתמש — 4 קטעים בדף

#### קטע 1: "הרצף שלך" (הכי גדול, למעלה)
- מספר ענק מרכזי: ימי הרצף. סגנון: טקסט 72px, מודגש, צבע `#C9A84C`
- מתחתיו: `"ימים רצופים"` בטקסט קטן
- אם הרצף > 7: הוסף כיתוב קטן `"🔥 מומנטום ×1.5"`
- אם הרצף > 30: `"🔥 מומנטום ×2"`

#### קטע 2: בר "עד 100 הבאות"
- `const progress = totalPoints % 100;`
- Progress bar רחב, צבע זהב (`#C9A84C`), עם אחוזים
- מעל הבר: `"${progress}/100 נקודות למיילסטון הבא"`
- מתחת: כמה מיילסטונים הושלמו עד כה: `Math.floor(totalPoints / 100)` ✓

#### קטע 3: סיכום שבועי
- **השבוע**: מספר פעולות + נקודות
- **שבוע שעבר**: מספר פעולות + נקודות
- **שינוי באחוזים**: `((thisWeek - lastWeek) / lastWeek * 100).toFixed(0)`
  - אם חיובי: `"↑ X% מהשבוע שעבר"` בירוק
  - אם שלילי: `"↓ X% מהשבוע שעבר"` באדום
  - אם אין שבוע שעבר: `"שבוע ראשון!"`
- **שיא אישי** (best_week): `"שיא: X פעולות בשבוע [תאריך]"`

#### קטע 4: "חם/קר" — אנשי קשר לפי טמפרטורה
```ts
const contacts = Object.entries(crm);
// חשב ימים מאז lastContact לכל איש קשר
// ירוק (<7 ימים): "חמים" 
// כתום (7-30 ימים): "מתקררים"
// אדום (>30 ימים): "קרים — זמן לחזור"
```
- הצג שלושה מספרים בשורה אחת: 🟢 X | 🟡 X | 🔴 X
- מתחת: רשימה קצרה של 3 הקרים ביותר עם כפתור "חזור" (שפותח את DonorsTab לאיש הקשר הזה — העבר prop `onContactClick?: (name: string) => void`)

---

## שלב 2: ערוך `src/App.tsx`

**הוסף import:**
```ts
import { ScoreTab } from './components/ScoreTab';
```

**הוסף ל-ADD_LABELS** — אל תוסיף כי לשונית score אין פעולת הוספה.

**הוסף ל-main:**
```tsx
{activeTab === 'score' && <ScoreTab onContactClick={(name) => { setActiveTab('donors'); /* pass name somehow */ }} />}
```

---

## שלב 3: ערוך `src/components/BottomNav.tsx`

הוסף לשונית score לרשימת `navItems`. השתמש באייקון `TrendingUp` מ-lucide-react:
```ts
import { ..., TrendingUp } from 'lucide-react';

// הוסף לרשימה (אחרי tasks, לפני donors):
{ id: 'score', icon: TrendingUp, label: 'ניקוד' },
```

---

## שלב 4: ערוך `src/components/SideNav.tsx`

אותו דבר — הוסף לרשימת navItems:
```ts
import { ..., TrendingUp } from 'lucide-react';
{ id: 'score', icon: TrendingUp, label: 'ניקוד' },
```
הוסף אחרי `tasks` ולפני `donors`.

---

## שלב 5: חיבור אוטומטי — קריאה ל-logAction ממקומות אחרים

ב-`src/store/AppContext.tsx`, אחרי שמירת כל עדכון CRM קורה ב-`updateCrm`:
```ts
import { logAction } from '../components/ScoreTab';
// בתוך updateCrm, אחרי השמירה:
logAction(10, 'עדכון איש קשר');
```

ב-`addManualDonation` (גם ב-AppContext.tsx):
```ts
logAction(15, 'תרומה מתועדת');
```

---

## עיצוב כללי

- רקע: `bg-[#FAF6EE]` (כמו שאר האפליקציה)
- כרטיסים: `bg-white rounded-2xl shadow-sm p-4 border border-gray-100`
- כותרות קטעים: `text-sm font-bold text-gray-400 uppercase tracking-wide mb-3`
- מספרים ראשיים: `font-['Frank_Ruhl_Libre'] font-black text-[#0D1B2A]`
- צבע הדגשה: `#C9A84C` (זהב — כמו שאר האפליקציה)
- ירוק: `text-green-500`, אדום: `text-red-500`
- dir="rtl" על כל הקומפוננטה

---

## Toast (התראת ניקוד)

בתוך `ScoreTab.tsx` הוסף state לtoast:
```ts
const [toast, setToast] = useState<string | null>(null);
```

כאשר `logAction` נקרא, עדכן את ה-toast state דרך callback. הצג:
```tsx
{toast && (
  <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-[#0D1B2A] text-[#C9A84C] font-bold px-6 py-3 rounded-full shadow-xl z-50 text-lg animate-bounce">
    {toast}
  </div>
)}
```
setTimeout של 2000ms להסרה.

**בגלל ש-logAction היא פונקציה exported (לא hook), היא לא יכולה לעדכן state ישירות.**
פתרון: השתמש ב-CustomEvent:
```ts
// ב-logAction:
window.dispatchEvent(new CustomEvent('score-action', { detail: { points, label } }));

// ב-ScoreTab component:
useEffect(() => {
  const handler = (e: any) => {
    setToast(`+${e.detail.points} נקודות`);
    setTimeout(() => setToast(null), 2000);
    // רענן חישובים מ-localStorage
    recalculate();
  };
  window.addEventListener('score-action', handler);
  return () => window.removeEventListener('score-action', handler);
}, []);
```

---

## בדיקה אחרי הבנייה

1. פתח לשונית "ניקוד" — ודא שנטען בלי שגיאות
2. עבור ללשונית donors, ערוך איש קשר כלשהו — חזור לניקוד — ודא שהניקוד עלה ו-toast הופיע
3. בדוק שהרצף מתעדכן נכון לפי localStorage
4. הרץ `npm run build` — ודא אין שגיאות TypeScript

---

## סיכום קבצים לשינוי/יצירה

| קובץ | פעולה |
|------|--------|
| `src/components/ScoreTab.tsx` | **צור חדש** |
| `src/App.tsx` | הוסף import + route |
| `src/components/BottomNav.tsx` | הוסף לשונית |
| `src/components/SideNav.tsx` | הוסף לשונית |
| `src/store/AppContext.tsx` | הוסף קריאות logAction |
