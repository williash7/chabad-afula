// שמות העמודות לתאריכים אישיים (לידה/יארצייט) משתנים בין גיליונות שונים
// ("תאריך לידה", "יום הולדת", "ת. לידה (לועזי)" וכו') — לכן מחפשים לפי
// תבנית בשם העמודה במקום התאמה מדויקת לשם קבוע אחד.

export function findGregorianBirthday(fields: Record<string, any>): string | undefined {
  const key = Object.keys(fields).find(k => (k.includes('לידה') || k.includes('הולדת')) && !k.includes('עברי') && fields[k]);
  return key ? String(fields[key]) : undefined;
}

export function findHebrewBirthday(fields: Record<string, any>): string | undefined {
  const key = Object.keys(fields).find(k => (k.includes('לידה') || k.includes('הולדת')) && k.includes('עברי') && fields[k]);
  return key ? String(fields[key]) : undefined;
}

export function findYahrzeitEntries(fields: Record<string, any>): { key: string; value: string }[] {
  return Object.keys(fields)
    .filter(k => /יארצייט|יורצייט|פטירה|יום השנה/.test(k) && fields[k])
    .map(k => ({ key: k, value: String(fields[k]) }));
}
