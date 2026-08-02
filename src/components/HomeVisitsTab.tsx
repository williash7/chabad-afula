import React, { useState } from 'react';
import { useAppStore } from '../store/AppContext';
import { DoorOpen, Plus, X, Check, ChevronUp, ChevronDown, CalendarClock, CheckCircle2, Bell, Search } from 'lucide-react';
import {
  HomeVisitEntry, HomeVisitRound, HOME_VISIT_CATEGORY_TAGS, liveCategoryFor,
  emptyHomeVisitEntry, buildInitialRoundEntries,
} from '../lib/homeVisits';
import { buildHolidayList } from '../lib/holidayList';
import { getCustomHols } from '../lib/api';
import { STANDALONE_TASKS_ID } from '../lib/tasks';

export function HomeVisitsTab({ addTrigger }: { addTrigger?: { tab: string; count: number } }) {
  const {
    homeVisits, visibleDonors, crm, donations, holidays, holidayExtras,
    startHomeVisitRound, markHomeVisitDone, createHomeVisitTaskForEntry,
    updateHomeVisitEntry, reorderHomeVisitEntries, archiveHomeVisitRound,
    removeHomeVisitEntry, addHomeVisitEntries,
  } = useAppStore();

  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerRoundId, setPickerRoundId] = useState<string | null>(null);
  const [pickerSelected, setPickerSelected] = useState<Set<string>>(new Set());
  const [pickerSearch, setPickerSearch] = useState('');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeRounds = [...homeVisits.rounds]
    .filter(r => r.status === 'active')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const archivedRounds = [...homeVisits.rounds]
    .filter(r => r.status === 'archived')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const allActiveNames = React.useMemo(
    () => new Set(activeRounds.flatMap(r => r.entries.map(e => e.name))),
    [activeRounds]
  );

  // רשימת שמות חגים קרובים (עד 120 יום) — להצעה מהירה בשדה "נושא" (datalist)
  const holidayNames = React.useMemo(() => {
    const list = buildHolidayList(holidays, getCustomHols(), today);
    return list.filter(h => h.daysAway >= 0 && h.daysAway <= 120).map(h => h.name);
  }, [holidays]);

  const standaloneTasks: any[] = holidayExtras[STANDALONE_TASKS_ID]?.tasks || [];
  const hasOpenTask = (roundId: string, name: string) =>
    standaloneTasks.some(t => t.kind === 'homeVisit' && t.roundId === roundId && t.personName === name && !t.done);

  const openNewRoundPicker = () => {
    const initial = buildInitialRoundEntries(visibleDonors, crm, donations, today, 20)
      .filter(e => !allActiveNames.has(e.name));
    setPickerRoundId(null);
    setPickerSelected(new Set(initial.slice(0, 10).map(e => e.name)));
    setPickerSearch('');
    setIsPickerOpen(true);
  };

  const openAddToRoundPicker = (roundId: string) => {
    setPickerRoundId(roundId);
    setPickerSelected(new Set());
    setPickerSearch('');
    setIsPickerOpen(true);
  };

  React.useEffect(() => {
    if (addTrigger?.tab === 'homevisits' && addTrigger.count) openNewRoundPicker();
  }, [addTrigger]);

  const candidateList = React.useMemo(
    () => buildInitialRoundEntries(visibleDonors, crm, donations, today, 300).filter(e => !allActiveNames.has(e.name)),
    [visibleDonors, crm, donations, allActiveNames]
  );

  const filteredCandidates = pickerSearch
    ? candidateList.filter(e => e.name.includes(pickerSearch))
    : candidateList;

  const togglePicked = (name: string) => {
    setPickerSelected(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const confirmPicker = () => {
    const names = Array.from(pickerSelected) as string[];
    if (names.length > 0) {
      const entries = names.map(name => emptyHomeVisitEntry(name, liveCategoryFor(name, crm)));
      if (pickerRoundId) addHomeVisitEntries(pickerRoundId, entries);
      else startHomeVisitRound(entries);
    }
    setIsPickerOpen(false);
  };

  const totalOpen = activeRounds.reduce((s, r) => s + r.entries.filter(e => !e.visited).length, 0);

  return (
    <div className="animate-in fade-in pb-24 md:pb-6">
      {/* Topbar */}
      <div className="bg-[#0D1B2A] px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-50 shadow-md">
        <div className="w-9 h-9 bg-gradient-to-br from-[#C9A84C] to-[#9B7A2F] rounded-lg flex items-center justify-center shrink-0 md:hidden">
          <DoorOpen size={20} className="text-white" />
        </div>
        <div className="flex-1 px-3 md:px-0">
          <div className="font-['Frank_Ruhl_Libre'] text-lg font-bold text-[#C9A84C]">ביקורי בית</div>
          <div className="text-[11px] text-white/45 mt-[1px]">{totalOpen} ממתינים לביקור · {activeRounds.length} מערכים פעילים</div>
        </div>
        <button onClick={openNewRoundPicker} className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center text-white/80 shrink-0 hover:bg-white/20 transition-colors">
          <Plus size={18} />
        </button>
      </div>

      <div className="p-4 md:p-6 max-w-2xl space-y-6">
        {activeRounds.length === 0 && (
          <div className="bg-white rounded-xl p-5 text-center text-gray-500 shadow-sm text-sm border border-[#EDE6D6] space-y-3">
            <div>אין עדיין מערך ביקורים פעיל.</div>
            <button
              onClick={openNewRoundPicker}
              className="inline-flex items-center gap-1.5 bg-[#0D1B2A] text-[#E8C97A] font-bold text-sm py-2.5 px-4 rounded-xl shadow-sm"
            >
              <Plus size={14} /> התחל מערך ביקורים חדש
            </button>
          </div>
        )}

        {activeRounds.map(round => (
          <RoundCard
            key={round.id}
            round={round}
            crm={crm}
            holidayNames={holidayNames}
            hasOpenTask={hasOpenTask}
            onUpdateEntry={(name, patch) => updateHomeVisitEntry(round.id, name, patch)}
            onReorder={(from, to) => reorderHomeVisitEntries(round.id, from, to)}
            onMarkDone={(name) => markHomeVisitDone(round.id, name)}
            onCreateTask={(name) => createHomeVisitTaskForEntry(round.id, name)}
            onRemove={(name) => removeHomeVisitEntry(round.id, name)}
            onArchive={() => archiveHomeVisitRound(round.id)}
            onAddMore={() => openAddToRoundPicker(round.id)}
          />
        ))}

        {archivedRounds.length > 0 && (
          <div>
            <h2 className="font-['Frank_Ruhl_Libre'] text-lg font-bold text-[#0D1B2A] mb-3">מערכים שהסתיימו</h2>
            <div className="space-y-2">
              {archivedRounds.map(r => {
                const visited = r.entries.filter(e => e.visited).length;
                return (
                  <div key={r.id} className="bg-white rounded-xl p-3 shadow-sm border border-[#EDE6D6] flex items-center justify-between text-sm">
                    <span className="text-gray-500">{new Date(r.createdAt).toLocaleDateString('he-IL')}</span>
                    <span className="text-[#0D1B2A] font-bold">{visited}/{r.entries.length} בוקרו</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* בחירת אנשים למערך */}
      {isPickerOpen && (
        <div className="fixed inset-0 bg-black/60 z-[220] flex items-center justify-center p-4 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && setIsPickerOpen(false)}>
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center mb-3 shrink-0">
              <h3 className="font-bold text-xl text-[#0D1B2A]">{pickerRoundId ? 'הוספת אנשים למערך' : 'מערך ביקורים חדש'}</h3>
              <button onClick={() => setIsPickerOpen(false)} className="text-gray-400 p-1 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="relative mb-3 shrink-0">
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={pickerSearch}
                onChange={e => setPickerSearch(e.target.value)}
                type="text"
                className="w-full bg-[#FAF6EE] border border-[#EDE6D6] rounded-xl pr-8 pl-3 py-2.5 text-sm outline-none focus:border-[#C9A84C]"
                placeholder="חיפוש איש קשר..."
              />
            </div>
            <div className="overflow-y-auto flex-1 -mx-1 px-1 space-y-1.5 mb-3">
              {filteredCandidates.length === 0 && (
                <div className="text-center text-sm text-gray-400 py-6">אין מועמדים תואמים</div>
              )}
              {filteredCandidates.map(e => {
                const picked = pickerSelected.has(e.name);
                return (
                  <button
                    key={e.name}
                    onClick={() => togglePicked(e.name)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-sm text-right transition-colors ${picked ? 'bg-[#FDF6E3] border-[#C9A84C]' : 'bg-white border-[#EDE6D6]'}`}
                  >
                    <span className="text-[#0D1B2A] font-medium truncate">{e.name}</span>
                    <span className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-gray-400">{e.category}</span>
                      <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${picked ? 'bg-[#C9A84C] border-[#C9A84C]' : 'border-gray-300'}`}>
                        {picked && <Check size={12} className="text-white" />}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              onClick={confirmPicker}
              disabled={pickerSelected.size === 0}
              className="w-full bg-[#0D1B2A] text-[#E8C97A] py-3 rounded-xl font-bold text-sm shadow-lg disabled:opacity-40 shrink-0"
            >
              {pickerRoundId ? `הוסף ${pickerSelected.size || ''} למערך` : `התחל מערך עם ${pickerSelected.size || ''} אנשים`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function RoundCard({
  round, crm, holidayNames, hasOpenTask,
  onUpdateEntry, onReorder, onMarkDone, onCreateTask, onRemove, onArchive, onAddMore,
}: {
  round: HomeVisitRound;
  crm: Record<string, any>;
  holidayNames: string[];
  hasOpenTask: (roundId: string, name: string) => boolean;
  onUpdateEntry: (name: string, patch: Partial<HomeVisitEntry>) => void;
  onReorder: (from: number, to: number) => void;
  onMarkDone: (name: string) => void;
  onCreateTask: (name: string) => void;
  onRemove: (name: string) => void;
  onArchive: () => void;
  onAddMore: () => void;
} & { key?: any }) {
  const visited = round.entries.filter(e => e.visited).length;
  const allVisited = round.entries.length > 0 && visited === round.entries.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="font-['Frank_Ruhl_Libre'] text-lg font-bold text-[#0D1B2A]">מערך מ-{new Date(round.createdAt).toLocaleDateString('he-IL')}</h2>
          <div className="text-[11px] text-gray-400">{visited}/{round.entries.length} בוקרו</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={onAddMore} className="text-[11px] px-2.5 py-1.5 rounded-full border border-[#EDE6D6] text-[#9B7A2F] bg-white flex items-center gap-1">
            <Plus size={12} /> הוסף
          </button>
          <button
            onClick={onArchive}
            className={`text-[11px] px-2.5 py-1.5 rounded-full border flex items-center gap-1 ${allVisited ? 'border-[#10B981] text-[#065F46] bg-[#D1FAE5]' : 'border-[#EDE6D6] text-gray-400 bg-white'}`}
            title="סיים את המערך"
          >
            <CheckCircle2 size={12} /> סיים מערך
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {round.entries.map((entry, idx) => (
          <EntryRow
            key={entry.name}
            entry={entry}
            idx={idx}
            total={round.entries.length}
            crm={crm}
            holidayNames={holidayNames}
            hasOpenTask={hasOpenTask(round.id, entry.name)}
            onUpdate={patch => onUpdateEntry(entry.name, patch)}
            onMoveUp={() => onReorder(idx, idx - 1)}
            onMoveDown={() => onReorder(idx, idx + 1)}
            onMarkDone={() => onMarkDone(entry.name)}
            onCreateTask={() => onCreateTask(entry.name)}
            onRemove={() => onRemove(entry.name)}
          />
        ))}
      </div>
    </div>
  );
}

function EntryRow({
  entry, idx, total, crm, holidayNames, hasOpenTask,
  onUpdate, onMoveUp, onMoveDown, onMarkDone, onCreateTask, onRemove,
}: {
  entry: HomeVisitEntry;
  idx: number;
  total: number;
  crm: Record<string, any>;
  holidayNames: string[];
  hasOpenTask: boolean;
  onUpdate: (patch: Partial<HomeVisitEntry>) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onMarkDone: () => void;
  onCreateTask: () => void;
  onRemove: () => void;
} & { key?: any }) {
  const displayCategory = entry.categoryIsCustom ? entry.category : liveCategoryFor(entry.name, crm);
  const datalistId = `holiday-topics-${entry.name.replace(/\s+/g, '_')}`;

  return (
    <div className={`bg-white rounded-xl p-3 shadow-sm border ${entry.visited ? 'border-[#10B981]/40 opacity-70' : 'border-[#EDE6D6]'}`}>
      <div className="flex items-start gap-2">
        <div className="flex flex-col gap-0.5 shrink-0 pt-0.5">
          <button onClick={onMoveUp} disabled={idx === 0} className="text-gray-300 disabled:opacity-30 hover:text-gray-500"><ChevronUp size={14} /></button>
          <button onClick={onMoveDown} disabled={idx === total - 1} className="text-gray-300 disabled:opacity-30 hover:text-gray-500"><ChevronDown size={14} /></button>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className={`text-sm font-bold ${entry.visited ? 'text-gray-400 line-through' : 'text-[#0D1B2A]'}`}>{entry.name}</span>
            <button onClick={onRemove} className="text-red-300 hover:text-red-500 shrink-0" title="הסר מהמערך"><X size={14} /></button>
          </div>

          <select
            value={entry.categoryIsCustom ? entry.category : '__live__'}
            onChange={e => {
              const v = e.target.value;
              if (v === '__live__') onUpdate({ category: liveCategoryFor(entry.name, crm), categoryIsCustom: false });
              else onUpdate({ category: v, categoryIsCustom: true });
            }}
            className="w-full bg-[#FAF6EE] border border-[#EDE6D6] rounded-lg px-2 py-1.5 text-xs outline-none focus:border-[#C9A84C] mb-2"
          >
            <option value="__live__">🔄 {liveCategoryFor(entry.name, crm)} (לפי מעגל קרבה)</option>
            {HOME_VISIT_CATEGORY_TAGS.map(tag => <option key={tag} value={tag}>{tag}</option>)}
          </select>

          <div className="flex gap-2 mb-2">
            <input
              value={entry.topic || ''}
              onChange={e => onUpdate({ topic: e.target.value })}
              list={datalistId}
              type="text"
              placeholder="נושא (למשל חג)..."
              className="flex-1 min-w-0 bg-[#FAF6EE] border border-[#EDE6D6] rounded-lg px-2 py-1.5 text-xs outline-none focus:border-[#C9A84C]"
            />
            <datalist id={datalistId}>
              {holidayNames.map(n => <option key={n} value={n} />)}
            </datalist>
            <input
              value={entry.emphasis || ''}
              onChange={e => onUpdate({ emphasis: e.target.value })}
              type="text"
              placeholder="דגש לביקור..."
              className="flex-1 min-w-0 bg-[#FAF6EE] border border-[#EDE6D6] rounded-lg px-2 py-1.5 text-xs outline-none focus:border-[#C9A84C]"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={entry.scheduled}
                onChange={e => onUpdate({ scheduled: e.target.checked, scheduledDate: e.target.checked ? entry.scheduledDate : undefined })}
                className="accent-[#C9A84C]"
              />
              <CalendarClock size={12} /> קבעתי זמן
            </label>
            {entry.scheduled && (
              <input
                value={entry.scheduledDate || ''}
                onChange={e => onUpdate({ scheduledDate: e.target.value })}
                type="date"
                className="bg-[#FAF6EE] border border-[#EDE6D6] rounded-lg px-2 py-1 text-xs outline-none focus:border-[#C9A84C]"
              />
            )}

            <span className="text-[10px] text-[#9B7A2F] bg-[#FDF6E3] px-1.5 py-0.5 rounded-full">{displayCategory}</span>

            <div className="mr-auto flex items-center gap-1.5 shrink-0">
              {!entry.visited && !hasOpenTask && (
                <button onClick={onCreateTask} className="text-[10px] px-2 py-1 rounded-full border border-[#EDE6D6] bg-white text-[#9B7A2F] flex items-center gap-1">
                  <Bell size={10} /> הוסף למשימות
                </button>
              )}
              {entry.visited ? (
                <span className="text-[10px] px-2 py-1 rounded-full bg-[#D1FAE5] text-[#065F46] font-bold flex items-center gap-1">
                  <Check size={10} /> בוצע {entry.visitedDate ? `· ${new Date(entry.visitedDate).toLocaleDateString('he-IL')}` : ''}
                </span>
              ) : (
                <button onClick={onMarkDone} className="text-[10px] px-2.5 py-1 rounded-full bg-[#0D1B2A] text-[#E8C97A] font-bold">
                  ✓ בוצע ביקור
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
