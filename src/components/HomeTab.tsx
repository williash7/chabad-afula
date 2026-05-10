import React, { useState } from 'react';
import { useAppStore } from '../store/AppContext';
import { Plus, Users, Calendar, PieChart, Info, AlertTriangle, CheckCircle, ChevronLeft, Pencil, X, CalendarDays, MessageSquare } from 'lucide-react';
import { ProfileModal } from './ProfileModal';
import { DateConverterModal } from './DateConverterModal';
import { ThankYouModal } from './ThankYouModal';
import { HDate } from '@hebcal/core';
import { format } from 'date-fns';
import { getCustomHols } from '../lib/api';

export function HomeTab({ setTab, onDonationClick }: { setTab: (t: string) => void, onDonationClick: () => void }) {
  const { summary, donations, failures, rebbeDate, crm, donors, shabbat, holidays, hebrewDate, updateRebbeDate, holidayExtras } = useAppStore();
  const [selectedDonor, setSelectedDonor] = useState<string | null>(null);
  const [isRebbeEditOpen, setIsRebbeEditOpen] = useState(false);
  const [isDateConverterOpen, setIsDateConverterOpen] = useState(false);
  const [isAllEventsOpen, setIsAllEventsOpen] = useState(false);
  const [selectedMethodForDetails, setSelectedMethodForDetails] = useState<string | null>(null);
  const [thankYouInfo, setThankYouInfo] = useState<{name: string, amount: number, phone: string} | null>(null);

  const handleRebbeSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const date = fd.get('date') as string;
    if (date) updateRebbeDate(new Date(date));
    setIsRebbeEditOpen(false);
  };

  const { personalAlerts, allPersonalEvents, crmAlerts } = React.useMemo(() => {
    const allPersonalEvents: any[] = [];
    const cAlerts: any[] = [];
    const today = new Date();
    today.setHours(0,0,0,0);
    const isEndOfWeek = today.getDay() === 4 || today.getDay() === 5;
    let nextHolDays = 999;
    if (holidays.length > 0) {
      const holDate = new Date(holidays[0].date.split('T')[0]);
      nextHolDays = Math.ceil((holDate.getTime() - today.getTime()) / 86400000);
    }
    const cleanHeStr = (str: string) =>
      String(str).replace(/[֑-ׇ‎‏]/g, '').replace(/[^א-ת0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const nextYearHebrew = new Map<string, number>();
    for (let i = 0; i < 400; i++) {
      const d = new HDate(new Date(today.getTime() + i * 86400000));
      const gem = d.renderGematriya ? d.renderGematriya() : d.render('he');
      let partsGem = gem.split(' '); partsGem.pop();
      let keyGem = cleanHeStr(partsGem.join(' '));
      const pGem = keyGem.split(' ');
      if (pGem.length > 1 && pGem[1].startsWith('ב') && pGem[1].length > 1) keyGem = pGem[0] + ' ' + pGem[1].substring(1);
      if (!nextYearHebrew.has(keyGem)) nextYearHebrew.set(keyGem, i);
      const numHe = d.render('he');
      let partsNum = numHe.split(',');
      let keyNum = cleanHeStr(partsNum[0]);
      const pNum = keyNum.split(' ');
      if (pNum.length > 1 && pNum[1].startsWith('ב') && pNum[1].length > 1) keyNum = pNum[0] + ' ' + pNum[1].substring(1);
      if (!nextYearHebrew.has(keyNum)) nextYearHebrew.set(keyNum, i);
    }
    Object.keys(donors).forEach(name => {
      const donor = donors[name];
      const hBday = (donor as any)['תאריך לידה עברי'] || crm[name]?.customFields?.['תאריך לידה עברי'];
      const yahrzeit = (donor as any)['יארצייט'] || (donor as any)['יורצייט'] || (donor as any)['יום השנה'] || crm[name]?.customFields?.['יארצייט'];
      const gBday = (donor as any)['תאריך לידה'] || (donor as any)['יום הולדת'];
      let hasPersonalAlert = false;
      const checkHebrewDateMatch = (bdayStr: string) => {
        const clean = cleanHeStr(bdayStr);
        for (const k of nextYearHebrew.keys()) {
          if (clean === k || clean.startsWith(k + ' ') || k === clean + ' ' || clean.includes(' ' + k + ' ') || clean.endsWith(' ' + k)) return k;
        }
        return null;
      };
      if (hBday) {
        const matchKey = checkHebrewDateMatch(hBday);
        if (matchKey && nextYearHebrew.has(matchKey)) {
          const idx = nextYearHebrew.get(matchKey)!;
          allPersonalEvents.push({ type: 'info', name, msg: 'יום הולדת עברי ' + (idx === 0 ? 'היום' : `בעוד ${idx} ימים`), action: '🎁 ברך', icon: '🎂', priority: 1, dist: idx });
          hasPersonalAlert = true;
        }
      }
      if (yahrzeit) {
        const matchKey = checkHebrewDateMatch(yahrzeit);
        if (matchKey && nextYearHebrew.has(matchKey)) {
          const idx = nextYearHebrew.get(matchKey)!;
          allPersonalEvents.push({ type: 'info', name, msg: 'יארצייט ' + (idx === 0 ? 'היום' : `בעוד ${idx} ימים`), action: '🕯️ הודעה', icon: '🕯️', priority: 1, dist: idx });
          hasPersonalAlert = true;
        }
      }
      if (!hasPersonalAlert && gBday) {
        const gStr = String(gBday);
        let d = 0, m = 0;
        const isoMatch = gStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
        if (isoMatch) { m = parseInt(isoMatch[2]); d = parseInt(isoMatch[3]); }
        else { const match = gStr.match(/(\d{1,2})[\/\.-](\d{1,2})/); if (match) { d = parseInt(match[1]); m = parseInt(match[2]); } }
        if (d > 0 && m > 0 && d <= 31 && m <= 12) {
          const dateThisYear = new Date(today.getFullYear(), m - 1, d);
          if (dateThisYear < today) dateThisYear.setFullYear(today.getFullYear() + 1);
          const realDays = Math.ceil((dateThisYear.getTime() - today.getTime()) / 86400000);
          if (realDays >= 0) allPersonalEvents.push({ type: 'info', name, msg: 'יום הולדת ' + (realDays === 0 ? 'היום' : `בעוד ${realDays} ימים`), action: '🎁 ברך', icon: '🎈', priority: 1, dist: realDays });
        }
      }
      const data = crm[name];
      if (data?.target && !hasPersonalAlert) {
        if (nextHolDays <= 14) cAlerts.push({ type: 'info', name, msg: 'חג מתקרב — הזמן אישית!', action: '💬 שלח', icon: '🍷', priority: 2 });
        else if (isEndOfWeek && Math.random() > 0.5) cAlerts.push({ type: 'target', name, msg: 'התקשר לאחל שבת שלום', action: '📞 התקשר', icon: '🕯️', priority: 3 });
        else cAlerts.push({ type: 'target', name, msg: 'מסומן להקרב — הצע חברותא או פגישה', action: '📝 תכנן', icon: '🎯', priority: 4 });
      }
    });
    cAlerts.sort((a, b) => (a.priority || 5) - (b.priority || 5));
    allPersonalEvents.sort((a, b) => (a.dist || 0) - (b.dist || 0));
    return { personalAlerts: allPersonalEvents.filter(a => a.dist <= 30).slice(0, 10), allPersonalEvents, crmAlerts: cAlerts };
  }, [donors, crm, holidays]);

  const recent = [...donations].sort((a, b) => {
    const aDate = a.date.split('/').reverse().join('-');
    const bDate = b.date.split('/').reverse().join('-');
    return new Date(bDate).getTime() - new Date(aDate).getTime();
  }).slice(0, 5);

  const currentHMonthCode = new HDate().getMonthName();
  const monthMap: Record<string, string> = {
    'Nisan': 'ניסן', 'Iyyar': 'אייר', 'Sivan': 'סיוון', 'Tamuz': 'תמוז', 'Av': 'אב', 'Elul': 'אלול',
    'Tishrei': 'תשרי', 'Cheshvan': 'חשוון', 'Kislev': 'כסלו', 'Tevet': 'טבת', "Sh'vat": 'שבט',
    'Adar I': "אדר א'", 'Adar II': "אדר ב'", 'Adar': 'אדר'
  };
  const currentHbMonth = monthMap[currentHMonthCode] || '';

  // ── Render helpers ──────────────────────────────────────────────────────────

  const renderPersonalDates = () => (
    <div className="mb-0">
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-['Frank_Ruhl_Libre'] text-lg font-bold text-[#0D1B2A] flex items-center gap-2">
          <span className="text-xl">🎂</span> 10 יארצייט וימי הולדת הקרובים
        </h2>
        {allPersonalEvents.length > 0 && (
          <button onClick={() => setIsAllEventsOpen(true)} className="text-xs text-[#9B7A2F] font-bold">
            הצג הכל ({allPersonalEvents.length}) &gt;
          </button>
        )}
      </div>
      {personalAlerts.length === 0 ? (
        <div className="bg-white rounded-xl p-6 text-center text-gray-500 shadow-sm text-sm border border-[#EDE6D6]">
          🎉 אין פה כרגע אירועים אישיים ב-30 הימים הקרובים
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-[#EDE6D6] overflow-hidden">
          <table className="w-full text-right text-sm">
            <thead className="bg-gray-50 border-b border-[#EDE6D6] text-gray-500 text-[11px] uppercase tracking-wide">
              <tr>
                <th className="py-2 px-3 font-semibold">סוג</th>
                <th className="py-2 px-3 font-semibold">שם</th>
                <th className="py-2 px-3 font-semibold">מתי</th>
                <th className="py-2 px-3 font-semibold text-center">פעולה</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDE6D6]">
              {personalAlerts.map((a: any, i: number) => (
                <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-2 px-3">
                    <span className="flex items-center gap-1.5 text-[#0D1B2A]">
                      <span className="text-base">{a.icon}</span>
                      <span className="max-w-[70px] truncate">{a.msg.split(' ')[0]} {a.msg.split(' ')[1]}</span>
                    </span>
                  </td>
                  <td className="py-2 px-3 font-bold text-[#0D1B2A] whitespace-nowrap">{a.name}</td>
                  <td className="py-2 px-3 text-gray-600 whitespace-nowrap">{a.msg.replace(/^(יום הולדת עברי|יארצייט|יום הולדת|יום הולדת לועזי)\s*/, '')}</td>
                  <td className="py-2 px-3 text-center">
                    <button onClick={() => setSelectedDonor(a.name)} className="bg-[#C9A84C]/10 text-[#9B7A2F] text-[10px] font-bold px-2.5 py-1 rounded-md active:scale-95 transition-transform whitespace-nowrap">
                      {a.action}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderCRMAlerts = () => {
    if (crmAlerts.length === 0) return (
      <div className="bg-white rounded-xl p-4 text-center text-gray-500 shadow-sm text-sm border border-[#EDE6D6]">✅ אין כרגע משימות קשר.</div>
    );
    return (
      <div className="space-y-2">
        {crmAlerts.slice(0, 5).map((a, i) => (
          <div key={i} className="bg-white border border-[#EDE6D6] rounded-xl p-3 flex items-center gap-3 shadow-sm">
            <span className="text-xl shrink-0">{a.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-[#0D1B2A]">{a.name}</div>
              <div className="text-xs text-gray-600 mt-0.5">{a.msg}</div>
            </div>
            <button onClick={() => setSelectedDonor(a.name)} className="bg-[#0D1B2A] text-[#E8C97A] text-[11px] font-bold px-3 py-1.5 rounded-lg shrink-0">{a.action}</button>
          </div>
        ))}
      </div>
    );
  };

  const renderShabbatCard = () => {
    if (!shabbat?.items) return null;
    const parasha = shabbat.items.find((i: any) => i.category === 'parashat');
    const candles = shabbat.items.find((i: any) => i.category === 'candles');
    const havdala = shabbat.items.find((i: any) => i.category === 'havdalah');
    const formatTime = (isoString?: string) => {
      if (!isoString) return '—';
      const d = new Date(isoString);
      return `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
    };
    return (
      <div className="bg-gradient-to-br from-[#1B0042] to-[#3B0082] rounded-2xl p-4 text-white flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="text-3xl">🕯️</span>
          <div className="flex-1">
            <div className="font-['Frank_Ruhl_Libre'] text-base font-bold">{parasha?.hebrew || parasha?.title || 'פרשת השבוע'}</div>
            <div className="flex gap-4 mt-1">
              <div className="text-center">
                <div className="font-['Frank_Ruhl_Libre'] text-lg font-bold text-[#E8C97A]">{formatTime(candles?.date)}</div>
                <div className="text-[10px] text-white/50 mt-[1px]">הדלקת נרות</div>
              </div>
              <div className="text-center">
                <div className="font-['Frank_Ruhl_Libre'] text-lg font-bold text-[#E8C97A]">{formatTime(havdala?.date)}</div>
                <div className="text-[10px] text-white/50 mt-[1px]">הבדלה</div>
              </div>
            </div>
          </div>
        </div>
        <button onClick={() => setTab('poster')} className="bg-[#C9A84C] text-white text-[10px] font-bold px-3 py-1.5 rounded-lg flex flex-col items-center shrink-0 active:scale-95 transition-transform">
          <span className="text-lg leading-none mb-1">📜</span>מודעה
        </button>
      </div>
    );
  };

  const renderHolidaysAndTasks = () => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const allHols: any[] = [];
    holidays.forEach(h => { const dateStr = h.date?.split('T')[0]; if (dateStr) allHols.push({ name: h.hebrew || h.title, dateStr, emoji: '✡️' }); });
    getCustomHols().forEach((c: any) => allHols.push({ name: c.name, dateStr: c.date, emoji: '📅' }));
    allHols.sort((a, b) => new Date(a.dateStr).getTime() - new Date(b.dateStr).getTime());
    const upcoming = allHols.filter(h => new Date(h.dateStr) >= today).slice(0, 3);
    if (upcoming.length === 0) return null;
    return (
      <div>
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-['Frank_Ruhl_Libre'] text-lg font-bold text-[#0D1B2A] flex items-center gap-2">
            <span className="text-xl">📅</span> תכנון ומשימות חגים
          </h2>
          <button onClick={() => setTab('calendar')} className="text-xs font-semibold text-[#9B7A2F] flex items-center">ללוח השנה <ChevronLeft size={14} /></button>
        </div>
        <div className="space-y-3">
          {upcoming.map((h, i) => {
            const days = Math.ceil((new Date(h.dateStr).getTime() - today.getTime()) / 86400000);
            const extra = holidayExtras[h.name] || {};
            const tasks = extra.tasks || [];
            const openTasks = tasks.filter((t: any) => !t.done);
            return (
              <div key={i} className="bg-white rounded-xl p-3 border border-[#EDE6D6] shadow-sm">
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-50">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{h.emoji}</span>
                    <div>
                      <div className="text-sm font-bold text-[#0D1B2A]">{h.name}</div>
                      <div className="text-xs text-gray-500">{new Date(h.dateStr).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })} · בעוד {days} ימים</div>
                    </div>
                  </div>
                  {tasks.length > 0 && (
                    <div className={`text-[10px] font-bold px-2 py-1 rounded-md ${openTasks.length === 0 ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                      {openTasks.length} משימות פתוחות
                    </div>
                  )}
                </div>
                {openTasks.length > 0 ? (
                  <div className="space-y-1.5 mt-2">
                    {openTasks.slice(0, 3).map((t: any, j: number) => (
                      <div key={j} className="flex items-center gap-2 text-xs text-gray-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div>
                        <div className="truncate flex-1">{t.text}</div>
                      </div>
                    ))}
                    {openTasks.length > 3 && <div className="text-[10px] text-gray-400 mt-1">+{openTasks.length - 3} משימות נוספות...</div>}
                  </div>
                ) : tasks.length > 0 ? (
                  <div className="text-xs text-green-600 flex items-center gap-1 mt-1"><CheckCircle size={12} /> כל המשימות הושלמו!</div>
                ) : (
                  <div className="text-xs text-gray-400 mt-1 italic">אין משימות מתוכננות לחג זה</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderRebbeCard = () => {
    const now = new Date();
    const diff = rebbeDate ? Math.floor((now.getTime() - rebbeDate.getTime()) / 86400000) : null;
    const urgency = diff !== null && diff > 30 ? '⚠️ ' : diff !== null && diff > 14 ? '🔔 ' : '✅ ';
    const bg = diff === null ? 'bg-white/10 text-white/60 border-white/20' :
      diff > 30 ? 'bg-red-500/20 text-red-300 border-red-500/30' :
      diff > 14 ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
      'bg-green-500/20 text-green-300 border-green-500/30';
    return (
      <div className="bg-gradient-to-br from-[#1a0a00] to-[#3d1f00] rounded-2xl p-4 text-white relative overflow-hidden group">
        <div className="absolute -left-2 -bottom-2 text-7xl text-white/5 font-['Frank_Ruhl_Libre'] font-black leading-none pointer-events-none">770</div>
        <div className="flex justify-between items-start relative z-10">
          <div>
            <div className="text-[11px] text-white/45 uppercase tracking-wide mb-1.5">✉️ כתיבה לרבי</div>
            <div className="font-['Frank_Ruhl_Libre'] text-2xl font-bold text-[#E8C97A]">
              {rebbeDate ? rebbeDate.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' }) : 'לא עודכן מעולם'}
            </div>
            <div className="text-xs text-white/45 mt-1">מייל אחרון ל-ohel@ohelchabad.org</div>
            {diff !== null && <div className={`inline-block rounded-lg px-2.5 py-1 text-xs mt-2 border ${bg}`}>{urgency}לפני {diff} ימים</div>}
            <div className="mt-4">
              <a href="mailto:ohel@ohelchabad.org?subject=כתיבה לרבי" className="inline-block bg-[#E8C97A] text-[#1a0a00] font-bold text-xs px-4 py-2 rounded-lg transition-transform hover:scale-105 active:scale-95 shadow-sm">שלח מייל עכשיו ✉️</a>
            </div>
          </div>
          <button onClick={() => setIsRebbeEditOpen(true)} className="p-2 bg-white/10 rounded-full text-white/70 hover:bg-white/20 transition-colors">
            <Pencil size={14} />
          </button>
        </div>
      </div>
    );
  };

  const renderHeroSummary = () => (
    <div className="bg-gradient-to-br from-[#0D1B2A] to-[#1A2E45] rounded-2xl p-5 relative overflow-hidden text-white shadow-lg">
      <div className="absolute -top-3 -left-2 text-[110px] text-[#C9A84C]/5 leading-none pointer-events-none">✡</div>
      <div className="flex items-center justify-between mb-1">
        <div className="text-[11px] text-white/60 uppercase tracking-widest flex items-center gap-1.5 cursor-pointer"
          onClick={() => alert('הסכום משקף את כל התרומות והוראות הקבע שחויבו בפועל. הסכום אינו כולל חיובים שסורבו ע"י חברת האשראי.')}>
          <span>סה"כ תרומות מתחילת השנה</span>
          <Info size={12} className="text-white/40" />
        </div>
      </div>
      <div className="font-['Frank_Ruhl_Libre'] text-4xl font-black text-[#E8C97A] leading-none mb-1">
        <span className="text-xl font-normal ml-1">₪</span>{summary?.total?.toLocaleString() || 0}
      </div>
      <div className="flex items-center justify-between text-xs text-white/45">
        <div>החודש: ₪{summary?.thisMonthTotal?.toLocaleString() || 0} · {summary?.donorCount || 0} אנשי קשר תרמו</div>
      </div>
      <div className="text-[9px] text-white/30 mt-1 opacity-80">(כולל הו"ק. ללא עסקאות שסורבו)</div>
      <div className="flex flex-wrap gap-2 mt-3">
        {summary?.byMethod && Object.entries(summary.byMethod).map(([method, amount], i) => (
          <div key={method} onClick={() => setSelectedMethodForDetails(method)}
            className="bg-white/5 border border-white/10 rounded-full px-3 py-1 text-[11px] text-white/65 flex items-center gap-1.5 cursor-pointer hover:bg-white/10 transition-colors">
            <div className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-blue-500' : i === 2 ? 'bg-emerald-500' : 'bg-purple-500'}`} />
            <span className="opacity-80">{method}:</span>
            <span className="font-['Frank_Ruhl_Libre'] font-bold text-white tracking-wide">₪{(amount as number).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderStatsRow = () => (
    <div className="grid grid-cols-2 gap-3">
      <div className="bg-white rounded-xl p-3.5 shadow-sm">
        <div className="text-[11px] text-gray-500 uppercase tracking-wide mb-1">תורמים</div>
        <div className="font-['Frank_Ruhl_Libre'] text-3xl font-bold text-[#0D1B2A] leading-none mb-1">{summary?.donorCount || 0}</div>
        <div className="text-[11px] text-green-500 font-medium">פעילים</div>
      </div>
      <div className="bg-white rounded-xl p-3.5 shadow-sm">
        <div className="text-[11px] text-gray-500 uppercase tracking-wide mb-1">הוראות קבע</div>
        <div className="font-['Frank_Ruhl_Libre'] text-3xl font-bold text-[#0D1B2A] leading-none mb-1">{summary?.hkActive || 0}</div>
        <div className="text-[11px] text-green-500 font-medium">
          {(summary?.failureCount || 0) > 0 ? (
            <span className="text-amber-500 flex items-center gap-1"><AlertTriangle size={10} /> {summary?.failureCount || 0} שגיאות</span>
          ) : (
            <span className="flex items-center gap-1"><CheckCircle size={10} /> תקין</span>
          )}
        </div>
      </div>
    </div>
  );

  const renderQuickActions = () => (
    <div>
      <h2 className="font-['Frank_Ruhl_Libre'] text-lg font-bold text-[#0D1B2A] mb-3">פעולות מהירות</h2>
      <div className="grid grid-cols-4 md:grid-cols-2 gap-2">
        <button onClick={onDonationClick} className="bg-white rounded-xl p-3 flex flex-col items-center gap-1 shadow-sm active:scale-95 transition-transform">
          <span className="text-2xl">💰</span><span className="text-[10px] font-semibold text-[#0D1B2A]">תרומה</span>
        </button>
        <button onClick={() => setTab('donors')} className="bg-white rounded-xl p-3 flex flex-col items-center gap-1 shadow-sm active:scale-95 transition-transform">
          <Users size={24} className="text-[#0D1B2A]" /><span className="text-[10px] font-semibold text-[#0D1B2A]">אנשי קשר</span>
        </button>
        <button onClick={() => setTab('calendar')} className="bg-white rounded-xl p-3 flex flex-col items-center gap-1 shadow-sm active:scale-95 transition-transform">
          <Calendar size={24} className="text-[#0D1B2A]" /><span className="text-[10px] font-semibold text-[#0D1B2A]">חגים</span>
        </button>
        <button onClick={() => setTab('reports')} className="bg-white rounded-xl p-3 flex flex-col items-center gap-1 shadow-sm active:scale-95 transition-transform">
          <PieChart size={24} className="text-[#0D1B2A]" /><span className="text-[10px] font-semibold text-[#0D1B2A]">דוחות</span>
        </button>
      </div>
    </div>
  );

  const renderFailures = () => {
    if (failures.length === 0) return null;
    return (
      <div>
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-['Frank_Ruhl_Libre'] text-lg font-bold text-red-600 flex items-center gap-2">
            <AlertTriangle size={18} /> שגיאות חיוב
          </h2>
          {failures.length > 3 && (
            <button onClick={() => setSelectedMethodForDetails('failures_modal')} className="text-xs font-semibold text-red-600 flex items-center">
              הצג הכל ({failures.length}) <ChevronLeft size={14} />
            </button>
          )}
        </div>
        <div className="space-y-2">
          {failures.slice(0, 3).map((f, i) => (
            <div key={i} className="bg-red-50 rounded-xl p-3 pr-4 border-r-4 border-red-500 flex items-start gap-3 cursor-pointer" onClick={() => setSelectedDonor(f.name)}>
              <span className="text-xl shrink-0 mt-0.5">❌</span>
              <div>
                <div className="text-sm font-bold text-red-800">{f.name}</div>
                <div className="text-xs text-red-600 mt-0.5">{f.reason} · ₪{f.amount} · {f.date}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderRecent = () => (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-['Frank_Ruhl_Libre'] text-lg font-bold text-[#0D1B2A] flex items-center gap-2">
          <span className="text-xl">💰</span> תרומות אחרונות
        </h2>
        <button onClick={() => setTab('donors')} className="text-xs font-semibold text-[#9B7A2F] flex items-center">הכל <ChevronLeft size={14} /></button>
      </div>
      {recent.length === 0 ? (
        <div className="text-center py-6 text-gray-500 text-sm">אין תרומות עדיין</div>
      ) : (
        <div className="space-y-2">
          {recent.map((d, i) => (
            <div key={i} className="bg-white rounded-xl p-3 flex items-center gap-3 shadow-sm border border-[#EDE6D6]">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C9A84C] to-[#9B7A2F] flex items-center justify-center text-white font-bold text-lg shrink-0">
                {d.name?.charAt(0) || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-[#0D1B2A] truncate">{d.name}</div>
                <div className="text-[10px] text-gray-500 truncate">{d.date} · {d.method}</div>
              </div>
              <div className="text-left shrink-0 flex flex-col items-end">
                <div className="font-['Frank_Ruhl_Libre'] text-base font-bold text-[#9B7A2F]">₪{(d.amount || 0).toLocaleString()}</div>
                <div className="text-[10px] text-gray-500 mb-1">{d.purpose || 'תרומה'}</div>
                <button onClick={(e) => { e.stopPropagation(); setThankYouInfo({ name: d.name, amount: d.amount || 0, phone: crm[d.name]?.phone || '' }); }}
                  className="bg-green-50 text-green-600 p-1 rounded hover:bg-green-100 transition-colors" title="שלח הודעת תודה">
                  <MessageSquare size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ── Shared modal for method/failures details ────────────────────────────────
  const renderMethodModal = () => {
    if (!selectedMethodForDetails) return null;
    return (
      <div className="fixed inset-0 bg-black/50 z-[200] flex items-end md:items-center justify-center p-0 md:p-4" onClick={(e) => e.target === e.currentTarget && setSelectedMethodForDetails(null)}>
        <div className="bg-[#FAF6EE] rounded-t-3xl md:rounded-3xl p-5 pb-10 md:pb-5 w-full max-w-[430px] md:max-w-xl max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
          <div className="flex justify-between items-center mb-5">
            <h2 className="font-['Frank_Ruhl_Libre'] text-xl font-bold text-[#0D1B2A] flex items-center gap-2">
              {selectedMethodForDetails === 'failures_modal'
                ? <span className="text-red-600 flex items-center gap-2"><AlertTriangle size={20} /> שגיאות חיוב אחרונות</span>
                : `תרומות מ: ${selectedMethodForDetails}`}
            </h2>
            <button onClick={() => setSelectedMethodForDetails(null)} className="p-2 bg-white rounded-full shadow-sm"><X size={16} /></button>
          </div>
          <div className="space-y-3">
            {selectedMethodForDetails === 'failures_modal' ? (
              failures.map((f, i) => (
                <div key={i} className="bg-red-50 rounded-xl p-3 shadow-sm border border-red-100 flex items-center justify-between cursor-pointer" onClick={() => setSelectedDonor(f.name)}>
                  <div>
                    <div className="font-bold text-red-900 text-sm">{f.name}</div>
                    <div className="text-xs text-red-600 mt-0.5">{f.date} · {f.reason}</div>
                  </div>
                  <div className="font-['Frank_Ruhl_Libre'] font-bold text-lg text-red-600 shrink-0 mr-3">₪{f.amount}</div>
                </div>
              ))
            ) : (
              donations.filter(d => d.method === selectedMethodForDetails).slice().reverse().map((d, i) => (
                <div key={i} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex items-center justify-between cursor-pointer" onClick={() => setSelectedDonor(d.name)}>
                  <div>
                    <div className="font-bold text-[#0D1B2A] text-sm">{d.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{d.date} {d.purpose && `· ${d.purpose}`}</div>
                  </div>
                  <div className="flex flex-col items-end shrink-0 mr-3">
                    <div className="font-['Frank_Ruhl_Libre'] font-bold text-lg text-[#C9A84C]">₪{d.amount?.toLocaleString() || 0}</div>
                    <button onClick={(e) => { e.stopPropagation(); setThankYouInfo({ name: d.name, amount: d.amount || 0, phone: crm[d.name]?.phone || '' }); }}
                      className="bg-green-50 text-green-600 p-1.5 rounded-lg mt-1 hover:bg-green-100 transition-colors" title="שלח הודעת תודה">
                      <MessageSquare size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
            {selectedMethodForDetails !== 'failures_modal' && donations.filter(d => d.method === selectedMethodForDetails).length === 0 && (
              <div className="text-center py-6 text-gray-500 text-sm">אין תרומות מאפיק זה</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ── Main render ─────────────────────────────────────────────────────────────
  return (
    <div className="animate-in fade-in pb-24 md:pb-0">
      {/* Topbar */}
      <div className="bg-[#0D1B2A] px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-50 shadow-md">
        <div className="w-9 h-9 bg-gradient-to-br from-[#C9A84C] to-[#9B7A2F] rounded-lg flex items-center justify-center font-['Frank_Ruhl_Libre'] text-xl text-white font-black shrink-0 md:hidden">ח</div>
        <div className="flex-1 px-3 md:px-0">
          <div className="font-['Frank_Ruhl_Libre'] text-lg font-bold text-[#C9A84C]">דשבורד</div>
          <div className="text-[11px] text-white/45 mt-[1px]">{hebrewDate}</div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setIsDateConverterOpen(true)} className="w-9 h-9 bg-white/10 text-[#E8C97A] rounded-full flex items-center justify-center shrink-0">
            <CalendarDays size={18} />
          </button>
          <button onClick={onDonationClick} className="w-9 h-9 bg-[#C9A84C]/20 text-[#E8C97A] rounded-full flex items-center justify-center shrink-0">
            <Plus size={20} />
          </button>
        </div>
      </div>

      {/* ── Mobile layout ── */}
      <div className="p-4 space-y-4 md:hidden">
        {renderRebbeCard()}
        {renderShabbatCard()}
        {renderHeroSummary()}
        {renderStatsRow()}
        {renderHolidaysAndTasks()}
        {renderQuickActions()}
        {renderPersonalDates()}
        <div>
          <h2 className="font-['Frank_Ruhl_Libre'] text-lg font-bold text-[#0D1B2A] mb-3 flex items-center gap-2"><span className="text-xl">📋</span> לטיפול עכשיו</h2>
          {renderCRMAlerts()}
        </div>
        {renderFailures()}
        {renderRecent()}
      </div>

      {/* ── Desktop layout — two columns ── */}
      <div className="hidden md:grid md:grid-cols-[1fr_380px] md:gap-6 md:p-6 md:items-start">
        {/* Left: primary data */}
        <div className="space-y-5">
          {renderHeroSummary()}
          {renderStatsRow()}
          {renderPersonalDates()}
          {renderFailures()}
          {renderRecent()}
        </div>
        {/* Right: context & actions */}
        <div className="space-y-5">
          {renderRebbeCard()}
          {renderShabbatCard()}
          {renderHolidaysAndTasks()}
          {renderQuickActions()}
          <div>
            <h2 className="font-['Frank_Ruhl_Libre'] text-lg font-bold text-[#0D1B2A] mb-3 flex items-center gap-2"><span className="text-xl">📋</span> לטיפול עכשיו</h2>
            {renderCRMAlerts()}
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      {isRebbeEditOpen && (
        <div className="fixed inset-0 bg-black/50 z-[200] flex items-end md:items-center justify-center p-0 md:p-4" onClick={(e) => e.target === e.currentTarget && setIsRebbeEditOpen(false)}>
          <div className="bg-[#FAF6EE] rounded-t-3xl md:rounded-3xl p-5 pb-10 md:pb-5 w-full max-w-[430px] md:max-w-sm animate-in slide-in-from-bottom duration-300">
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-5 md:hidden" />
            <h2 className="font-['Frank_Ruhl_Libre'] text-xl font-bold text-[#0D1B2A] mb-5">✉️ תאריך כתיבה לרבי</h2>
            <form onSubmit={handleRebbeSave}>
              <div className="mb-4">
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">תאריך הוצאת מכתב או מייל</label>
                <input type="date" name="date" required defaultValue={rebbeDate?.toISOString().split('T')[0]}
                  className="w-full bg-white border-[1.5px] border-[#EDE6D6] rounded-xl px-3 py-2.5 text-sm text-[#0D1B2A] outline-none focus:border-[#C9A84C]" />
              </div>
              <button type="submit" className="w-full bg-gradient-to-br from-[#C9A84C] to-[#9B7A2F] text-white rounded-xl p-3.5 font-['Frank_Ruhl_Libre'] text-lg font-bold shadow-md active:scale-95 transition-transform">
                עדכן תאריך
              </button>
            </form>
          </div>
        </div>
      )}

      {renderMethodModal()}

      {isAllEventsOpen && (
        <div className="fixed inset-0 bg-black/50 z-[200] flex items-end md:items-center justify-center p-0 md:p-4" onClick={(e) => e.target === e.currentTarget && setIsAllEventsOpen(false)}>
          <div className="bg-[#FAF6EE] rounded-t-3xl md:rounded-3xl p-5 pb-10 md:pb-5 w-full max-w-[430px] md:max-w-2xl max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-5 sticky top-0 bg-[#FAF6EE] py-2 z-10">
              <h2 className="font-['Frank_Ruhl_Libre'] text-xl font-bold text-[#0D1B2A] flex items-center gap-2"><span className="text-2xl">🎂</span> כל אירועי ימי ההולדת והיארצייט</h2>
              <button onClick={() => setIsAllEventsOpen(false)} className="p-2 bg-white rounded-full shadow-sm"><X size={16} /></button>
            </div>
            <div className="md:grid md:grid-cols-2 md:gap-3 space-y-3 md:space-y-0">
              {allPersonalEvents.map((a: any, i: number) => (
                <div key={i} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex items-center justify-between cursor-pointer" onClick={() => setSelectedDonor(a.name)}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{a.icon}</span>
                    <div>
                      <div className="font-bold text-[#0D1B2A] text-sm">{a.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{a.msg}</div>
                    </div>
                  </div>
                  <div className="text-[#C9A84C] text-[10px] font-bold bg-[#C9A84C]/10 px-2.5 py-1 rounded-md shrink-0">{a.action}</div>
                </div>
              ))}
              {allPersonalEvents.length === 0 && <div className="text-center py-6 text-gray-500 text-sm md:col-span-2">אין עדיין ימי הולדת או יארצייט במערכת.</div>}
            </div>
          </div>
        </div>
      )}

      {selectedDonor && <ProfileModal name={selectedDonor} onClose={() => setSelectedDonor(null)} />}
      {isDateConverterOpen && <DateConverterModal onClose={() => setIsDateConverterOpen(false)} />}
      {thankYouInfo && <ThankYouModal donorName={thankYouInfo.name} amount={thankYouInfo.amount} phone={thankYouInfo.phone} onClose={() => setThankYouInfo(null)} />}
    </div>
  );
}
