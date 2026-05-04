import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiGet, getCRMData } from '../lib/api';
import { Donor, Donation, ReportSummary } from '../types';

interface AppState {
  summary: ReportSummary | null;
  donations: Donation[];
  donors: Record<string, Donor>;
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
  refresh: () => void;
  updateCrm: (name: string, data: any) => void;
  updateHolidayExtras: (id: string, data: any) => void;
  updateEventsData: (data: any[]) => void;
  updateRebbeDate: (date: Date) => void;
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
  const [crm, setCrm] = useState<Record<string, any>>(getCRMData());
  const [holidayExtras, setHolidayExtras] = useState<Record<string, any>>({});
  const [eventsData, setEventsData] = useState<any[]>([]);

  const loadHebcal = () => {
    fetch('https://www.hebcal.com/shabbat?cfg=json&city=Afula&M=on')
      .then(r => r.json())
      .then(data => setShabbat(data))
      .catch(console.error);

    const today = new Date();
    const y = today.getFullYear();
    // Fetch 2 full years of holidays (major, minor, exclude modern israeli secular holidays)
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
      .then(data => {
        if (data.hebrew) setHebrewDate(data.hebrew);
      })
      .catch(console.error);
  };

  const loadAll = async () => {
    setLoading(true);
    setLoadingText('מתחבר לגיליון...');
    
    loadHebcal();

    try {
      const [sumRes, donRes, failRes, rebbeRes, hkRes, donorsRes] = await Promise.all([
        apiGet('getSummary'),
        apiGet('getDonations'),
        apiGet('getFailures'),
        apiGet('getRebbe'),
        apiGet('getHK'),
        apiGet('getDonors')
      ]);

      if (sumRes._error) {
        setApiError(`${sumRes._error}: ${sumRes._details || ''}`);
      } else {
        setApiError(null);
      }

      if (rebbeRes?.date) setRebbeDate(new Date(rebbeRes.date));

      if (sumRes.total !== undefined) setSummary(sumRes);
      
      const map: Record<string, Donor> = {};
      
      // Load donors base info
      if (donorsRes.donors && donorsRes.donors.length > 0) {
        // donors[0] contains the real headers as values!
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

        // Skip the first row, it contains the visual headers mapped to bad keys
        const dataRows = donorsRes.donors.slice(1);
        
        dataRows.forEach((d: any) => {
          const cleanDonor: any = { name: d.name, total: 0, donations: [], lastDate: '' };
          Object.keys(d).forEach(badKey => {
             const val = d[badKey];
             const realHeader = headerMap[badKey] || badKey;
             cleanDonor[realHeader] = val;
          });
          
          if (cleanDonor['שם מלא']) {
             cleanDonor.name = cleanDonor['שם מלא'];
          }
          if (!cleanDonor.name) return; // Skip if no name
          map[cleanDonor.name] = cleanDonor;
        });
      }

      // Add people from CRM who aren't in map yet
      Object.keys(crm).forEach((name) => {
        if (!map[name]) {
           map[name] = { name, total: 0, donations: [], lastDate: '' };
        }
      });

      if (donRes.donations) {
        setDonations(donRes.donations);
        donRes.donations.forEach((d: Donation) => {
          if (!d.name) return;
          if (!map[d.name]) map[d.name] = { name: d.name, total: 0, donations: [], lastDate: '' };
          map[d.name].donations.push(d);
          map[d.name].total += (d.amount || 0);
          
          if (!map[d.name].lastDate || !d.date) {
             if (d.date) map[d.name].lastDate = d.date;
          } else {
             const curDateStr = d.date.split('/').reverse().join('-');
             const lastDateStr = map[d.name].lastDate.split('/').reverse().join('-');
             if (new Date(curDateStr) > new Date(lastDateStr)) {
               map[d.name].lastDate = d.date;
             }
          }
        });
      }
      setDonors(map);
      
      if (failRes.failures) setFailures(failRes.failures);
      if (hkRes.hk) setHk(hkRes.hk);
      
    } catch (e) {
      console.error('Error fetching data:', e);
      setLoadingText('שגיאת חיבור');
    }

    import('../lib/api').then(({ getHolidayExtras, getEventsData }) => {
      setHolidayExtras(getHolidayExtras());
      setEventsData(getEventsData());
    });

    setLoading(false);
  };

  const updateCrm = (name: string, data: any) => {
    import('../lib/api').then(({ saveCRMData }) => {
      setCrm(prev => {
        const next = { ...prev, [name]: { ...(prev[name] || {}), ...data } };
        saveCRMData(next);
        return next;
      });
    });
  };

  const updateHolidayExtras = (id: string, data: any) => {
    import('../lib/api').then(({ saveHolidayExtras }) => {
      setHolidayExtras(prev => {
        const next = { ...prev, [id]: { ...(prev[id] || {}), ...data } };
        saveHolidayExtras(next);
        return next;
      });
    });
  };

  const updateEventsData = (data: any[]) => {
    import('../lib/api').then(({ saveEventsData }) => {
      setEventsData(data);
      saveEventsData(data);
    });
  };

  const updateRebbeDate = async (date: Date) => {
    setRebbeDate(date);
    localStorage.setItem('rebbe_date', date.toISOString());
    
    // שליחת העדכון לגיליון (לטבלה)
    import('../lib/api').then(({ apiPost }) => {
      apiPost('updateRebbe', { date: date.toISOString().split('T')[0] }).catch(console.error);
    });
  };

  useEffect(() => {
    loadAll();
    // Load local rebbe date if overriding
    const localRebbe = localStorage.getItem('rebbe_date');
    if (localRebbe) {
      setRebbeDate(new Date(localRebbe));
    }
  }, []);

  return (
    <AppContext.Provider value={{
      summary, donations, donors, hk, failures, rebbeDate,
      shabbat, holidays, hebrewDate,
      loading, loadingText, apiError, crm, holidayExtras, eventsData, refresh: loadAll,
      updateCrm, updateHolidayExtras, updateEventsData, updateRebbeDate
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
