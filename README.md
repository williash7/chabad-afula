# לוח בקרה — בית חב"ד עפולה

אפליקציית ניהול תורמים וקהילה mobile-first עבור בית חב"ד עפולה.

## תכונות עיקריות

- **דשבורד** — סיכום תרומות, זמני שבת, אירועים קרובים, התראות CRM
- **ניהול תורמים** — חיפוש, מיון, עריכת פרופיל, היסטוריית תרומות
- **לוח שנה עברי** — חגים, אירועים מותאמים אישית, ניהול משימות לכל חג
- **CRM** — עיגולי קרבה, מעקב יעדים, יומן פגישות
- **דוחות** — ניתוח תרומות לפי שיטה ותקופה
- **פוסטר שבת** — יצירת הודעת שבת שבועית עם זמנים

## מחסנית טכנולוגית

- **Frontend:** React 19 + TypeScript + Tailwind CSS 4
- **Build:** Vite 6
- **Backend:** Express (Node.js) — proxy ל-Google Apps Script
- **נתונים:** Google Sheets (דרך Google Apps Script)
- **לוח שנה:** Hebcal API

## הגדרת סביבה מקומית

### דרישות מקדימות
- Node.js 18+
- גיליון Google Sheets + Google Apps Script מוגדר

### התקנה

1. **שכפל את הפרויקט:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/chabad-afula.git
   cd chabad-afula
   ```

2. **התקן תלויות:**
   ```bash
   npm install
   ```

3. **הגדר משתני סביבה:**
   ```bash
   cp .env.example .env
   ```
   פתח את `.env` ומלא את ה-URL של ה-Google Apps Script שלך:
   ```
   GS_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
   ```

4. **הפעל בפיתוח:**
   ```bash
   npm run dev
   ```
   האפליקציה תעלה על `http://localhost:3000`

## הגדרת Google Apps Script

ה-Script צריך לתמוך בפעולות הבאות:
- `getSummary` — סיכום כספי
- `getDonations` — רשימת תרומות
- `getDonors` — רשימת תורמים
- `getHK` — הוראות קבע
- `getFailures` — כשלים בחיוב
- `getRebbe` — תאריך הרבי
- `updateRebbe` (POST) — עדכון תאריך

ב-Deployment של ה-Script, וודא:
- **Execute as:** Me
- **Who has access:** Anyone

## פריסה לאינטרנט

### Render (מומלץ)

1. צור חשבון ב-[render.com](https://render.com)
2. חבר את הריפוזיטורי מגיטהאב
3. צור **Web Service** עם ההגדרות:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `NODE_ENV=production npm start`
4. הוסף משתה סביבה: `GS_URL=<ה-URL שלך>`

### Railway

```bash
railway login
railway init
railway up
```
הוסף `GS_URL` ב-Variables.

## מבנה הפרויקט

```
├── server.ts          # Express server + Google Sheets proxy
├── src/
│   ├── App.tsx        # Root component
│   ├── store/
│   │   └── AppContext.tsx  # Global state
│   ├── components/    # כל הרכיבים
│   ├── lib/
│   │   └── api.ts     # API helpers + localStorage
│   └── types.ts       # TypeScript types
├── .env.example       # תבנית לקובץ .env
└── vite.config.ts
```

## אבטחה

- קובץ `.env` לא מועלה לגיטהאב (מוגדר ב-`.gitignore`)
- ה-GS_URL עובר רק בצד השרת דרך ה-proxy
- נתוני ה-CRM נשמרים ב-localStorage בלבד
