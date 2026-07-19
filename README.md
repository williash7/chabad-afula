# לוח בקרה — בית חב"ד עפולה

אפליקציית ניהול תורמים וקהילה mobile-first עבור בית חב"ד עפולה.

## תכונות עיקריות

- **דשבורד** — סיכום תרומות, זמני שבת, אירועים קרובים, התראות CRM
- **ניהול תורמים** — חיפוש, מיון, עריכת פרופיל, היסטוריית תרומות
- **מפה מוטמעת** — סיכה לכל תורם עם כתובת, מבוססת Leaflet + OpenStreetMap (ללא מפתח API)
- **תאריכים אישיים** — יום הולדת (עברי/לועזי) ויארצייט הורים בכרטיס הפרופיל, ורשימת "קרובים" בדשבורד
- **לוח שנה עברי** — חגים, אירועים מותאמים אישית, ניהול משימות לכל חג
- **CRM** — עיגולי קרבה, מעקב יעדים, יומן פגישות
- **דוחות** — ניתוח תרומות לפי שיטה ותקופה
- **פוסטר שבת** — יצירת הודעת שבת שבועית עם זמנים

## מחסנית טכנולוגית

- **Frontend:** React 19 + TypeScript + Tailwind CSS 4
- **Build:** Vite 6
- **מפה:** Leaflet + OpenStreetMap, geocoding חינמי דרך Nominatim
- **נתונים:** Google Sheets (דרך Google Apps Script) — נקרא **ישירות מהדפדפן**, בלי שרת ביניים
- **לוח שנה:** Hebcal API

האפליקציה היא **אתר סטטי טהור**: אין שרת Node/Express, ואין תלות ב-Render או בכל שירות אחסון "backend". כל הקבצים (HTML/CSS/JS) מיוצרים מראש (`npm run build`) ואפשר להעלות אותם לכל שירות שמארח קבצים סטטיים — למשל GitHub Pages.

## הגדרת סביבה מקומית

### דרישות מקדימות
- Node.js 18+
- גיליון Google Sheets + Google Apps Script מוגדר ("Web App", "Anyone" access)

### התקנה

```bash
git clone https://github.com/YOUR_USERNAME/chabad-afula.git
cd chabad-afula
npm install
npm run dev
```

האפליקציה תעלה בכתובת שמודפסת בטרמינל (בד"כ `http://localhost:5173`).

## חיבור ל-Google Apps Script

כתובת ה-Web App של הסקריפט מוגדרת ישירות בקובץ [`src/lib/api.ts`](src/lib/api.ts), בקבוע `GS_URL` בתחילת הקובץ. זו אינה כתובת סודית — היא תמיד נחשפת בקוד הצד-לקוח בכל אפליקציה סטטית, בדיוק כמו שהיתה גלויה קודם בבקשות הרשת מהדפדפן לשרת. אם תפרסמו גרסה חדשה של הסקריפט ותקבלו כתובת URL אחרת, פשוט מחליפים את הערך של `GS_URL` באותו קובץ ובונים מחדש.

ה-Script צריך לתמוך בפעולות הבאות:
- `getSummary` — סיכום כספי
- `getDonations` — רשימת תרומות
- `getDonors` — רשימת תורמים
- `getHK` — הוראות קבע
- `getFailures` — כשלים בחיוב
- `getRebbe` — תאריך הרבי
- `updateRebbe` (POST) — עדכון תאריך
- `getCRM` / `saveCRM`, `getEvents` / `saveEvents`, `getHolidayExtras` / `saveHolidayExtras` — סנכרון נתוני האפליקציה
- `updateDonorField`, `updatePersonalDate`, `createHolidayDoc`

ב-Deployment של ה-Script, וודא:
- **Execute as:** Me
- **Who has access:** Anyone

> בקשות POST נשלחות עם `Content-Type: text/plain` (ולא `application/json`) כדי למנוע חסימת CORS ע"י הדפדפן — Google Apps Script לא יודע לענות לבקשת ה-"preflight" (OPTIONS) שדפדפן שולח אוטומטית לפני POST עם JSON בין דומיינים שונים. ה-Script עדיין מקבל טקסט JSON תקין ב-`e.postData.contents` בדיוק כמו קודם.

## פריסה ל-GitHub Pages

הפרויקט כולל workflow מוכן ב-`.github/workflows/deploy.yml`: בכל push ל-`main` הוא בונה את האתר (`npm run build`) ומפרסם את תיקיית `dist` לענף `gh-pages`.

צעדים חד-פעמיים בהגדרות הריפו בגיטהאב:
1. **Settings → Pages** → תחת "Build and deployment" בחרו **Deploy from a branch**, ענף `gh-pages`, תיקייה `/ (root)`.
2. ודאו ש-**Settings → Actions → General → Workflow permissions** מוגדר ל-**Read and write permissions** (כדי שה-workflow יוכל לפרסם).
3. `push` לענף `main` — הפריסה תרוץ אוטומטית.

אין צורך בשום משתנה סביבה (secret) — כל מה שהאפליקציה צריכה כלול בקוד עצמו.

## מבנה הפרויקט

```
├── src/
│   ├── App.tsx             # רכיב שורש
│   ├── store/
│   │   └── AppContext.tsx  # מצב גלובלי
│   ├── components/         # כל הרכיבים
│   ├── lib/
│   │   ├── api.ts          # קריאות ישירות ל-Google Apps Script + localStorage
│   │   └── geocode.ts       # geocoding כתובות דרך Nominatim + cache
│   └── types.ts             # טיפוסי TypeScript
└── vite.config.ts
```

## אבטחה

- אין שרת ואין סודות בצד שרת — הכל רץ בדפדפן.
- ה-Google Apps Script חייב להיות מוגדר כ-"Anyone" כדי שהאפליקציה תוכל לגשת אליו; אין להזין בו מידע רגיש שלא מיועד לחשיפה.
- נתוני ה-CRM נשמרים ב-localStorage בדפדפן ומסונכרנים לגיליון גוגל.
- geocoding כתובות מתבצע מול Nominatim (OpenStreetMap) — רק הכתובת עצמה (למשל "הכלנית 4, עפולה") נשלחת, ללא שם התורם או מידע נוסף.
