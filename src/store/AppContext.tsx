import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  apiGet, getCRMData,
  getCRMDataCloud, saveCRMDataCloud,
  getEventsDataCloud, saveEventsDataCloud,
  getHolidayExtrasCloud, saveHolidayExtrasCloud,
  getManualDonations, saveManualDonations,
} from '../lib/api';
import { Donor, Donation, ReportSummary } from '../types';
import { extractMerges, applyMergesToCrm, coalesceDonorsByMerges, resolveCanonicalName, MERGES_KEY } from '../lib/nameMerges';
import { AppSettings, loadSettings, saveSettings, filterDonorsBySettings } from '../lib/settings';
import { logAction } from '../lib/score';

interface AppState {
  summary: ReportSummary | null;
  donations: Donation[];
  donors: Record<string, Donor>;
  visibleDonors: Record<string, Donor>;
  hk: any[];
  failures: any[];
  rebbeDate: Date | null;
  shabbat: any;
  holidays: any[];
  hebrewDate: string;
  loading: boolean;
  loadingText: string;
  apiError: string | null;
  crm: Record<string, any>;
  holidayExtras: Record<string, any>;
  eventsData: any[];
  nameMerges: Record<string, string>;
  settings: AppSettings;
  updateSettings: (partial: Partial<AppSettings>) => void;
  refresh: () => void;
  addManualDonation: (donation: any) => void;
  updateCrm: (name: string, data: any) => void;
  updateHolidayExtras: (id: string, data: any) => void;
  updateEventsData: (data: any[]) => void;
  updateRebbeDate: (date: Date) => void;
  mergeContacts: (aliasName: string, canonicalName: string) => void;
  unmergeContact: (aliasName: string) => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [donors, setDonors] = useState<Record<string, Donor>>({});
  const [hk, setHk] = useState<any[]>([]);
  const [failures, setFailures] = useState<any[]>([]);
  const [rebbeDate, setRebbeDate] = useState<Date | null>(null);

  // Hebcal states
  const [shabbat, setShabbat] = useState<any>(null);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [hebrewDate, setHebrewDate] = useState<string>('טוען...');

  const [loading, setLoading] = useState(true);
  const [loadingText, setLoadingText] = useState('מתחבר לגיליון...');
  const [apiError, setApiError] = useState<string | null>(null);

  // Start with localStorage so the UI renders immediately, then cloud data overwrites
  const initialCrm = extractMerges(getCRMData());
  const [crm, setCrm] = useState<Record<string, any>>(initialCrm.crmRest);
  const [nameMerges, setNameMerges] = useState<Record<string, string>>(initialCrm.merges);
  const [holidayExtras, setHolidayExtras] = useState<Record<string, any>>({});
  const [eventsData, setEventsData] = useState<any[]>([]);
  const [settings, setSettings] = useState<AppSettings>(loadSettings());

