import React, { useState } from 'react';
import { useAppStore } from '../store/AppContext';
import { getCustomHols, saveCustomHols } from '../lib/api';
import { Plus } from 'lucide-react';
import { HolidayModal } from './HolidayModal';

export function CalendarTab() {
  const { holidays, holidayExtras } = useAppStore();
  const [customHolidays, setCustomHolidays] = useState(() => getCustomHols());
  const [isAdding, setIsAdding] = useState(false);
  const [selectedHoliday, setSelectedHoliday] = useState<any>(null);

  const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = fd.get('name') as string;
    const date = fd.get('date') as string;
    const desc = fd.get('desc') as string;
    if (name && date) {
      const updated = [...customHolidays, { name, date, desc }];
      setCustomHolidays(updated);
      saveCustomHols(updated);
    }
    setIsAdding(false);
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const buildHolidays = () => {
    const list: any[] = [];
    
    // Hebcal holidays
    holidays.forEach(h => {
      const dateStr = h.date?.split('T')[0];
      if (dateStr) {
        list.push({ 
          name: h.hebrew || h.title, 
          emoji: '✡️', 
          hebrew: '', 
          dateStr, 
          desc: '' 
        });
      }
    });

    customHolidays.forEach((c: any) => {
      list.push({ name: c.name, emoji: '📅', hebrew: '', dateStr: c.date, desc: c.desc || '' });
    });

    return list.sort((a, b) => new Date(a.dateStr).getTime() - new Date(b.dateStr).getTime());
  };

  const allHols = buildHolidays();
  const upcoming = allHols.filter(h => new Date(h.dateStr) >= today);
  const past = allHols.filter(h => new Date(h.dateStr) < today);

  return (
    <div className="animate-in fade-in pb-24">
      <div className="bg-[#0D1B2A] px-4 py-3 pb-3 flex items-center justify-between sticky top-0 z-50 shadow-md">
        <div className="w-9 h-9 bg-gradient-to-br from-[#C9A84C] to-[#9B7A2F] rounded-lg flex items-center justify-center font-['Frank_Ruhl_Libre'] text-xl text-white font-black shrink-0">ח</div>
        <div className="flex-1 px-3">
          <div className="font-['Frank_Ruhl_Libre'] text-lg font-bold text-[#C9A84C]">יומן חגים</div>
          <div className="text-[11px] text-white/45 mt-[1px]">תכנון ומשימות</div>
        </div>
        <button onClick={() => setIsAdding(true)} className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center text-white/80 shrink-0">
          <Plus size={20} />
        </button>
      </div>

      <div className="p-4">
        {upcoming.length > 0 ? (
          <>
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2.5">חגים מגיעים</div>
            <div className="space-y-3">
              {upcoming.map((h, i) => {
                const days = Math.ceil((new Date(h.dateStr).getTime() - today.getTime()) / 86400000);
                const ex = holidayExtras[h.name] || {};
                const taskCount = ex.tasks?.length || 0;
                const tasksDone = ex.tasks?.filter((t: any) => t.done).length || 0;
                const remCount = ex.reminders?.length || 0;
                const lyDonors = ex.lastYear?.donors;

                return (
                  <div key={i} onClick={() => setSelectedHoliday({ ...h, id: h.name })} className="bg-white rounded-xl p-3.5 shadow-sm flex gap-3 border-r-4 border-[#C9A84C] cursor-pointer active:scale-[0.98] transition-transform">
                    <span className="text-3xl shrink-0 mt-0.5">{h.emoji}</span>
                    <div className="flex-1">
                      <div className="font-['Frank_Ruhl_Libre'] text-base font-bold text-[#0D1B2A]">{h.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{new Date(h.dateStr).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                      {h.hebrew && <div className="text-xs text-[#9B7A2F] font-semibold mt-0.5">{h.hebrew}</div>}
                      {h.desc && <div className="text-[11px] text-gray-500 mt-1.5 leading-snug">{h.desc}</div>}
                      
                      {/* Badges */ }
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {taskCount > 0 && <span className="bg-[#FEF3C7] text-[#92400E] px-2 py-0.5 rounded-md text-[10px] font-bold">📋 {tasksDone}/{taskCount} משימות</span>}
                        {remCount > 0 && <span className="bg-[#DBEAFE] text-[#1E40AF] px-2 py-0.5 rounded-md text-[10px] font-bold">🔔 {remCount} תזכורות</span>}
                        {lyDonors > 0 && <span className="bg-[#D1FAE5] text-[#065F46] px-2 py-0.5 rounded-md text-[10px] font-bold">👥 {lyDonors} אשתקד</span>}
                      </div>

                    </div>
                    <div className="bg-[#0D1B2A] rounded-lg px-2.5 py-1.5 text-center self-center shrink-0 min-w-[50px]">
                      <span className="font-['Frank_Ruhl_Libre'] text-xl font-black text-[#C9A84C] block leading-none">{days}</span>
                      <span className="text-[10px] text-white/50">ימים</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="text-center py-10 text-gray-400">
             אין אירועים קרובים
          </div>
        )}

        {past.length > 0 && (
          <>
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mt-6 mb-2.5">עברו</div>
            <div className="space-y-3">
              {past.slice(-5).reverse().map((h, i) => (
                <div key={i} onClick={() => setSelectedHoliday({ ...h, id: h.name })} className="bg-white/60 rounded-xl p-3.5 shadow-sm flex items-center gap-3 border-r-4 border-[#EDE6D6] opacity-75 grayscale-[20%] cursor-pointer active:scale-[0.98] transition-transform">
                  <span className="text-2xl shrink-0">{h.emoji}</span>
                  <div className="flex-1">
                    <div className="font-['Frank_Ruhl_Libre'] text-base font-bold text-[#0D1B2A]">{h.name}</div>
                    <div className="text-xs text-[#9B7A2F] font-semibold mt-0.5">{h.hebrew || new Date(h.dateStr).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-black/50 z-[200] flex items-end justify-center" onClick={(e) => e.target === e.currentTarget && setIsAdding(false)}>
          <div className="bg-[#FAF6EE] rounded-t-3xl p-5 pb-10 w-full max-w-[430px] animate-in slide-in-from-bottom duration-300">
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-5" />
            <h2 className="font-['Frank_Ruhl_Libre'] text-xl font-bold text-[#0D1B2A] mb-5">📅 הוספת אירוע / תזכורת</h2>
            <form onSubmit={handleAdd}>
               <div className="space-y-4">
                 <div>
                   <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">שם האירוע</label>
                   <input required name="name" type="text" className="w-full bg-white border-[1.5px] border-[#EDE6D6] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#C9A84C]" placeholder="..." />
                 </div>
                 <div>
                   <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">תאריך</label>
                   <input required name="date" type="date" className="w-full bg-white border-[1.5px] border-[#EDE6D6] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#C9A84C]" />
                 </div>
                 <div>
                   <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">הערות / משימות</label>
                   <textarea name="desc" rows={3} className="w-full bg-white border-[1.5px] border-[#EDE6D6] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#C9A84C]" placeholder="..."></textarea>
                 </div>
                 <button type="submit" className="w-full bg-gradient-to-br from-[#0D1B2A] to-[#1A2E45] text-white rounded-xl p-3.5 font-['Frank_Ruhl_Libre'] text-lg font-bold shadow-md">
                   שמור ארוע
                 </button>
               </div>
            </form>
          </div>
        </div>
      )}

      {selectedHoliday && <HolidayModal holiday={selectedHoliday} onClose={() => setSelectedHoliday(null)} />}
    </div>
  );
}
