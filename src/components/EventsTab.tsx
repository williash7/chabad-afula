import React, { useState } from 'react';
import { useAppStore } from '../store/AppContext';
import { Plus, Check, X, ClipboardList } from 'lucide-react';
import { format } from 'date-fns';
import { createInviteTask, toggleInvitePerson, inviteRemainingMinutes, MINUTES_PER_CALL } from '../lib/tasks';

export function EventsTab() {
  const { eventsData, updateEventsData, visibleDonors, crm, hk, failures } = useAppStore();
  const [filter, setFilter] = useState('all');
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [attEventId, setAttEventId] = useState<string | null>(null);
  const [tasksEventId, setTasksEventId] = useState<string | null>(null);
  const [taskText, setTaskText] = useState('');

  const [evName, setEvName] = useState('');
  const [evType, setEvType] = useState('shabbat');
  const [evFreq, setEvFreq] = useState('weekly');
  const [evDate, setEvDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [evTime, setEvTime] = useState('');
  
  const [attSearch, setAttSearch] = useState('');
  const [attCategory, setAttCategory] = useState('all');
  const [pendingAtt, setPendingAtt] = useState<Record<string, boolean>>({});

  const typeIcons: Record<string, string> = { shabbat: '🕯️', minyan: '🙏', class: '📚', other: '📌' };
  const typeLabels: Record<string, string> = { shabbat: 'שבת', minyan: 'מניין', class: 'שיעור', other: 'אחר' };
  const freqLabels: Record<string, string> = { weekly: 'שבועי', biweekly: 'דו-שבועי', monthly: 'חודשי', oneoff: 'חד-פעמי' };

  const activeEvents = filter === 'all' ? eventsData : eventsData.filter((e: any) => e.type === filter);

  const saveEvent = () => {
    if (!evName.trim()) return;
    const newEv = {
      id: `ev_${Date.now()}`,
      name: evName.trim(),
      type: evType,
      freq: evFreq,
      date: evDate,
      time: evTime,
      attendance: {}
    };
    updateEventsData([...eventsData, newEv]);
    setIsAddingMode(false);
    setEvName('');
  };

  const openAttModal = (ev: any) => {
    const today = format(new Date(), 'dd/MM/yyyy');
    setPendingAtt({ ...(ev.attendance?.[today] || {}) });
    setAttEventId(ev.id);
    setAttSearch('');
  };

  const saveAttendance = () => {
    if (!attEventId) return;
    const today = format(new Date(), 'dd/MM/yyyy');
    const updated = eventsData.map((e: any) => {
      if (e.id === attEventId) {
        return {
          ...e,
          attendance: {
            ...e.attendance,
            [today]: pendingAtt
          }
        };
      }
      return e;
    });
    updateEventsData(updated);
    setAttEventId(null);
  };

  const currentAttEvent = eventsData.find((e: any) => e.id === attEventId);
  const currentTasksEvent = eventsData.find((e: any) => e.id === tasksEventId);

  const toggleEventTask = (idx: number) => {
    if (!currentTasksEvent) return;
    const nextTasks = [...(currentTasksEvent.tasks || [])];
    nextTasks[idx] = { ...nextTasks[idx], done: !nextTasks[idx].done };
    updateEventsData(eventsData.map((e: any) => e.id === tasksEventId ? { ...e, tasks: nextTasks } : e));
  };

  const addEventTask = () => {
    if (!taskText.trim() || !currentTasksEvent) return;
    const nextTasks = [...(currentTasksEvent.tasks || []), { text: taskText.trim(), done: false }];
    updateEventsData(eventsData.map((e: any) => e.id === tasksEventId ? { ...e, tasks: nextTasks } : e));
    setTaskText('');
  };

  const toggleEventInvitePerson = (idx: number, person: string) => {
    if (!currentTasksEvent) return;
    const nextTasks = [...(currentTasksEvent.tasks || [])];
    nextTasks[idx] = toggleInvitePerson(nextTasks[idx], person);
    updateEventsData(eventsData.map((e: any) => e.id === tasksEventId ? { ...e, tasks: nextTasks } : e));
  };

  const addEventInviteTask = () => {
    if (!currentTasksEvent || donorNames.length === 0) return;
    const nextTasks = [...(currentTasksEvent.tasks || []), createInviteTask(currentTasksEvent.name, donorNames)];
    updateEventsData(eventsData.map((e: any) => e.id === tasksEventId ? { ...e, tasks: nextTasks } : e));
  };

  const donorNames = Object.keys(visibleDonors).filter(n => {
    if (attSearch && !n.includes(attSearch)) return false;
    if (attCategory !== 'all') {
      const cData = crm[n] || {};
      if (attCategory === 'target' && !cData.target) return false;
      if (attCategory === 'hk') {
        const hasHk = hk.some((h: any) => h.name === n && h.active);
        if (!hasHk) return false;
      }
      if (attCategory === 'errors') {
        const hasError = failures.some((f: any) => f.name === n);
        if (!hasError) return false;
      }
      if (['close', 'approach', 'third', 'far'].includes(attCategory) && cData.circle !== attCategory) return false;
    }
    return true;
  }).sort();

  return (
    <div className="animate-in fade-in pb-24">
      <div className="bg-[#0D1B2A] px-4 py-3 pb-3 flex items-center justify-between sticky top-0 z-50 shadow-md">
        <div className="w-9 h-9 bg-gradient-to-br from-[#C9A84C] to-[#9B7A2F] rounded-lg flex items-center justify-center font-['Frank_Ruhl_Libre'] text-xl text-white font-black shrink-0">ח</div>
        <div className="flex-1 px-3">
          <div className="font-['Frank_Ruhl_Libre'] text-lg font-bold text-[#C9A84C]">אירועים קבועים</div>
          <div className="text-[11px] text-white/45 mt-[1px]">{activeEvents.length} אירועים פעילים</div>
        </div>
        <button onClick={() => setIsAddingMode(true)} className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center text-white/80 shrink-0">
          <Plus size={20} />
        </button>
      </div>

      <div className="p-4">
        {/* Filters */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 custom-scrollbar">
           <button onClick={() => setFilter('all')} className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors ${filter === 'all' ? 'bg-[#0D1B2A] text-[#C9A84C]' : 'bg-white text-gray-500 border border-[#EDE6D6]'}`}>הכל</button>
           <button onClick={() => setFilter('shabbat')} className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors ${filter === 'shabbat' ? 'bg-[#0D1B2A] text-[#C9A84C]' : 'bg-white text-gray-500 border border-[#EDE6D6]'}`}>🕯️ שבת</button>
           <button onClick={() => setFilter('minyan')} className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors ${filter === 'minyan' ? 'bg-[#0D1B2A] text-[#C9A84C]' : 'bg-white text-gray-500 border border-[#EDE6D6]'}`}>🙏 מניין</button>
           <button onClick={() => setFilter('class')} className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors ${filter === 'class' ? 'bg-[#0D1B2A] text-[#C9A84C]' : 'bg-white text-gray-500 border border-[#EDE6D6]'}`}>📚 שיעור</button>
           <button onClick={() => setFilter('other')} className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors ${filter === 'other' ? 'bg-[#0D1B2A] text-[#C9A84C]' : 'bg-white text-gray-500 border border-[#EDE6D6]'}`}>📌 אחר</button>
        </div>

        <div className="space-y-3">
          {activeEvents.map((ev: any) => {
            const attDates = Object.keys(ev.attendance || {}).sort((a,b) => {
              const [d1,m1,y1] = a.split('/');
              const [d2,m2,y2] = b.split('/');
              return new Date(`${y2}-${m2}-${d2}`).getTime() - new Date(`${y1}-${m1}-${d1}`).getTime();
            });
            const lastDate = attDates[0];
            const lastCount = lastDate ? Object.values(ev.attendance[lastDate]).filter(Boolean).length : 0;
            const lastNames = lastDate ? Object.entries(ev.attendance[lastDate]).filter(e => e[1]).slice(0, 8).map(e => e[0].split(' ')[0]) : [];

            return (
              <div key={ev.id} className="bg-white rounded-xl shadow-sm border border-[#EDE6D6] overflow-hidden">
                 <div className="p-3.5 flex items-center justify-between border-b border-[#EDE6D6]">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 bg-gray-50 rounded-full flex items-center justify-center text-xl shrink-0 opacity-80">{typeIcons[ev.type] || '📌'}</div>
                      <div>
                        <div className="font-bold text-[#0D1B2A] text-[15px]">{ev.name}</div>
                        <div className="text-[11px] text-gray-500">{freqLabels[ev.freq] || ev.freq} {ev.time && `· ${ev.time}`}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => { setTasksEventId(ev.id); setAttCategory('all'); setAttSearch(''); }}
                        className="relative bg-purple-50 text-purple-700 text-xs font-bold px-3 py-1.5 rounded-lg active:scale-95 transition-transform flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <ClipboardList size={14}/> משימות
                        {(ev.tasks || []).some((t: any) => !t.done) && (
                          <span className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-[#C9A84C] text-[#0D1B2A] rounded-full text-[9px] font-bold flex items-center justify-center">
                            {(ev.tasks || []).filter((t: any) => !t.done).length}
                          </span>
                        )}
                      </button>
                      <button onClick={() => openAttModal(ev)} className="bg-[#C9A84C]/10 text-[#9B7A2F] text-xs font-bold px-3 py-1.5 rounded-lg active:scale-95 transition-transform flex items-center gap-1.5 whitespace-nowrap">
                         <Check size={14}/> נוכחות
                      </button>
                    </div>
                 </div>
                 
                 <div className="bg-[#FAF6EE] p-2.5 flex justify-around">
                   <div className="text-center">
                     <div className="font-['Frank_Ruhl_Libre'] text-lg font-bold text-[#0D1B2A] leading-tight">{attDates.length}</div>
                     <div className="text-[10px] text-gray-500 uppercase tracking-wide">מפגשים</div>
                   </div>
                   <div className="w-px bg-[#EDE6D6]"></div>
                   <div className="text-center">
                     <div className="font-['Frank_Ruhl_Libre'] text-lg font-bold text-[#0D1B2A] leading-tight">{lastCount || '—'}</div>
                     <div className="text-[10px] text-gray-500 uppercase tracking-wide">אחרון</div>
                   </div>
                   <div className="w-px bg-[#EDE6D6]"></div>
                   <div className="text-center">
                     <div className="text-[13px] font-bold text-[#0D1B2A] leading-tight mt-1">{lastDate || '—'}</div>
                     <div className="text-[10px] text-gray-500 uppercase tracking-wide">תאריך</div>
                   </div>
                 </div>

                 {lastNames.length > 0 && (
                   <div className="p-3 border-t border-[#EDE6D6]">
                     <div className="text-[10px] text-gray-500 mb-1.5">נוכחים אחרונים ({lastDate}):</div>
                     <div className="flex flex-wrap gap-1.5">
                       {lastNames.map((n, i) => <span key={i} className="bg-[#0D1B2A] text-[#E8C97A] text-[10px] font-bold px-2.5 py-0.5 rounded-full">{n}</span>)}
                     </div>
                   </div>
                 )}
              </div>
            );
          })}
          {activeEvents.length === 0 && (
            <div className="text-center py-12 text-gray-400">
               <div className="text-4xl mb-3 opacity-50">📅</div>
               <div className="text-sm">אין אירועים, לחץ על + להוסיף.</div>
            </div>
          )}
        </div>
      </div>

      {/* Add Event Modal */}
      {isAddingMode && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-end justify-center p-0 md:p-4 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && setIsAddingMode(false)}>
           <div className="bg-[#FAF6EE] rounded-t-3xl md:rounded-3xl p-5 pb-8 w-full max-w-[430px] animate-in slide-in-from-bottom duration-300">
             <div className="flex justify-between items-center mb-5">
               <h2 className="font-['Frank_Ruhl_Libre'] text-xl font-bold text-[#0D1B2A]">📌 הוספת אירוע קבוע</h2>
               <button onClick={() => setIsAddingMode(false)} className="bg-gray-200/50 p-2 rounded-full text-gray-500 hover:bg-gray-200"><X size={16}/></button>
             </div>
             
             <div className="space-y-4">
               <div>
                 <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">שם האירוע</label>
                 <input value={evName} onChange={e => setEvName(e.target.value)} type="text" className="w-full bg-white border border-[#EDE6D6] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#C9A84C]" placeholder="למשל: מניין שחרית" />
               </div>
               <div>
                 <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">סוג האירוע</label>
                 <div className="grid grid-cols-2 gap-2">
                   {Object.keys(typeLabels).map(t => (
                     <button key={t} onClick={() => setEvType(t)} className={`py-2 text-sm font-bold rounded-xl border ${evType === t ? 'bg-[#0D1B2A] text-[#C9A84C] border-[#0D1B2A]' : 'bg-white text-gray-500 border-[#EDE6D6]'}`}>
                       {typeIcons[t]} {typeLabels[t]}
                     </button>
                   ))}
                 </div>
               </div>
               <div>
                 <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">תדירות</label>
                 <select value={evFreq} onChange={e => setEvFreq(e.target.value)} className="w-full bg-white border border-[#EDE6D6] rounded-xl px-3 py-2.5 text-sm font-bold text-gray-700 outline-none focus:border-[#C9A84C]">
                   {Object.keys(freqLabels).map(f => <option key={f} value={f}>{freqLabels[f]}</option>)}
                 </select>
               </div>
               <div className="grid grid-cols-2 gap-3">
                 <div>
                   <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">תאריך בסיס</label>
                   <input value={evDate} onChange={e => setEvDate(e.target.value)} type="date" className="w-full bg-white border border-[#EDE6D6] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#C9A84C]" />
                 </div>
                 <div>
                   <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">שעה</label>
                   <input value={evTime} onChange={e => setEvTime(e.target.value)} type="time" className="w-full bg-white border border-[#EDE6D6] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#C9A84C]" />
                 </div>
               </div>
               
               <button onClick={saveEvent} className="w-full bg-gradient-to-br from-[#0D1B2A] to-[#1A2E45] text-white rounded-xl py-3.5 font-bold shadow-md mt-2">
                 שמור אירוע
               </button>
             </div>
           </div>
        </div>
      )}

      {/* Attendance Modal */}
      {attEventId && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-end justify-center p-0 md:p-4 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && setAttEventId(null)}>
           <div className="bg-[#FAF6EE] rounded-t-3xl md:rounded-3xl p-5 pb-8 w-full max-w-[430px] max-h-[90vh] flex flex-col animate-in slide-in-from-bottom duration-300">
             <div className="flex justify-between items-start mb-4">
               <div>
                 <h2 className="font-['Frank_Ruhl_Libre'] text-xl font-bold text-[#0D1B2A] flex items-center gap-2">✅ נוכחות — {currentAttEvent?.name}</h2>
                 <div className="text-xs text-gray-500 mt-0.5">תאריך: {format(new Date(), 'dd/MM/yyyy')}</div>
               </div>
               <button onClick={() => setAttEventId(null)} className="bg-gray-200/50 p-2 rounded-full text-gray-500 hover:bg-gray-200"><X size={16}/></button>
             </div>

             <input 
               type="text" 
               placeholder="חיפוש לפי שם..." 
               value={attSearch}
               onChange={e => setAttSearch(e.target.value)}
               className="w-full bg-white border border-[#EDE6D6] rounded-xl px-3.5 py-3 text-sm outline-none focus:border-[#C9A84C] mb-3 shadow-sm shrink-0"
             />

             <div className="flex gap-2 overflow-x-auto pb-2 mb-2 no-scrollbar shrink-0">
               {[
                 { id: 'all', label: 'הכל' },
                 { id: 'close', label: '⭐ קרוב' },
                 { id: 'approach', label: '🔄 מתקרב' },
                 { id: 'third', label: '⭕ מ. שלישי' },
                 { id: 'target', label: '🎯 להקרב' },
                 { id: 'hk', label: 'הוק' },
                 { id: 'errors', label: 'שגיאות' }
               ].map(c => (
                 <button
                   key={c.id}
                   onClick={() => setAttCategory(c.id)}
                   className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium border-[1.5px] transition-colors ${
                     attCategory === c.id
                       ? 'bg-[#0D1B2A] border-[#0D1B2A] text-[#C9A84C]'
                       : 'bg-white border-[#EDE6D6] text-gray-500'
                   }`}
                 >
                   {c.label}
                 </button>
               ))}
             </div>

             <div className="flex-1 overflow-y-auto pr-1 space-y-2 mb-4 custom-scrollbar">
                {donorNames.map(n => {
                  const isChecked = pendingAtt[n];
                  return (
                    <div key={n} onClick={() => setPendingAtt({...pendingAtt, [n]: !isChecked})} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer shadow-sm transition-colors border ${isChecked ? 'bg-[#D1FAE5] border-[#10B981]/50' : 'bg-white border-[#EDE6D6]'}`}>
                       <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#0D1B2A] to-[#1A2E45] text-white flex items-center justify-center font-bold text-sm shrink-0">
                          {n.charAt(0)}
                       </div>
                       <div className="flex-1 font-bold text-[#0D1B2A]">{n}</div>
                       <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${isChecked ? 'bg-[#10B981] border-[#10B981] text-white' : 'bg-white border-[#EDE6D6]'}`}>
                          {isChecked && <Check size={14} />}
                       </div>
                    </div>
                  );
                })}
             </div>

             <button onClick={saveAttendance} className="w-full bg-gradient-to-br from-[#0D1B2A] to-[#1A2E45] text-white rounded-xl py-3.5 font-bold shadow-md shrink-0">
               שמור נוכחות ({Object.values(pendingAtt).filter(Boolean).length})
             </button>
           </div>
        </div>
      )}

      {/* Tasks Modal */}
      {tasksEventId && currentTasksEvent && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-end justify-center p-0 md:p-4 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && setTasksEventId(null)}>
           <div className="bg-[#FAF6EE] rounded-t-3xl md:rounded-3xl p-5 pb-8 w-full max-w-[430px] max-h-[90vh] flex flex-col animate-in slide-in-from-bottom duration-300">
             <div className="flex justify-between items-start mb-4">
               <h2 className="font-['Frank_Ruhl_Libre'] text-xl font-bold text-[#0D1B2A] flex items-center gap-2">📋 משימות — {currentTasksEvent.name}</h2>
               <button onClick={() => setTasksEventId(null)} className="bg-gray-200/50 p-2 rounded-full text-gray-500 hover:bg-gray-200"><X size={16}/></button>
             </div>

             <div className="flex-1 overflow-y-auto pr-1 space-y-2 mb-3 custom-scrollbar">
               {(currentTasksEvent.tasks || []).length === 0 && (
                 <div className="text-sm text-gray-400 text-center bg-white rounded-xl p-4 border border-[#EDE6D6]">אין עדיין משימות לאירוע הזה</div>
               )}
               {(currentTasksEvent.tasks || []).map((t: any, i: number) => (
                 t.kind === 'invite' ? (
                   <div key={i} className="bg-white rounded-xl p-3 shadow-sm">
                     <div className="flex items-center justify-between mb-2">
                       <span className={`text-sm font-bold ${t.done ? 'text-gray-400 line-through' : 'text-[#0D1B2A]'}`}>{t.text}</span>
                       <span className="text-[10px] text-gray-400 shrink-0">נותרו ~{inviteRemainingMinutes(t)} דק'</span>
                     </div>
                     <div className="flex flex-wrap gap-1.5">
                       {(t.people || []).map((p: string) => {
                         const isDone = (t.doneNames || []).includes(p);
                         return (
                           <button
                             key={p}
                             onClick={() => toggleEventInvitePerson(i, p)}
                             className={`text-[11px] px-2 py-1 rounded-full border transition-colors ${isDone ? 'bg-[#D1FAE5] border-[#10B981] text-[#065F46] line-through' : 'bg-[#FAF6EE] border-[#EDE6D6] text-[#0D1B2A]'}`}
                           >
                             {p}
                           </button>
                         );
                       })}
                     </div>
                   </div>
                 ) : (
                   <div key={i} onClick={() => toggleEventTask(i)} className="bg-white rounded-xl p-3 shadow-sm flex items-center gap-3 cursor-pointer">
                     <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors shrink-0 ${t.done ? 'bg-[#C9A84C] border-[#C9A84C]' : 'border-gray-300'}`}>
                       {t.done && <Check size={12} className="text-white" />}
                     </div>
                     <span className={`text-sm ${t.done ? 'text-gray-400 line-through' : 'text-[#0D1B2A]'}`}>{t.text}</span>
                   </div>
                 )
               ))}
             </div>

             <div className="flex gap-2 mb-4 shrink-0">
               <input value={taskText} onChange={e => setTaskText(e.target.value)} onKeyDown={e => e.key === 'Enter' && addEventTask()} type="text" className="flex-1 bg-white border border-[#EDE6D6] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#C9A84C]" placeholder="משימה חדשה..." />
               <button onClick={addEventTask} className="bg-[#0D1B2A] rounded-xl px-4 text-[#E8C97A] font-bold shadow-sm shrink-0">הוסף</button>
             </div>

             <div className="border-t border-dashed border-[#EDE6D6] pt-3 shrink-0">
               <div className="text-[11px] font-bold text-gray-500 uppercase mb-2">או צור משימת הזמנה (📞 {MINUTES_PER_CALL} דק׳ לאדם) לפי מעגל קרבה:</div>
               <div className="flex gap-2 overflow-x-auto pb-2 mb-2 no-scrollbar">
                 {[
                   { id: 'all', label: 'הכל' },
                   { id: 'close', label: '⭐ קרוב' },
                   { id: 'approach', label: '🔄 מתקרב' },
                   { id: 'third', label: '⭕ מ. שלישי' },
                   { id: 'target', label: '🎯 להקרב' },
                 ].map(c => (
                   <button
                     key={c.id}
                     onClick={() => setAttCategory(c.id)}
                     className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium border-[1.5px] transition-colors ${
                       attCategory === c.id
                         ? 'bg-[#0D1B2A] border-[#0D1B2A] text-[#C9A84C]'
                         : 'bg-white border-[#EDE6D6] text-gray-500'
                     }`}
                   >
                     {c.label}
                   </button>
                 ))}
               </div>
               <button
                 onClick={addEventInviteTask}
                 disabled={donorNames.length === 0}
                 className="w-full flex items-center justify-center gap-1.5 bg-purple-50 text-purple-700 text-sm font-bold py-2.5 rounded-xl disabled:opacity-40"
               >
                 <ClipboardList size={14} /> הוסף משימת הזמנה ל-{donorNames.length} אנשים (≈{donorNames.length * MINUTES_PER_CALL} דק׳)
               </button>
             </div>
           </div>
        </div>
      )}
    </div>
  );
}
