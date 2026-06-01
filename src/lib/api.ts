export const HEBCAL_API = 'https://www.hebcal.com/shabbat?cfg=json&city=Afula&M=on';

// On Render: relative /api/gs is served by Express.
// On GitHub Pages (static): VITE_API_URL points to the Render backend.
const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export async function apiGet(action: string) {
  try {
    const r = await fetch(`${API_BASE}/api/gs?action=${action}`);
    if (r.status === 404) {
      // No backend available (static deployment) – silently use local fallback
      return getMockData(action);
    }
    const data = await r.json();
    if (!r.ok) {
      console.error(`API Error for ${action}:`, data.details || data.error);
      return { ...getMockData(action), _error: data.error, _details: data.details };
    }
    return data;
  } catch (e: any) {
    console.error(`Network Error for ${action}:`, e);
    return { ...getMockData(action), _error: 'שגיאת רשת', _details: e.toString() };
  }
}

export async function apiPost(action: string, data: any) {
  try {
    const r = await fetch(`${API_BASE}/api/gs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, action }),
    });
    if (r.status === 404) return { success: false };
    const res = await r.json();
    if (!r.ok) throw new Error(res.details || res.error);
    return res;
  } catch (e: any) {
    console.error('API POST Error:', e);
    return { error: e.toString(), success: false };
  }
}

function getMockData(action: string) {
  if (action === 'getSummary') {
    return {
      total: 125000,
      thisMonthTotal: 15400,
      donorCount: 42,
      hkActive: 12,
      failureCount: 2,
      byMethod: { 'קישור ישיר': 45000, 'הוק': 30000, 'ביט/פייבוקס': 25000, 'מזומן': 25000 }
    };
  }
  if (action === 'getDonations') {
    return {
      donations: [
        { name: 'ישראל ישראלי', amount: 500, date: '15/05/2026', method: 'ביט/פייבוקס', purpose: 'תרומה לבית חבד' },
        { name: 'דוד כהן', amount: 100, date: '10/05/2026', method: 'הוק', purpose: 'הוראת קבע' },
        { name: 'משה לוי', amount: 1800, date: '01/05/2026', method: 'העברה בנקאית', purpose: 'תרומה' }
      ]
    };
  }
  if (action === 'getDonors') {
    return {
      donors: [
        { name: 'דוד כהן', 'כתובת': 'הכלנית 4', 'תאריך לידה': '15/05/1980', 'תאריך לידה עברי': 'כ באייר', 'יארצייט': 'טז באייר תשפד', spouse: 'רבקה', tefillin: 'כן', mezuzah: 'לא בדק השנה' }
      ]
    };
  }
  if (action === 'getHK') {
    return { hk: [{ name: 'דוד כהן', active: true, amount: 100, remaining: 10, lastBilled: '10/05/2026' }] };
  }
  if (action === 'getFailures') {
    return { failures: [{ name: 'שמעון לוי', reason: 'כרטיס פג תוקף', amount: '₪100', date: '01/05/2026' }] };
  }
  if (action === 'getRebbe') return { date: '' };
  return {};
}

// ── Local Storage Helpers ─────────────────────────────────────────────────────

export function getCRMData(): Record<string, any> {
  try { return JSON.parse(localStorage.getItem('crm_data') || '{}'); }
  catch { return {}; }
}

export function saveCRMData(data: any) {
  localStorage.setItem('crm_data', JSON.stringify(data));
}

export function getManualDonations(): any[] {
  try { return JSON.parse(localStorage.getItem('manual_donations') || '[]'); }
  catch { return []; }
}

export function saveManualDonations(data: any[]) {
  localStorage.setItem('manual_donations', JSON.stringify(data));
}

export function getEventsData(): any[] {
  try { return JSON.parse(localStorage.getItem('events_data') || '[]'); }
  catch { return []; }
}

export function saveEventsData(data: any[]) {
  localStorage.setItem('events_data', JSON.stringify(data));
}

export function getHolidayExtras(): Record<string, any> {
  try { return JSON.parse(localStorage.getItem('holiday_extras') || '{}'); }
  catch { return {}; }
}

export function saveHolidayExtras(data: any) {
  localStorage.setItem('holiday_extras', JSON.stringify(data));
}

export function getCustomHols(): any[] {
  try { return JSON.parse(localStorage.getItem('custom_hols') || '[]'); }
  catch { return []; }
}

export function saveCustomHols(data: any[]) {
  localStorage.setItem('custom_hols', JSON.stringify(data));
}

// ── Cloud Sync (Google Sheets ← גיליון "🔄 סנכרון נתונים") ──────────────────

export async function getCRMDataCloud(): Promise<Record<string, any>> {
  try {
    const res = await apiGet('getCRM');
    if (res.data && !res._error) {
      saveCRMData(res.data); // keep local in sync
      return res.data;
    }
  } catch {}
  return getCRMData();
}

export async function saveCRMDataCloud(data: Record<string, any>): Promise<void> {
  saveCRMData(data);
  apiPost('saveCRM', { data }).catch(console.error); // fire and forget
}

export async function getEventsDataCloud(): Promise<any[]> {
  try {
    const res = await apiGet('getEvents');
    if (res.data && !res._error) {
      saveEventsData(res.data);
      return res.data;
    }
  } catch {}
  return getEventsData();
}

export async function saveEventsDataCloud(data: any[]): Promise<void> {
  saveEventsData(data);
  apiPost('saveEvents', { data }).catch(console.error);
}

export async function getHolidayExtrasCloud(): Promise<Record<string, any>> {
  try {
    const res = await apiGet('getHolidayExtras');
    if (res.data && !res._error) {
      saveHolidayExtras(res.data);
      return res.data;
    }
  } catch {}
  return getHolidayExtras();
}

export async function saveHolidayExtrasCloud(data: Record<string, any>): Promise<void> {
  saveHolidayExtras(data);
  apiPost('saveHolidayExtras', { data }).catch(console.error);
}

export async function createHolidayDoc(holidayName: string, dateStr: string): Promise<{ url: string; title: string; error?: string } | null> {
  const res = await apiPost('createHolidayDoc', { holidayName, dateStr });
  if (res.success && res.url) return { url: res.url, title: res.title };
  return { url: '', title: '', error: res.error || res.details || 'Unknown error' };
}
