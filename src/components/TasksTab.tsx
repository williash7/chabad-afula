import React, { useState } from 'react';
import { useAppStore } from '../store/AppContext';
import { Check, ClipboardList, Calendar, CalendarCheck, Cake } from 'lucide-react';
import { ProfileModal } from './ProfileModal';
import { QuickLogButtons } from './QuickLogButtons';
import { computePersonalDateEvents } from '../lib/personalDates';
import { inviteRemainingMinutes, toggleInvitePerson } from '../lib/tasks';

export function TasksTab() {
  const { holidayExtras, updateHolidayExtras, eventsData, updateEventsData, visibleDonors, crm } = useAppStore();
  const [selectedDonor, setSelectedDonor] = useState<string | null>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const personalDates = React.useMemo(
    () => computePersonalDateEvents(visibleDonors, crm, today).filter(e => e.dist <= 30),
    [visibleDonors, crm]
  );

  const holidayGroups = Object.keys(holidayExtras)
    .map(id => ({ id, tasks: holidayExtras[id]?.tasks || [] }))
    .filter(g => g.tasks.length > 0);

  const eventGroups = (eventsData as any[])
    .map(e => ({ id: e.id, name: e.name, tasks: e.tasks || [] }))
    .filter(g => g.tasks.length > 0);

  const openHolidayCount = holidayGroups.reduce((s, g) => s + g.tasks.filter((t: any) => !t.done).length, 0);
  const openEventCount = eventGroups.reduce((s, g) => s + g.tasks.filter((t: any) => !t.done).length, 0);

  const toggleHolidayTask = (holidayId: string, idx: number) => {
    const tasks = [...(holidayExtras[holidayId]?.tasks || [])];
    tasks[idx] = { ...tasks[idx], done: !tasks[idx].done };
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

  const toggleEventInvitePerson = (eventId: string, idx: number, person: string) => {
    updateEventsData((eventsData as any[]).map((e: any) => {
      if (e.id !== eventId) return e;
      const tasks = [...(e.tasks || [])];
      tasks[idx] = toggleInvitePerson(tasks[idx], person);
      return { ...e, tasks };
    }));
  };

  const renderTaskItem = (t: any, onToggle: () => void, onTogglePerson: (person: string) => void) => (
    t.kind === 'invite' ? (
      <div className="bg-white rounded-xl p-3 shadow-sm border border-[#EDE6D6]">
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
      <div onClick={onToggle} className="bg-white rounded-xl p-3 shadow-sm border border-[#EDE6D6] flex items-center gap-3 cursor-pointer">
        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors shrink-0 ${t.done ? 'bg-[#C9A84C] border-[#C9A84C]' : 'border-gray-300'}`}>
          {t.done && <Check size={12} className="text-white" />}
        </div>
        <span className={`text-sm ${t.done ? 'text-gray-400 line-through' : 'text-[#0D1B2A]'}`}>{t.text}</span>
      </div>
    )
  );

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
              אין עדיין משימות חג. אפשר להוסיף מכרטיס החג בלוח השנה.
            </div>
          ) : (
            <div className="space-y-4">
              {holidayGroups.map(g => (
                <div key={g.id}>
                  <div className="text-xs font-bold text-[#9B7A2F] mb-2">{g.id}</div>
                  <div className="space-y-2">
                    {g.tasks.map((t: any, i: number) => (
                      <div key={i}>
                        {renderTaskItem(t, () => toggleHolidayTask(g.id, i), p => toggleHolidayInvitePerson(g.id, i, p))}
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
              אין עדיין משימות אירוע. אפשר להוסיף מכרטיס האירוע בכרטיסיית אירועים.
            </div>
          ) : (
            <div className="space-y-4">
              {eventGroups.map(g => (
                <div key={g.id}>
                  <div className="text-xs font-bold text-[#9B7A2F] mb-2">{g.name}</div>
                  <div className="space-y-2">
                    {g.tasks.map((t: any, i: number) => (
                      <div key={i}>
                        {renderTaskItem(t, () => toggleEventTask(g.id, i), p => toggleEventInvitePerson(g.id, i, p))}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedDonor && <ProfileModal name={selectedDonor} onClose={() => setSelectedDonor(null)} />}
    </div>
  );
}