  const updateSettings = (partial: Partial<AppSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...partial };
      saveSettings(next);
      return next;
    });
  };

  const visibleDonors = React.useMemo(
    () => filterDonorsBySettings(donors, crm, settings),
    [donors, crm, settings]
  );

  const loadHebcal = () => {
    fetch('https://www.hebcal.com/shabbat?cfg=json&city=Afula&M=on')
      .then(r => r.json())
      .then(data => {
        // Hebcal ignores m= for named cities and returns 18 min before sunset.
        // Afula minhag is 30 min — subtract 12 min from the candle lighting time.
        if (data.items) {
          data.items = data.items.map((item: any) =>
            item.category === 'candles'
              ? { ...item, date: new Date(new Date(item.date).getTime() - 12 * 60000).toISOString() }
              : item
          );
        }
        setShabbat(data);
      })
      .catch(console.error);

    const today = new Date();
    const y = today.getFullYear();
    fetch(`https://www.hebcal.com/hebcal?v=1&cfg=json&start=${y}-01-01&end=${y+1}-12-31&maj=on&min=on&nx=on&mf=on&ss=on&mod=off&i=on&c=on&city=Afula`)
      .then(r => r.json())
      .then(data => {
        if (data.items) {
          setHolidays(data.items.filter((item: any) =>
            (item.category === 'holiday' || item.category === 'roshchodesh') &&
            !item.subcat?.includes('modern')
          ));
        }
      })
      .catch(console.error);

    fetch(`https://www.hebcal.com/converter?cfg=json&gy=${today.getFullYear()}&gm=${today.getMonth() + 1}&gd=${today.getDate()}&g2h=1`)
      .then(r => r.json())
      .then(data => { if (data.hebrew) setHebrewDate(data.hebrew); })
      .catch(console.error);
  };

  const loadAll = async () => {
    setLoading(true);
    setLoadingText('מתחבר לגיליון...');

    loadHebcal();

    // Load cloud-synced data in parallel with the main API calls
    let resolvedCrm: Record<string, any> = extractMerges(getCRMData()).crmRest;
    let resolvedMerges: Record<string, string> = extractMerges(getCRMData()).merges;
    const cloudLoads = Promise.all([
      getCRMDataCloud(),
      getEventsDataCloud(),
      getHolidayExtrasCloud(),
    ]).then(([cloudCrm, cloudEvents, cloudExtras]) => {
      const { merges, crmRest } = extractMerges(cloudCrm);
      const cleanedCrm = applyMergesToCrm(crmRest, merges);
      resolvedCrm = cleanedCrm;
      resolvedMerges = merges;
      setCrm(cleanedCrm);
      setNameMerges(merges);
      setEventsData(cloudEvents);
      setHolidayExtras(cloudExtras);
    }).catch(console.error);

    try {
      const [sumRes, donRes, failRes, rebbeRes, hkRes, donorsRes] = await Promise.all([
        apiGet('getSummary'),
        apiGet('getDonations'),
        apiGet('getFailures'),
        apiGet('getRebbe'),
        apiGet('getHK'),
        apiGet('getDonors'),
      ]);

      if (sumRes._error) {
        setApiError(`${sumRes._error}: ${sumRes._details || ''}`);
      } else {
        setApiError(null);
      }

      if (rebbeRes?.date) setRebbeDate(new Date(rebbeRes.date));
      if (sumRes.total !== undefined) setSummary(sumRes);

      const map: Record<string, Donor> = {};

      if (donorsRes.donors && donorsRes.donors.length > 0) {
        const firstRow = donorsRes.donors[0];
        const headerMap: Record<string, string> = {};
        const reverseHeaderMap: Record<string, string> = {};

        Object.keys(firstRow).forEach(badKey => {
          const realHeader = firstRow[badKey];
          if (realHeader) {
            headerMap[badKey] = realHeader;
            reverseHeaderMap[realHeader] = badKey;
          }
        });

        localStorage.setItem('reverseHeaderMap', JSON.stringify(reverseHeaderMap));

        donorsRes.donors.slice(1).forEach((d: any) => {
          const cleanDonor: any = { name: d.name, total: 0, donations: [], lastDate: '' };
          Object.keys(d).forEach(badKey => {
            const realHeader = headerMap[badKey] || badKey;
            cleanDonor[realHeader] = d[badKey];
          });
          if (cleanDonor['שם מלא']) cleanDonor.name = cleanDonor['שם מלא'];
          if (!cleanDonor.name) return;
          map[cleanDonor.name] = cleanDonor;
        });
      }

      // Wait for cloud CRM so we can merge correctly
      await cloudLoads;

      Object.keys(resolvedCrm).forEach((name) => {
        if (!map[name]) map[name] = { name, total: 0, donations: [], lastDate: '' };
      });

      const serverDonations: any[] = donRes.donations || [];
      const manualDonations = getManualDonations();
      // Merge: manual donations not already present in server list (deduplicate by name+date+amount)
      const serverKeys = new Set(serverDonations.map((d: any) => `${d.name}|${d.date}|${d.amount}`));
      const uniqueManual = manualDonations.filter((d: any) => !serverKeys.has(`${d.name}|${d.date}|${d.amount}`));
      // שם קנוני (אחרי מיזוגי אנשי קשר) לכל רשומה — כדי שתרומות/מפגשים של שני
      // שמות ממוזגים יופיעו כמקשה אחת בכל מקום שמשתמש ברשימת donations הזו
      const allDonations = [...serverDonations, ...uniqueManual].map((d: any) =>
        d && d.name ? { ...d, name: resolveCanonicalName(d.name, resolvedMerges) } : d
      );

      if (allDonations.length > 0) {
        setDonations(allDonations);
        allDonations.forEach((d: Donation) => {
          if (!d.name) return;
          if (!map[d.name]) map[d.name] = { name: d.name, total: 0, donations: [], lastDate: '' };
          map[d.name].donations.push(d);
          map[d.name].total += (d.amount || 0);
          if (!map[d.name].lastDate || !d.date) {
            if (d.date) map[d.name].lastDate = d.date;
          } else {
            const curDateStr = d.date.split('/').reverse().join('-');
            const lastDateStr = map[d.name].lastDate.split('/').reverse().join('-');
            if (new Date(curDateStr) > new Date(lastDateStr)) map[d.name].lastDate = d.date;
          }
        });
      }
      // מעביר כינויים (למשל "אברהם אריאל") לתוך הרשומה הקנונית — מקפל כפילויות
      // שנוצרו מרשומות תורם נפרדות בגיליון עבור אותו אדם.
      setDonors(coalesceDonorsByMerges(map, resolvedMerges));

      if (failRes.failures) setFailures(failRes.failures);
      if (hkRes.hk) setHk(hkRes.hk);

    } catch (e) {
      console.error('Error fetching data:', e);
      setLoadingText('שגיאת חיבור');
    }

    setLoading(false);
  };

  const addManualDonation = (donation: any) => {
    setDonations(prev => {
      const updated = [donation, ...prev];
      const manual = getManualDonations();
      saveManualDonations([donation, ...manual]);
      return updated;
    });
    setDonors(prev => {
      const name = donation.name;
      if (!name) return prev;
      const existing = prev[name] || { name, total: 0, donations: [], lastDate: '' };
      return {
        ...prev,
        [name]: {
          ...existing,
          donations: [donation, ...(existing.donations || [])],
          total: (existing.total || 0) + (donation.amount || 0),
          lastDate: donation.date || existing.lastDate,
        },
      };
    });
    logAction('donation');
  };

  const updateCrm = (name: string, data: any) => {
    setCrm(prev => {
      const next = { ...prev, [name]: { ...(prev[name] || {}), ...data } };
      saveCRMDataCloud(next);
      return next;
    });
    logAction('contact_update');
  };

  // ממזג שני שמות (למשל "אברהם אריאל" ו"אברהם אריאל ציגנוב") לאיש קשר אחד.
  // aliasName נעלם מהרשימות; כל התרומות/המפגשים/פרטי ה-CRM שלו עוברים ל-canonicalName.
  // מתעדכן מיידית בצד הלקוח (בלי סיבוב רשת), ונשמר ברקע לענן.
  const mergeContacts = (aliasName: string, canonicalName: string) => {
    if (!aliasName || !canonicalName || aliasName === canonicalName) return;
    setNameMerges(prevMerges => {
      const nextMerges = { ...prevMerges, [aliasName]: canonicalName };
      saveCRMDataCloud({ ...crm, [MERGES_KEY]: nextMerges });
      return nextMerges;
    });
    setDonations(prev => prev.map(d => (d.name === aliasName ? { ...d, name: canonicalName } : d)));
    setDonors(prev => coalesceDonorsByMerges(prev, { [aliasName]: canonicalName }));
    setCrm(prev => {
      if (!prev[aliasName]) return prev;
      const { [aliasName]: aliasData, ...rest } = prev;
      const canonicalData = rest[canonicalName] || {};
      rest[canonicalName] = {
        circle: canonicalData.circle || aliasData.circle,
        target: canonicalData.target ?? aliasData.target,
        phone: canonicalData.phone || aliasData.phone,
        customFields: { ...(aliasData.customFields || {}), ...(canonicalData.customFields || {}) },
      };
      return rest;
    });
  };

  // מבטל מיזוג — טוען מחדש מהשרת כדי לפצל בחזרה לשתי רשומות נפרדות עם הנתונים המקוריים
  const unmergeContact = (aliasName: string) => {
    setNameMerges(prevMerges => {
      const nextMerges = { ...prevMerges };
      delete nextMerges[aliasName];
      saveCRMDataCloud({ ...crm, [MERGES_KEY]: nextMerges });
      return nextMerges;
    });
    setTimeout(() => loadAll(), 400);
  };

  const updateHolidayExtras = (id: string, data: any) => {
    setHolidayExtras(prev => {
      const next = { ...prev, [id]: { ...(prev[id] || {}), ...data } };
      saveHolidayExtrasCloud(next);
      return next;
    });
  };

  const updateEventsData = (data: any[]) => {
    setEventsData(data);
    saveEventsDataCloud(data);
  };

  const updateRebbeDate = async (date: Date) => {
    setRebbeDate(date);
    localStorage.setItem('rebbe_date', date.toISOString());
    import('../lib/api').then(({ apiPost }) => {
      apiPost('updateRebbe', { date: date.toISOString().split('T')[0] }).catch(console.error);
    });
  };

  useEffect(() => {
    loadAll();
    const localRebbe = localStorage.getItem('rebbe_date');
    if (localRebbe) setRebbeDate(new Date(localRebbe));
  }, []);

  return (
    <AppContext.Provider value={{
      summary, donations, donors, visibleDonors, hk, failures, rebbeDate,
      shabbat, holidays, hebrewDate,
      loading, loadingText, apiError, crm, holidayExtras, eventsData, nameMerges, refresh: loadAll,
      addManualDonation, updateCrm, updateHolidayExtras, updateEventsData, updateRebbeDate,
      mergeContacts, unmergeContact, settings, updateSettings,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useAppStore = () => {
  const context = useContext(AppContext);
  if (context === undefined) throw new Error('useAppStore must be used within AppProvider');
  return context;
};
