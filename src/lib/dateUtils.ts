// כלי עזר קטן לתאריכים — נועד למנוע חוסר-התאמה בין פורמט התאריך ששמור
// באפליקציה (מפתחות מקומיים) לבין הפורמט שהשרת (Google Apps Script) מצפה
// לקבל בבקשות addMeeting.
//
// באג אמיתי שהתגלה: MeetingModal ו-HolidayModal שולחים תאריך בפורמט
// "dd.MM.yyyy" (נקודות — כך ש-toLocaleDateString('he-IL', {...}) מחזיר
// בפועל), בעוד ש-EventsTab השתמש בפורמט "dd/MM/yyyy" (לוכסנים, דרך
// date-fns). כשהשרת קיבל תאריך עם לוכסנים שלא ציפה להם, הוא כשל בפענוח
// ונפל בחזרה ל"היום" — בדיוק התסמין של "המפגש נראה כאילו היה היום".
//
// הפתרון: משאירים את מפתחות האחסון המקומיים (localStorage/ענן) כמו שהם
// (dd/MM/yyyy, לוכסנים — כדי לא "לשבור" נתוני נוכחות שכבר נשמרו), אבל
// לפני שליחה לשרת (addMeeting) תמיד ממירים ללוכסן→נקודה, כך שהשרת מקבל
// בדיוק את אותו פורמט שהוא כבר יודע לפרש נכון.

export function slashDateToDotDate(dmySlash: string): string {
  if (!dmySlash) return dmySlash;
  return dmySlash.replace(/\//g, '.');
}

// פענוח תאריך "dd/MM/yyyy" או "dd.MM.yyyy" (שני הפורמטים קיימים בפועל
// באפליקציה) לאובייקט Date. מחזיר null אם לא ניתן לפענח.
export function parseDMYDate(dmy: string): Date | null {
  if (!dmy) return null;
  const normalized = String(dmy).replace(/\./g, '/');
  const parts = normalized.split('/');
  if (parts.length !== 3) return null;
  const [day, month, year] = parts.map(p => parseInt(p, 10));
  if (!day || !month || !year) return null;
  const d = new Date(year, month - 1, day);
  return isNaN(d.getTime()) ? null : d;
}
