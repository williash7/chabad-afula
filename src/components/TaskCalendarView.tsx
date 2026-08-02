import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, EyeOff, Eye } from 'lucide-react';

export interface CalendarItem {
  key: string;
  date: Date | null; // null = ללא תאריך מפורש
  label: string;
  done: boolean;
}

const HEBREW_MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
const WEEKDAY_LABELS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const dateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const startOfWeek = (d: Date) => { const x = new Date(d); x.setDate(x.getDate() - x.getDay()); x.setHours(0, 0, 0, 0); return x; };
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

// לוח שנה למשימות — תצוגת חודש/שבוע/יום, עם חלוקה לשעות בתצוגות שבוע/יום
// (task.time, או 00:00 כברירת מחדל) ומגירת "ללא תאריך" עם הצגה/העלמה.
export function TaskCalendarView({ items, onSelect }: { items: CalendarItem[]; onSelect: (key: string) => void }) {
  const [calView, setCalView] = useState<'month' | 'week' | 'day'>('month');
  const [focusDate, setFocusDate] = useState(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; });
  const [showDateless, setShowDateless] = useState(true);

  const dated = items.filter(i => i.date);
  const dateless = items.filter(i => !i.date);

  const byDay = new Map<string, typeof items>();
  dated.forEach(i => {
    const k = dateKey(i.date as Date);
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k)!.push(i);
  });

  const chipClass = (done: boolean) =>
    `block w-full text-right truncate text-[10px] px-1.5 py-0.5 rounded ${done ? 'bg-gray-100 text-gray-400 line-through' : 'bg-[#FDF6E3] text-[#0D1B2A] hover:bg-[#F5E7C4]'}`;

  const navLabel =
    calView === 'month' ? `${HEBREW_MONTHS[focusDate.getMonth()]} ${focusDate.getFullYear()}` :
    calView === 'week' ? (() => {
      const s = startOfWeek(focusDate), e = addDays(s, 6);
      return `${s.getDate()}/${s.getMonth() + 1} – ${e.getDate()}/${e.getMonth() + 1}`;
    })() :
    focusDate.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });

  const navigate = (dir: -1 | 1) => {
    const d = new Date(focusDate);
    if (calView === 'month') d.setMonth(d.getMonth() + dir);
    else if (calView === 'week') d.setDate(d.getDate() + dir * 7);
    else d.setDate(d.getDate() + dir);
    setFocusDate(d);
  };

  const goToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); setFocusDate(d); };

  return (
    <div>
      {/* בקרת תצוגה + ניווט */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          {(['month', 'week', 'day'] as const).map(v => (
            <button
              key={v}
              onClick={() => setCalView(v)}
              className={`text-[11px] px-2.5 py-1 rounded-full border font-medium ${calView === v ? 'bg-[#0D1B2A] text-[#E8C97A] border-[#0D1B2A]' : 'bg-white text-gray-500 border-[#EDE6D6]'}`}
            >
              {v === 'month' ? 'חודש' : v === 'week' ? 'שבוע' : 'יום'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => navigate(-1)} className="w-7 h-7 rounded-full border border-[#EDE6D6] bg-white flex items-center justify-center text-gray-500"><ChevronRight size={14} /></button>
          <button onClick={goToday} className="text-[11px] px-2.5 py-1 rounded-full border border-[#EDE6D6] bg-white text-[#9B7A2F] font-medium">היום</button>
          <button onClick={() => navigate(1)} className="w-7 h-7 rounded-full border border-[#EDE6D6] bg-white flex items-center justify-center text-gray-500"><ChevronLeft size={14} /></button>
          <span className="text-sm font-bold text-[#0D1B2A] mr-1">{navLabel}</span>
        </div>
      </div>

      {calView === 'month' && (
        <MonthGrid focusDate={focusDate} byDay={byDay} onDayClick={d => { setFocusDate(d); setCalView('day'); }} onSelect={onSelect} chipClass={chipClass} />
      )}
      {calView === 'week' && (
        <HourGrid days={Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(focusDate), i))} byDay={byDay} onSelect={onSelect} chipClass={chipClass} />
      )}
      {calView === 'day' && (
        <HourGrid days={[focusDate]} byDay={byDay} onSelect={onSelect} chipClass={chipClass} />
      )}

      {/* מגירת "ללא תאריך" */}
      <div className="mt-4">
        <button
          onClick={() => setShowDateless(s => !s)}
          className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-[#9B7A2F] mb-2"
        >
          {showDateless ? <Eye size={12} /> : <EyeOff size={12} />}
          משימות ללא תאריך ({dateless.length}) — {showDateless ? 'הסתר' : 'הצג'}
        </button>
        {showDateless && dateless.length > 0 && (
          <div className="bg-white rounded-xl p-2.5 border border-[#EDE6D6] flex flex-wrap gap-1.5">
            {dateless.map(i => (
              <button key={i.key} onClick={() => onSelect(i.key)} className={`${chipClass(i.done)} w-auto max-w-[220px]`}>
                {i.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MonthGrid({
  focusDate, byDay, onDayClick, onSelect, chipClass,
}: {
  focusDate: Date;
  byDay: Map<string, CalendarItem[]>;
  onDayClick: (d: Date) => void;
  onSelect: (key: string) => void;
  chipClass: (done: boolean) => string;
}) {
  const firstOfMonth = new Date(focusDate.getFullYear(), focusDate.getMonth(), 1);
  const gridStart = startOfWeek(firstOfMonth);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));

  return (
    <div className="bg-white rounded-xl border border-[#EDE6D6] overflow-hidden">
      <div className="grid grid-cols-7 bg-[#FAF6EE] border-b border-[#EDE6D6]">
        {WEEKDAY_LABELS.map(w => (
          <div key={w} className="text-center text-[10px] font-bold text-gray-400 py-1.5">{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((d, i) => {
          const inMonth = d.getMonth() === focusDate.getMonth();
          const isToday = dateKey(d) === dateKey(today);
          const dayItems = byDay.get(dateKey(d)) || [];
          return (
            <div key={i} className={`min-h-[72px] border-b border-l border-[#EDE6D6] p-1 ${inMonth ? '' : 'bg-gray-50/50'}`}>
              <button
                onClick={() => onDayClick(d)}
                className={`text-[11px] w-5 h-5 rounded-full flex items-center justify-center mb-1 ${isToday ? 'bg-[#C9A84C] text-white font-bold' : inMonth ? 'text-[#0D1B2A]' : 'text-gray-300'}`}
              >
                {d.getDate()}
              </button>
              <div className="space-y-0.5">
                {dayItems.slice(0, 3).map(it => (
                  <button key={it.key} onClick={() => onSelect(it.key)} className={chipClass(it.done)}>{it.label}</button>
                ))}
                {dayItems.length > 3 && (
                  <button onClick={() => onDayClick(d)} className="text-[9px] text-gray-400 hover:text-[#9B7A2F]">+{dayItems.length - 3} עוד</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HourGrid({
  days, byDay, onSelect, chipClass,
}: {
  days: Date[];
  byDay: Map<string, CalendarItem[]>;
  onSelect: (key: string) => void;
  chipClass: (done: boolean) => string;
}) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return (
    <div className="bg-white rounded-xl border border-[#EDE6D6] overflow-hidden">
      <div className="grid" style={{ gridTemplateColumns: `36px repeat(${days.length}, 1fr)` }}>
        <div className="border-b border-[#EDE6D6]" />
        {days.map(d => {
          const isToday = dateKey(d) === dateKey(today);
          return (
            <div key={dateKey(d)} className="border-b border-l border-[#EDE6D6] text-center py-1.5">
              <div className="text-[9px] text-gray-400">{WEEKDAY_LABELS[d.getDay()]}</div>
              <div className={`text-xs font-bold ${isToday ? 'text-[#C9A84C]' : 'text-[#0D1B2A]'}`}>{d.getDate()}/{d.getMonth() + 1}</div>
            </div>
          );
        })}
      </div>
      <div className="max-h-[560px] overflow-y-auto">
        {HOURS.map(hour => (
          <div key={hour} className="grid" style={{ gridTemplateColumns: `36px repeat(${days.length}, 1fr)` }}>
            <div className="text-[9px] text-gray-400 text-left pl-1 border-b border-[#EDE6D6] py-1">{String(hour).padStart(2, '0')}:00</div>
            {days.map(d => {
              const dayItems = (byDay.get(dateKey(d)) || []).filter(it => (it.date as Date).getHours() === hour);
              return (
                <div key={dateKey(d) + hour} className="border-b border-l border-[#EDE6D6] p-0.5 min-h-[26px] space-y-0.5">
                  {dayItems.map(it => (
                    <button key={it.key} onClick={() => onSelect(it.key)} className={chipClass(it.done)}>{it.label}</button>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
