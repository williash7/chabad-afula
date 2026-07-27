import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store/AppContext';
import { History, Users, Wallet, ChevronDown, Lightbulb } from 'lucide-react';
import { countAttendance, sumBudget } from '../lib/history';

export function HistoryTab() {
  const { history, updateHistoryEntry } = useAppStore();
  const [filter, setFilter] = useState<'all' | 'holiday' | 'event'>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const [forms, setForms] = useState<Record<string, { good: string; improve: string; plan: string }>>({});

  const sorted = useMemo(
    () => [...history].sort((a, b) => new Date(b.archivedAt).getTime() - new Date(a.archivedAt).getTime()),
    [history]
  );
  const list = filter === 'all' ? sorted : sorted.filter(h => h.type === filter);

  const getForm = (h: typeof history[number]) => forms[h.id] || h.insights || { good: '', improve: '', plan: '' };

  const saveInsights = (id: string) => {
    const form = forms[id];
    if (!form) return;
    updateHistoryEntry(id, { insights: form });
  };

  return (
    <div className="animate-in fade-in pb-24 md:pb-6">
      <div className="bg-[#0D1B2A] px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-50 shadow-md">
        <div className="w-9 h-9 bg-gradient-to-br from-[#C9A84C] to-[#9B7A2F] rounded-lg flex items-center justify-center shrink-0 md:hidden">
          <History size={18} className="text-white" />
        </div>
        <div className="flex-1 px-3 md:px-0">
          <div className="font-['Frank_Ruhl_Libre'] text-lg font-bold text-[#C9A84C]">היסטוריה</div>
          <div className="text-[11px] text-white/45 mt-[1px]">חגים ואירועים שסומנו כהסתיימו</div>
        </div>
      </div>

      <div className="p-4 md:p-6">
        <div className="bg-white rounded-xl p-3.5 border border-[#EDE6D6] shadow-sm mb-4 text-[11px] text-gray-500 leading-relaxed">
          כדי להעביר חג או אירוע לכאן, פתחו אותו ולחצו על <b>"סמן כהסתיים והעבר להיסטוריה"</b>. הפעולה שומרת תמונת מצב (נוכחות, תקציב, משימות) ומרוקנת את המשימות של המופע החי כדי שהשנה הבאה תתחיל נקי — אפשר לייבא בחזרה את אותן משימות בלחיצת כפתור.
        </div>

        <div className="flex gap-1.5 mb-4">
          {([
            { id: 'all', label: 'הכל' },
            { id: 'holiday', label: '✡️ חגים' },
            { id: 'event', label: '📌 אירועים' },
          ] as { id: 'all' | 'holiday' | 'event'; label: string }[]).map(t => (
            <button key={t.id} onClick={() => setFilter(t.id)} className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors ${filter === t.id ? 'bg-[#0D1B2A] text-[#C9A84C] border-[#0D1B2A]' : 'bg-white text-gray-500 border-[#EDE6D6]'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {list.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            עדיין אין רשומות היסטוריה. סמנו חג או אירוע שהסתיים כדי לראות אותו כאן.
          </div>
        ) : (
          <div className="space-y-3">
            {list.map(h => {
              const attCount = countAttendance(h.attendance);
              const budget = sumBudget(h.budget);
              const isOpen = openId === h.id;
              const form = getForm(h);
              return (
                <div key={h.id} className="bg-white rounded-xl border border-[#EDE6D6] shadow-sm overflow-hidden">
                  <button onClick={() => setOpenId(isOpen ? null : h.id)} className="w-full flex items-center justify-between p-3.5 text-right">
                    <div className="min-w-0">
                      <div className="font-bold text-[#0D1B2A] text-sm flex items-center gap-2">
                        <span>{h.type === 'holiday' ? '✡️' : '📌'}</span>
                        {h.name}
                      </div>
                      <div className="text-[11px] text-gray-400 mt-0.5">
                        הועבר להיסטוריה ב-{new Date(h.archivedAt).toLocaleDateString('he-IL')}
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <span className="bg-[#D1FAE5] text-[#065F46] px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1"><Users size={10} /> {attCount} נכחו</span>
                        {(budget.actualIncome > 0 || budget.plannedIncome > 0) && (
                          <span className="bg-[#FEF3C7] text-[#92400E] px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1"><Wallet size={10} /> הכנסות: ₪{(budget.actualIncome || budget.plannedIncome).toLocaleString()}</span>
                        )}
                        {(budget.actualExpense > 0 || budget.plannedExpense > 0) && (
                          <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1">הוצאות: ₪{(budget.actualExpense || budget.plannedExpense).toLocaleString()}</span>
                        )}
                        {(h.tasks || []).length > 0 && (
                          <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md text-[10px] font-bold">📋 {(h.tasks || []).filter((t: any) => t.done).length}/{(h.tasks || []).length} משימות</span>
                        )}
                      </div>
                    </div>
                    <ChevronDown size={16} className={`text-gray-300 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isOpen && (
                    <div className="border-t border-[#EDE6D6] p-3.5 bg-[#FAF6EE]">
                      <div className="flex items-center gap-1.5 mb-2 text-[#9B7A2F] font-bold text-sm">
                        <Lightbulb size={14} /> תובנות והערות לקראת השנה הבאה
                      </div>
                      <div className="space-y-2">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">מה עבד טוב</label>
                          <textarea
                            value={form.good}
                            onChange={e => setForms(prev => ({ ...prev, [h.id]: { ...form, good: e.target.value } }))}
                            onBlur={() => saveInsights(h.id)}
                            rows={2}
                            className="w-full bg-white border border-[#EDE6D6] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#C9A84C] resize-none"
                            placeholder="..."
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">מה כדאי לשפר</label>
                          <textarea
                            value={form.improve}
                            onChange={e => setForms(prev => ({ ...prev, [h.id]: { ...form, improve: e.target.value } }))}
                            onBlur={() => saveInsights(h.id)}
                            rows={2}
                            className="w-full bg-white border border-[#EDE6D6] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#C9A84C] resize-none"
                            placeholder="..."
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">תוכנית לשנה הבאה</label>
                          <textarea
                            value={form.plan}
                            onChange={e => setForms(prev => ({ ...prev, [h.id]: { ...form, plan: e.target.value } }))}
                            onBlur={() => saveInsights(h.id)}
                            rows={2}
                            className="w-full bg-white border border-[#EDE6D6] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#C9A84C] resize-none"
                            placeholder="..."
                          />
                        </div>
                      </div>
                      {(h.tasks || []).length > 0 && (
                        <div className="mt-3">
                          <div className="text-[10px] font-bold text-gray-500 uppercase mb-1.5">משימות שהיו במופע הזה</div>
                          <div className="space-y-1">
                            {h.tasks.map((t: any, i: number) => (
                              <div key={i} className="text-xs text-gray-600 flex items-center gap-1.5">
                                <span>{t.done ? '✅' : '⬜'}</span> {t.text}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
