import React, { useState } from 'react';
import { useAppStore } from '../store/AppContext';
import { Check, ClipboardList, Calendar, CalendarCheck, Cake, X, ChevronLeft, Plus, Clock, ListTodo } from 'lucide-react';
import { ProfileModal } from './ProfileModal';
import { HolidayModal } from './HolidayModal';
import { TaskDetailsPanel } from './TaskDetailsPanel';
import { QuickLogButtons } from './QuickLogButtons';
import { computePersonalDateEvents } from '../lib/personalDates';
import { inviteRemainingMinutes, toggleInvitePerson, STANDALONE_TASKS_ID, PERSONAL_DATE_EXTRAS_ID, nextEventOccurrence, formatRemaining, stampCreated } from '../lib/tasks';
import { effectiveDate, compareTasks, priorityWeight, TaskSortKey } from '../lib/taskSort';
import { getCustomHols } from '../lib/api';
import { logAction } from '../lib/score';

export function TasksTab({ setTab, addTrigger }: { setTab: (t: string) => void; addTrigger?: { tab: string; count: number } }) {
  const { holidayExtras, updateHolidayExtras, eventsData, updateEventsData, visibleDonors, crm, holidays, markHomeVisitDone } = useAppStore();
  const [selectedDonor, setSelectedDonor] = useState<string | null>(null);
  const [selectedHoliday, setSelectedHoliday] = useState<any | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addTarget, setAddTarget] = useState<{ kind: 'holiday' | 'event'; id: string } | null>(null);
  const [addText, setAddText] = useState('');
  const [standaloneText, setStandaloneText] = useState('');
  const [standaloneDue, setStandaloneDue] = useState('');
  const [sortKey, setSortKey] = useState<TaskSortKey>('date');

  React.useEffect(() => {
    if (addTrigger?.tab === 'tasks' && addTrigger.count) setIsAddOpen(true);
  }, [addTrigger]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const personalDates = React.useMemo(
    () => computePersonalDateEvents(visibleDonors, crm, today).filter(e => e.dist <= 30),
    [visibleDonors, crm]
  );

  // פרטים נוספים (שעה/מקום/הערות/תתי-משימות/דחיפות) לתזכורות תאריכים אישיים —
  // keyed לפי PersonalDateEvent.key היציב, נשמר באותה טכניקת piggyback כמו
  // STANDALONE_TASKS_ID.
  const personalDateExtras: Record<string, any> = holidayExtras[PERSONAL_DATE_EXTRAS_ID] || {};
  const patchPersonalDate = (key: string, patch: Partial<any>) => {
    updateHolidayExtras(PERSONAL_DATE_EXTRAS_ID, { [key]: { ...(personalDateExtras[key] || {}), ...patch } });
  };
  const sortedPersonalDates = sortKey === 'priority'
    ? [...personalDates].sort((a, b) => priorityWeight(personalDateExtras[a.key] || {}) - priorityWeight(personalDateExtras[b.key] || {}))
    : personalDates;

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

  // מציגים רק משימות פתוחות (לא בוצעו) — משימה שסומנה כבוצעה נעלמת מהמסך.
  // שומרים את האינדקס המקורי במערך (idx) לכל משימה, כדי שהכפתורים (סימון/מחיקה)
  // עדיין יפנו לפריט הנכון במערך המקורי גם אחרי הסינון.
  // מיון קבוצות (חג/אירוע) לפי התאריך שלהן (הקרוב קודם), ומיון המשימות בתוך כל
  // קבוצה לפי sortKey — 'date' (התאריך האפקטיבי) או 'priority' (רמת דחיפות).
  const sortByContextDate = <T extends { contextDate: Date | null }>(groups: T[]) =>
    [...groups].sort((a, b) => {
      if (a.contextDate && b.contextDate) return a.contextDate.getTime() - b.contextDate.getTime();
      if (a.contextDate) return -1;
      if (b.contextDate) return 1;
      return 0;
    });

  const holidayGroups = sortByContextDate(
    Object.keys(holidayExtras)
      .filter(id => id !== STANDALONE_TASKS_ID && id !== PERSONAL_DATE_EXTRAS_ID)
      .map(id => {
        const info = holidayLookup[id];
        const contextDate = info?.dateStr ? new Date(info.dateStr) : null;
        const allTasks = holidayExtras[id]?.tasks || [];
        const tasks = allTasks
          .map((t: any, idx: number) => ({ t, idx, date: effectiveDate(t, contextDate) }))
          .filter((x: any) => !x.t.done)
          .sort((a: any, b: any) => compareTasks(a.t, b.t, sortKey, a.date, b.date));
        return { id, tasks, contextDate };
      })
  ).filter(g => g.tasks.length > 0);

  const eventGroups = sortByContextDate(
    (eventsData as any[]).map(e => {
      const contextDate = nextEventOccurrence(e, new Date());
      const allTasks = e.tasks || [];
      const tasks = allTasks
        .map((t: any, idx: number) => ({ t, idx, date: effectiveDate(t, contextDate) }))
        .filter((x: any) => !x.t.done)
        .sort((a: any, b: any) => compareTasks(a.t, b.t, sortKey, a.date, b.date));
      return { id: e.id, name: e.name, tasks, contextDate };
    })
  ).filter(g => g.tasks.length > 0);

  const allStandaloneTasks: any[] = holidayExtras[STANDALONE_TASKS_ID]?.tasks || [];
  const standaloneTasks = allStandaloneTasks
    .map((t: any, idx: number) => ({ t, idx, date: effectiveDate(t, null) }))
    .filter((x: any) => !x.t.done)
    .sort((a, b) => compareTasks(a.t, b.t, sortKey, a.date, b.date));

  const openHolidayCount = holidayGroups.reduce((s, g) => s + g.tasks.length, 0);
  const openEventCount = eventGroups.reduce((s, g) => s + g.tasks.length, 0);
  const openStandaloneCount = standaloneTasks.length;

  const toggleStandaloneTask = (idx: number) => {
    const wasDone = allStandaloneTasks[idx]?.done;
    const tasks = [...allStandaloneTasks];
    tasks[idx] = { ...tasks[idx], done: !tasks[idx].done };
    updateHolidayExtras(STANDALONE_TASKS_ID, { tasks });
    if (!wasDone) logAction('task_complete');
  };

  const deleteStandaloneTask = (idx: number) => {
    const tasks = [...allStandaloneTasks];
    tasks.splice(idx, 1);
    updateHolidayExtras(STANDALONE_TASKS_ID, { tasks });
  };

  const patchStandaloneTask = (idx: number, patch: Partial<any>) => {
    const tasks = [...allStandaloneTasks];
    tasks[idx] = { ...tasks[idx], ...patch };
    updateHolidayExtras(STANDALONE_TASKS_ID, { tasks });
  };

  const toggleStandaloneInvitePerson = (idx: number, person: string) => {
    const wasDone = (allStandaloneTasks[idx]?.doneNames || []).includes(person);
    const tasks = [...allStandaloneTasks];
    tasks[idx] = toggleInvitePerson(tasks[idx], person);
    updateHolidayExtras(STANDALONE_TASKS_ID, { tasks });
    if (!wasDone) logAction('invite_done');
  };

  const addStandaloneTask = () => {
    if (!standaloneText.trim()) return;
    const newTask: any = stampCreated({ text: standaloneText.trim(), done: false });
    if (standaloneDue) newTask.dueDate = standaloneDue;
    updateHolidayExtras(STANDALONE_TASKS_ID, { tasks: [...allStandaloneTasks, newTask] });
    logAction('task_create');
    setStandaloneText('');
    setStandaloneDue('');
  };

  const openHolidayFull = (holidayId: string) => {
    const found = holidayLookup[holidayId];
    setSelectedHoliday(found ? { ...found, id: holidayId } : { name: holidayId, dateStr: '', emoji: '📅', id: holidayId });
  };

  const toggleHolidayTask = (holidayId: string, idx: number) => {
    const tasks = [...(holidayExtras[holidayId]?.tasks || [])];
    const wasDone = tasks[idx]?.done;
    tasks[idx] = { ...tasks[idx], done: !tasks[idx].done };
    updateHolidayExtras(holidayId, { tasks });
    if (!wasDone) logAction('task_complete');
  };

  const deleteHolidayTask = (holidayId: string, idx: number) => {
    const tasks = [...(holidayExtras[holidayId]?.tasks || [])];
    tasks.splice(idx, 1);
    updateHolidayExtras(holidayId, { tasks });
  };

  const patchHolidayTask = (holidayId: string, idx: number, patch: Partial<any>) => {
    const tasks = [...(holidayExtras[holidayId]?.tasks || [])];
    tasks[idx] = { ...tasks[idx], ...patch };
    updateHolidayExtras(holidayId, { tasks });
  };

  // "לדלג" — סוגר את משימת "לעדכן את החג" בלי לספור אותה כביצוע בפועל (לא מנוקד).
  // לחיצה חוזרת כשהיא מסומנת כ"דילוג" מבטלת את הדילוג ומחזירה אותה לפתוחה.
  const skipHolidayTask = (holidayId: string, idx: number) => {
    const tasks = [...(holidayExtras[holidayId]?.tasks || [])];
    const cur = tasks[idx];
    tasks[idx] = cur.skipped ? { ...cur, done: false, skipped: false } : { ...cur, done: true, skipped: true };
    updateHolidayExtras(holidayId, { tasks });
  };

  const toggleHolidayInvitePerson = (holidayId: string, idx: number, person: string) => {
    const tasks = [...(holidayExtras[holidayId]?.tasks || [])];
    const wasDone = (tasks[idx]?.doneNames || []).includes(person);
    tasks[idx] = toggleInvitePerson(tasks[idx], person);
    updateHolidayExtras(holidayId, { tasks });
    if (!wasDone) logAction('invite_done');
  };

  const toggleEventTask = (eventId: string, idx: number) => {
    const ev = (eventsData as any[]).find((e: any) => e.id === eventId);
    const wasDone = ev?.tasks?.[idx]?.done;
    updateEventsData((eventsData as any[]).map((e: any) => {
      if (e.id !== eventId) return e;
      const tasks = [...(e.tasks || [])];
      tasks[idx] = { ...tasks[idx], done: !tasks[idx].done };
      return { ...e, tasks };
    }));
    if (!wasDone) logAction('task_complete');
  };

  const deleteEventTask = (eventId: string, idx: number) => {
    updateEventsData((eventsData as any[]).map((e: any) => {
      if (e.id !== eventId) return e;
      const tasks = [...(e.tasks || [])];
      tasks.splice(idx, 1);
      return { ...e, tasks };
    }));
  };

  const patchEventTask = (eventId: string, idx: number, patch: Partial<any>) => {
    updateEventsData((eventsData as any[]).map((e: any) => {
      if (e.id !== eventId) return e;
      const tasks = [...(e.tasks || [])];
      tasks[idx] = { ...tasks[idx], ...patch };
      return { ...e, tasks };
    }));
  };

  const toggleEventInvitePerson = (eventId: string, idx: number, person: string) => {
    const ev = (eventsData as any[]).find((e: any) => e.id === eventId);
    const wasDone = (ev?.tasks?.[idx]?.doneNames || []).includes(person);
    updateEventsData((eventsData as any[]).map((e: any) => {
      if (e.id !== eventId) return e;
      const tasks = [...(e.tasks || [])];
      tasks[idx] = toggleInvitePerson(tasks[idx], person);
      return { ...e, tasks };
    }));
    if (!wasDone) logAction('invite_done');
  };

  const submitAddTask = () => {
    if (!addTarget || !addText.trim()) return;
    if (addTarget.kind === 'holiday') {
      const tasks = [...(holidayExtras[addTarget.id]?.tasks || []), stampCreated({ text: addText.trim(), done: false })];
      updateHolidayExtras(addTarget.id, { tasks });
    } else {
      updateEventsData((eventsData as any[]).map((e: any) => e.id === addTarget.id ? { ...e, tasks: [...(e.tasks || []), stampCreated({ text: addText.trim(), done: false })] } : e));
    }
    logAction('task_create');
    setAddText('');
    setAddTarget(null);
    setIsAddOpen(false);
  };

  const renderTaskItem = (t: any, onToggle: () => void, onDelete: () => void, onTogglePerson: (person: string) => void, onPatch: (patch: Partial<any>) => void, extra?: React.ReactNode) => (
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
        <TaskDetailsPanel task={t} onPatch={onPatch} />
      </div>
    ) : (
      <div className="bg-white rounded-xl p-3 shadow-sm border border-[#EDE6D6]">
        <div className="flex items-center gap-3">
          <div onClick={onToggle} className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors shrink-0 cursor-pointer ${t.done ? 'bg-[#C9A84C] border-[#C9A84C]' : 'border-gray-300'}`}>
            {t.done && <Check size={12} className="text-white" />}
          </div>
          <div className="flex-1 min-w-0 cursor-pointer" onClick={onToggle}>
            <span className={`text-sm ${t.done ? 'text-gray-400 line-through' : 'text-[#0D1B2A]'}`}>{t.text}</span>
            {t.dueDate && !t.done && (
              <div className="text-[10px] text-[#9B7A2F] flex items-center gap-1 mt-0.5"><Clock size={10} /> {formatRemaining(new Date(t.dueDate), new Date())}</div>
            )}
          </div>
          {extra}
          <button onClick={onDelete} className="text-red-300 hover:text-red-500 shrink-0" title="מחק משימה"><X size={14} /></button>
        </div>
        <TaskDetailsPanel task={t} onPatch={onPatch} />
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
          <div className="text-[11px] text-white/45 mt-[1px]">{openHolidayCount + openEventCount + openStandaloneCount} משימות פתוחות · {personalDates.length} תאריכים ב-30 הימים הקרובים</div>
        </div>
        <button onClick={() => setIsAddOpen(true)} className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center text-white/80 shrink-0 hover:bg-white/20 transition-colors">
          <Plus size={18} />
        </button>
      </div>

      {/* מיון */}
      <div className="px-4 md:px-6 pt-3 flex items-center gap-2">
        <span className="text-[11px] text-gray-400">מיין לפי:</span>
        <button
          onClick={() => setSortKey('date')}
          className={`text-[11px] px-2.5 py-1 rounded-full border font-medium ${sortKey === 'date' ? 'bg-[#0D1B2A] text-[#E8C97A] border-[#0D1B2A]' : 'bg-white text-gray-500 border-[#EDE6D6]'}`}
        >
          📅 תאריך / זמן שנותר
        </button>
        <button
          onClick={() => setSortKey('priority')}
          className={`text-[11px] px-2.5 py-1 rounded-full border font-medium ${sortKey === 'priority' ? 'bg-[#0D1B2A] text-[#E8C97A] border-[#0D1B2A]' : 'bg-white text-gray-500 border-[#EDE6D6]'}`}
        >
          🔥 דחיפות
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
              {sortedPersonalDates.map(c => {
                const extra = personalDateExtras[c.key] || {};
                const syntheticTask: any = { text: c.msg, done: false, ...extra };
                return (
                  <div key={c.key} className="bg-white border border-[#EDE6D6] rounded-xl p-3 shadow-sm">
                    <div className="flex items-center gap-3 mb-2.5 cursor-pointer" onClick={() => setSelectedDonor(c.name)}>
                      <span className="text-xl shrink-0">{c.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-[#0D1B2A] truncate">{c.name}</div>
                        <div className="text-xs text-gray-600 mt-0.5">{c.msg}</div>
                      </div>
                    </div>
                    <QuickLogButtons donorName={c.name} compact />
                    <TaskDetailsPanel task={syntheticTask} onPatch={patch => patchPersonalDate(c.key, patch)} />
                  </div>
                );
              })}
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
              {holidayGroups.map(g => {
                return (
                  <div key={g.id}>
                    <button onClick={() => openHolidayFull(g.id)} className="flex items-center gap-1 text-xs font-bold text-[#9B7A2F] mb-1 hover:underline">
                      {g.id} <ChevronLeft size={12} />
                    </button>
                    {g.contextDate && (
                      <div className="text-[10px] text-gray-400 flex items-center gap-1 mb-2"><Clock size={10} /> {formatRemaining(g.contextDate, new Date())}</div>
                    )}
                    <div className="space-y-2">
                      {g.tasks.map(({ t, idx }: any) => (
                        <div key={idx}>
                          {renderTaskItem(
                            t,
                            () => toggleHolidayTask(g.id, idx),
                            () => deleteHolidayTask(g.id, idx),
                            p => toggleHolidayInvitePerson(g.id, idx, p),
                            patch => patchHolidayTask(g.id, idx, patch),
                            t.kind === 'holidayReminder' ? (
                              <button
                                onClick={() => skipHolidayTask(g.id, idx)}
                                className={`text-[10px] px-2 py-1 rounded-full border shrink-0 whitespace-nowrap ${t.skipped ? 'bg-[#FEF3C7] border-[#F59E0B] text-[#92400E]' : 'bg-[#FAF6EE] border-[#EDE6D6] text-gray-500'}`}
                                title={t.skipped ? 'בטל דילוג' : 'לדלג הפעם — לא צריך לעדכן'}
                              >
                                {t.skipped ? '↩️ בוטל' : '⏭️ לדלג'}
                              </button>
                            ) : undefined
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
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
              {eventGroups.map(g => {
                return (
                  <div key={g.id}>
                    <button onClick={() => setTab('events')} className="flex items-center gap-1 text-xs font-bold text-[#9B7A2F] mb-1 hover:underline">
                      {g.name} <ChevronLeft size={12} />
                    </button>
                    {g.contextDate && (
                      <div className="text-[10px] text-gray-400 flex items-center gap-1 mb-2"><Clock size={10} /> {formatRemaining(g.contextDate, new Date())} עד המפגש הבא</div>
                    )}
                    <div className="space-y-2">
                      {g.tasks.map(({ t, idx }: any) => (
                        <div key={idx}>
                          {renderTaskItem(t, () => toggleEventTask(g.id, idx), () => deleteEventTask(g.id, idx), p => toggleEventInvitePerson(g.id, idx, p), patch => patchEventTask(g.id, idx, patch))}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* משימות חד-פעמיות */}
        <div>
          <h2 className="font-['Frank_Ruhl_Libre'] text-lg font-bold text-[#0D1B2A] mb-3 flex items-center gap-2">
            <ListTodo size={18} className="text-[#C9A84C]" /> משימות חד-פעמיות
          </h2>
          {standaloneTasks.length === 0 ? (
            <div className="bg-white rounded-xl p-4 text-center text-gray-500 shadow-sm text-sm border border-[#EDE6D6]">
              אין עדיין משימות חד-פעמיות. למשל: "לעדכן לכל אנשי הקשר ימי הולדת ויארצייט".
            </div>
          ) : (
            <div className="space-y-2 mb-3">
              {standaloneTasks.map(({ t, idx }: any) => (
                <div key={idx}>
                  {renderTaskItem(
                    t,
                    t.kind === 'homeVisit' ? () => markHomeVisitDone(t.roundId, t.personName) : () => toggleStandaloneTask(idx),
                    () => deleteStandaloneTask(idx),
                    p => toggleStandaloneInvitePerson(idx, p),
                    patch => patchStandaloneTask(idx, patch),
                    t.kind === 'homeVisit' ? (
                      <button
                        onClick={() => setTab('homevisits')}
                        className="text-[10px] px-2 py-1 rounded-full border border-[#EDE6D6] bg-[#FAF6EE] text-[#9B7A2F] shrink-0 whitespace-nowrap"
                        title="פתח את מערך הביקורים"
                      >
                        🏠 מערך
                      </button>
                    ) : undefined
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="bg-white rounded-xl p-3 border border-dashed border-[#EDE6D6] space-y-2 mt-3">
            <input
              value={standaloneText}
              onChange={e => setStandaloneText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addStandaloneTask()}
              type="text"
              className="w-full bg-[#FAF6EE] border border-[#EDE6D6] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#C9A84C]"
              placeholder="משימה חדשה... (למשל: לעדכן ימי הולדת ויארצייט)"
            />
            <div className="flex gap-2">
              <input
                value={standaloneDue}
                onChange={e => setStandaloneDue(e.target.value)}
                type="date"
                className="flex-1 bg-[#FAF6EE] border border-[#EDE6D6] rounded-xl px-3 py-2 text-xs outline-none focus:border-[#C9A84C]"
                title="דדליין (לא חובה)"
              />
              <button onClick={addStandaloneTask} disabled={!standaloneText.trim()} className="bg-[#0D1B2A] rounded-xl px-4 text-[#E8C97A] font-bold text-sm shadow-sm disabled:opacity-40 shrink-0">
                הוסף
              </button>
            </div>
          </div>
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
