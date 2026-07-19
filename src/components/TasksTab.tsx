import React, { useState } from 'react';
import { useAppStore } from '../store/AppContext';
import { Check, ClipboardList, Calendar, CalendarCheck, Cake, X, ChevronLeft, Plus } from 'lucide-react';
import { ProfileModal } from './ProfileModal';
import { HolidayModal } from './HolidayModal';
import { QuickLogButtons } from './QuickLogButtons';
import { computePersonalDateEvents } from '../lib/personalDates';
import { inviteRemainingMinutes, toggleInvitePerson } from '../lib/tasks';
import { getCustomHols } from '../lib/api';

export function TasksTab({ setTab, addTrigger }: { setTab: (t: string) => void; addTrigger?: { tab: string; count: number } }) {
  const { holidayExtras, updateHolidayExtras, eventsData, updateEventsData, visibleDonors, crm, holidays } = useAppStore();
  const [selectedDonor, setSelectedDonor] = useState<string | null>(null);
  const [selectedHoliday, setSelectedHoliday] = useState<any | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addTarget, setAddTarget] = useState<{ kind: 'holiday' | 'event'; id: string } | null>(null);
  const [addText, setAddText] = useState('');

  React.useEffect(() => {
    if (addTrigger?.tab === 'tasks' && addTrigger.count) setIsAddOpen(true);
  }, [addTrigger]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const personalDates = React.useMemo(
    () => computePersonalDateEvents(visibleDonors, crm, today).filter(e => e.dist <= 30),
    [visibleDonors, crm]
  );

  // מיפוי שם-חג → פרטי התאריך שלו (מה-API ומחגים מותאמים), כדי שאפשר יהיה
  // לפתוח את כרטיס החג המלא (HolidayModal) בלחיצה — אותה בנייה כמו בדשבורד.
  const holidayLookup = React.useMemo(() => {
    const map: Record<string, { name: string; dateStr: string; emoji: string }> = {};
    // ה-API מחזיר חגים על פני שנתיים, אז אותו שם חג עלול להופיע פעמיים
    // (השנה + השנה הבאה) — שומרים את המופע הקרוב ביותר להיום, לא האחרון שנסרק.
    holidays.forEach(h => {
      const dateStr = h.date?.split('T')[0];
      const name = h.hebrew || h.title;
      if (!dateStr || !name) return;
      const existing = map[name];
      if (!existing || Math.abs(new Date(dateStr).getTime() - today.getTime()) < Math.abs(new Date(existing.dateStr).getTime() - today.getTime())) {
        map[name] = { name, dateStr, emoji: '✡️' };
      }
    });
    getCustomHols().forEach((c: any) => { map[c.name] = { name: c.name, dateStr: c.date, emoji: '📅' }; });
    return map;
  }, [holidays]);

  const holidayGroups = Object.keys(holidayExtras)
    .map(id => ({ id, tasks: holidayExtras[id]?.tasks || [] }))
    .filter(g => g.tasks.length > 0);

  const eventGroups = (eventsData as any[])
    .map(e => ({ id: e.id, name: e.name, tasks: e.tasks || [] }))
    .filter(g => g.tasks.length > 0);

  const openHolidayCount = holidayGroups.reduce((s, g) => s + g.tasks.filter((t: any) => !t.done).length, 0);
  const openEventCount = eventGroups.reduce((s, g) => s + g.tasks.filter((t: any) => !t.done).length, 0);

  const openHolidayFull = (holidayId: string) => {
    const found = holidayLookup[holidayId];
    setSelectedHoliday(found ? { ...found, id: holidayId } : { name: holidayId, dateStr: '', emoji: '📅', id: holidayId });
  };

  const toggleHolidayTask = (holidayId: string, idx: number) => {
    const tasks = [...(holidayExtras[holidayId]?.tasks || [])];
    tasks[idx] = { ...tasks[idx], done: !tasks[idx].done };
    updateHolidayExtras(holidayId, { tasks });
  };

  const deleteHolidayTask = (holidayId: string, idx: number) => {
    const tasks = [...(holidayExtras[holidayId]?.tasks || [])];
    tasks.splice(idx, 1);
    updateHolidayExtras(holidayId, { tasks });
  };

  const toggleHolidayInvitePerson = (holidayId: string, idx: number, person: string) => {
    const tasks = [...(holidayExtras[holidayId]?.tasks || [])];
    tasks[idx] = toggleInvitePerson(tasks[idx], person);
    updateHolidayExtras(holidayId, { tasks });
  };

  const toggleEventTask = (eventId: string, idx: number) => {
    updateEventsData((eventsData as any[]).map((e: any) => {
      if (e.id !== eventId) return e;
      const tasks = [...(e.tasks || [])];
      tasks[idx] = { ...tasks[idx], done: !tasks[idx].done };
      return { ...e, tasks };
    }));
  };

  const deleteEventTask = (eventId: string, idx: number) => {
    updateEventsData((eventsData as any[]).map((e: any) => {
      if (e.id !== eventId) return e;
      const tasks = [...(e.tasks || [])];
      tasks.splice(idx, 1);
      return { ...e, tasks };
    }));
  };

  const toggleEventInvitePerson = (eventId: string, idx: number, person: string) => {
    updateEventsData((eventsData as any[]).map((e: any) => {
      if (e.id !== eventId) return e;
      const tasks = [...(e.tasks || [])];
      tasks[idx] = toggleInvitePerson(tasks[idx], person);
      return { ...e, tasks };
    }));
  };

  const submitAddTask = () => {
    if (!addTarget || !addText.trim()) return;
    if (addTarget.kind === 'holiday') {
      const tasks = [...(holidayExtras[addTarget.id]?.tasks || []), { text: addText.trim(), done: false }];
      updateHolidayExtras(addTarget.id, { tasks });
    } else {
      updateEventsData((eventsData as any[]).map((e: any) => e.id === addTarget.id ? { ...e, tasks: [...(e.tasks || []), { text: addText.trim(), done: false }] } : e));
    }
    setAddText('');
    setAddTarget(null);
    setIsAddOpen(false);
  };

  const renderTaskItem = (t: any, onToggle: () => void, onDelete: () => void, onTogglePerson: (person: string) => void) => (
    t.kind === 'invite' ? (
      <div className="bg-white rounded-xl p-3 shadow-sm border border-[#EDE6D6]">
        <div className="flex items-center justify-between mb-2">
          <span className={`text-sm font-bold ${t.done ? 'text-gray-400 line-through' : 'text-[#0D1B2A]'}`}>{t.text}</span>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-gray-400">נותרו ~{inviteRemainingMinutes(t)} דק'</span>
            <button onClick={onDelete} className="text-red-300 hover:text-red-500" title="מחק משימה"><X size={14} /></button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(t.people || []).map((p: string) => {
            const isDone = (t.doneNames || []).includes(p);
            return (
              <button
                key={p}
                onClick={() => onTogglePerson(p)}
                className={`text-[11px] px-2 py-1 rounded-full border transition-colors ${isDone ? 'bg-[#D1FAE5] border-[#10B981] text-[#065F46] line-through' : 'bg-[#FAF6EE] border-[#EDE6D6] text-[#0D1B2A]'}`}
              >
                {p}
              </button>
            );
          })}
        </div>
      </div>
    ) : (
      <div className="bg-white rounded-xl p-3 shadow-sm border border-[#EDE6D6] flex items-center gap-3">
        <div onClick={onToggle} className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors shrink-0 cursor-pointer ${t.done ? 'bg-[#C9A84C] border-[#C9A84C]' : 'border-gray-300'}`}>
          {t.done && <Check size={12} className="text-white" />}
        </div>
        <span onClick={onToggle} className={`text-sm flex-1 cursor-pointer ${t.done ? 'text-gray-400 line-through' : 'text-[#0D1B2A]'}`}>{t.text}</span>
        <button onClick={onDelete} className="text-red-300 hover:text-red-500 shrink-0" title="מחק משימה"><X size={14} /></button>
      </div>
    )
  );

  const addTargetOptions = [
    ...holidayGroups.map(g => ({ kind: 'holiday' as const, id: g.id, label: g.id })),
    ...Object.keys(holidayLookup).filter(id => !holidayGroups.some(g => g.id === id)).map(id => ({ kind: 'holiday' as const, id, label: id })),
    ...(eventsData as any[]).map(e => ({ kind: 'event' as const, id: e.id, label: e.name })),
  ];

  return (
    <div className="animate-in fade-in pb-24 md:pb-6">
      {/* Topbar */}
      <div className="bg-[#0D1B2A] px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-50 shadow-md">
        <div className="w-9 h-9 bg-gradient-to-br from-[#C9A84C] to-[#9B7A2F] rounded-lg flex items-center justify-center shrink-0 md:hidden">
          <ClipboardList size={20} className="text-white" />
        </div>
        <div className="flex-1 px-3 md:px-0">
          <div className="font-['Frank_Ruhl_Libre'] text-lg font-bold text-[#C9A84C]">משימות</div>
          <div className="text-[11px] text-white/45 mt-[1px]">{openHolidayCount + openEventCount} משימות פתוחות · {personalDates.length} תאריכים ב-30 הימים הקרובים</div>
        </div>
        <button onClick={() => setIsAddOpen(true)} className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center text-white/80 shrink-0 hover:bg-white/20 transition-colors">
          <Plus size={18} />
        </button>
      </div>

      <div className="p-4 md:p-6 max-w-2xl space-y-6">
        {/* תאריכים אישיים */}
        <div>
          <h2 className="font-['Frank_Ruhl_Libre'] text-lg font-bold text-[#0D1B2A] mb-3 flex items-center gap-2">
            <Cake size={18} className="text-[#C9A84C]" /> תאריכים אישיים
          </h2>
          {personalDates.length === 0 ? (
            <div className="bg-white rounded-xl p-4 text-center text-gray-500 shadow-sm text-sm border border-[#EDE6D6]">אין ימי הולדת או יארצייט ב-30 הימים הקרובים</div>
          ) : (
            <div className="space-y-2">
              {personalDates.map((c, i) => (
                <div key={i} className="bg-white border border-[#EDE6D6] rounded-xl p-3 shadow-sm">
                  <div className="flex items-center gap-3 mb-2.5 cursor-pointer" onClick={() => setSelectedDonor(c.name)}>
                    <span className="text-xl shrink-0">{c.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-[#0D1B2A] truncate">{c.name}</div>
                      <div className="text-xs text-gray-600 mt-0.5">{c.msg}</div>
                    </div>
                  </div>
                  <QuickLogButtons donorName={c.name} compact />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* משימות חגים */}
        <div>
          <h2 className="font-['Frank_Ruhl_Libre'] text-lg font-bold text-[#0D1B2A] mb-3 flex items-center gap-2">
            <Calendar size={18} className="text-[#C9A84C]" /> משימות חגים
          </h2>
          {holidayGroups.length === 0 ? (
            <div className="bg-white rounded-xl p-4 text-center text-gray-500 shadow-sm text-sm border border-[#EDE6D6]">
              אין עדיין משימות חג. אפשר להוסיף בכפתור ה-+ למעלה, או מכרטיס החג בלוח השנה.
            </div>
          ) : (
            <div className="space-y-4">
              {holidayGroups.map(g => (
                <div key={g.id}>
                  <button onClick={() => openHolidayFull(g.id)} className="flex items-center gap-1 text-xs font-bold text-[#9B7A2F] mb-2 hover:underline">
                    {g.id} <ChevronLeft size={12} />
                  </button>
                  <div className="space-y-2">
                    {g.tasks.map((t: any, i: number) => (
                      <div key={i}>
                        {renderTaskItem(t, () => toggleHolidayTask(g.id, i), () => deleteHolidayTask(g.id, i), p => toggleHolidayInvitePerson(g.id, i, p))}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* משימות אירועים */}
        <div>
          <h2 className="font-['Frank_Ruhl_Libre'] text-lg font-bold text-[#0D1B2A] mb-3 flex items-center gap-2">
            <CalendarCheck size={18} className="text-[#C9A84C]" /> משימות אירועים
          </h2>
          {eventGroups.length === 0 ? (
            <div className="bg-white rounded-xl p-4 text-center text-gray-500 shadow-sm text-sm border border-[#EDE6D6]">
              אין עדיין משימות אירוע. אפשר להוסיף בכפתור ה-+ למעלה, או מכרטיס האירוע בכרטיסיית אירועים.
            </div>
          ) : (
            <div className="space-y-4">
              {eventGroups.map(g => (
                <div key={g.id}>
                  <button onClick={() => setTab('events')} className="flex items-center gap-1 text-xs font-bold text-[#9B7A2F] mb-2 hover:underline">
                    {g.name} <ChevronLeft size={12} />
                  </button>
                  <div className="space-y-2">
                    {g.tasks.map((t: any, i: number) => (
                      <div key={i}>
                        {renderTaskItem(t, () => toggleEventTask(g.id, i), () => deleteEventTask(g.id, i), p => toggleEventInvitePerson(g.id, i, p))}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* הוספת משימה */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/60 z-[220] flex items-center justify-center p-4 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && setIsAddOpen(false)}>
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-xl text-[#0D1B2A]">הוספת משימה</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-gray-400 p-1 hover:text-gray-600"><X size={20} /></button>
            </div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">לאיזה חג/אירוע</label>
            <select
              value={addTarget ? `${addTarget.kind}:${addTarget.id}` : ''}
              onChange={e => {
                const [kind, id] = e.target.value.split(':');
                setAddTarget(id ? { kind: kind as 'holiday' | 'event', id } : null);
              }}
              className="w-full border-2 border-[#EDE6D6] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#C9A84C] bg-white mb-4"
            >
              <option value="">בחר...</option>
              <optgroup label="חגים">
                {addTargetOptions.filter(o => o.kind === 'holiday').map(o => <option key={o.id} value={`${o.kind}:${o.id}`}>{o.label}</option>)}
              </optgroup>
              <optgroup label="אירועים">
                {addTargetOptions.filter(o => o.kind === 'event').map(o => <option key={o.id} value={`${o.kind}:${o.id}`}>{o.label}</option>)}
              </optgroup>
            </select>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">תיאור המשימה</label>
            <input
              value={addText}
              onChange={e => setAddText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitAddTask()}
              type="text"
              className="w-full border-2 border-[#EDE6D6] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#C9A84C] mb-4"
              placeholder="למשל: להזמין דוברת, לקנות פרחים..."
            />
            <button
              onClick={submitAddTask}
              disabled={!addTarget || !addText.trim()}
              className="w-full bg-[#0D1B2A] text-[#E8C97A] py-3 rounded-xl font-bold text-sm shadow-lg disabled:opacity-40"
            >
              הוסף משימה
            </button>
          </div>
        </div>
      )}

      {selectedDonor && <ProfileModal name={selectedDonor} onClose={() => setSelectedDonor(null)} />}
      {selectedHoliday && <HolidayModal holiday={selectedHoliday} onClose={() => setSelectedHoliday(null)} />}
    </div>
  );
}
