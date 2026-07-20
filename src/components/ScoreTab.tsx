import React, { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../store/AppContext';
import { computeLastContactByName } from '../lib/contactFocus';
import { getScoreSnapshot, backfillLastWeek, getWeekActivities, POINT_RULES, SCORE_ACTION_EVENT } from '../lib/score';
import { TrendingUp, Flame, ChevronDown, Info } from 'lucide-react';

export function ScoreTab({ onContactClick }: { onContactClick?: (name: string) => void } = {}) {
  const { visibleDonors, donations } = useAppStore();
  const [toast, setToast] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [detailWeek, setDetailWeek] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: any) => {
      setToast(`+${e.detail.points} נקודות`);
      setTimeout(() => setToast(null), 2000);
      setTick(t => t + 1);
    };
    window.addEventListener(SCORE_ACTION_EVENT, handler);
    return () => window.removeEventListener(SCORE_ACTION_EVENT, handler);
  }, []);

  // גיבוי חד-פעמי: נותן נקודות רטרואקטיביות על תרומות/מפגשים מהשבוע האחרון
  // (לא רץ פעם שנייה — הפונקציה עצמה שומרת סימון ב-localStorage)
  useEffect(() => {
    const result = backfillLastWeek(donations);
    if (result && result.count > 0) {
      setToast(`עודכן ניקוד רטרואקטיבי: +${result.points} נקודות מ-${result.count} פעולות השבוע האחרון`);
      setTimeout(() => setToast(null), 4000);
      setTick(t => t + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const today = useMemo(() => new Date(), [tick]);
  const snapshot = useMemo(() => getScoreSnapshot(today), [today]);

  const { total, streak, thisWeek, lastWeek, bestWeek } = snapshot;
  const progress = total % 100;
  const milestones = Math.floor(total / 100);

  const weekActivities = useMemo(() => detailWeek ? getWeekActivities(detailWeek) : [], [detailWeek, tick]);

  const weeklyChangePct = lastWeek && lastWeek.points > 0
    ? Math.round(((thisWeek.points - lastWeek.points) / lastWeek.points) * 100)
    : null;

  const temperature = useMemo(() => {
    const lastContactMap = computeLastContactByName(donations);
    let hot = 0, warm = 0, cold = 0;
    const coldList: { name: string; days: number | null }[] = [];
    Object.keys(visibleDonors).forEach(name => {
      const last = lastContactMap.get(name);
      const days = last ? Math.floor((today.getTime() - last.getTime()) / 86400000) : null;
      if (days === null || days > 30) { cold++; coldList.push({ name, days }); }
      else if (days > 7) warm++;
      else hot++;
    });
    coldList.sort((a, b) => (b.days ?? Infinity) - (a.days ?? Infinity));
    return { hot, warm, cold, coldest: coldList.slice(0, 3) };
  }, [visibleDonors, donations, today]);

  return (
    <div className="animate-in fade-in pb-24 md:pb-6" dir="rtl">
      <div className="bg-[#0D1B2A] px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-50 shadow-md">
        <div className="w-9 h-9 bg-gradient-to-br from-[#C9A84C] to-[#9B7A2F] rounded-lg flex items-center justify-center shrink-0 md:hidden">
          <TrendingUp size={20} className="text-white" />
        </div>
        <div className="flex-1 px-3 md:px-0">
          <div className="font-['Frank_Ruhl_Libre'] text-lg font-bold text-[#C9A84C]">ניקוד</div>
          <div className="text-[11px] text-white/45 mt-[1px]">{total.toLocaleString()} נקודות סה"כ</div>
        </div>
      </div>

      <div className="p-4 md:p-6 max-w-2xl space-y-4">
        {/* קטע 1: הרצף שלך */}
        <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100 text-center">
          <div className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-1">הרצף שלך</div>
          <div className="font-['Frank_Ruhl_Libre'] font-black text-[#C9A84C]" style={{ fontSize: 72, lineHeight: 1 }}>
            {streak}
          </div>
          <div className="text-sm text-gray-500 mt-2">ימים רצופים</div>
          {streak > 30 && (
            <div className="text-xs font-bold text-orange-500 mt-2 flex items-center justify-center gap-1"><Flame size={13} /> מומנטום ×2</div>
          )}
          {streak > 7 && streak <= 30 && (
            <div className="text-xs font-bold text-orange-500 mt-2 flex items-center justify-center gap-1"><Flame size={13} /> מומנטום ×1.5</div>
          )}
        </div>

        {/* קטע 2: בר עד 100 הבאות */}
        <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-gray-400 uppercase tracking-wide">עד 100 הבאות</span>
            <span className="text-sm font-bold text-[#0D1B2A]">{progress}/100</span>
          </div>
          <div className="w-full h-3 bg-[#FAF6EE] rounded-full overflow-hidden">
            <div className="h-full bg-[#C9A84C] rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="text-[11px] text-gray-400 mt-2">{progress}/100 נקודות למיילסטון הבא · {milestones} מיילסטונים הושלמו עד כה ✓</div>
        </div>

        {/* קטע 3: סיכום שבועי */}
        <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
          <div className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3">סיכום שבועי</div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <button
              onClick={() => setDetailWeek(v => v === thisWeek.week ? null : thisWeek.week)}
              disabled={thisWeek.actions === 0}
              className={`rounded-xl p-3 text-center transition-colors disabled:cursor-default ${detailWeek === thisWeek.week ? 'bg-[#C9A84C]/15 border border-[#C9A84C]/40' : 'bg-[#FAF6EE] border border-transparent'}`}
            >
              <div className="font-['Frank_Ruhl_Libre'] font-black text-[#0D1B2A] text-xl">{thisWeek.points}</div>
              <div className="text-[11px] text-gray-500 mt-0.5 flex items-center justify-center gap-1">
                השבוע · {thisWeek.actions} פעולות
                {thisWeek.actions > 0 && <ChevronDown size={11} className={`transition-transform ${detailWeek === thisWeek.week ? 'rotate-180' : ''}`} />}
              </div>
            </button>
            <button
              onClick={() => lastWeek && setDetailWeek(v => v === lastWeek.week ? null : lastWeek.week)}
              disabled={!lastWeek || lastWeek.actions === 0}
              className={`rounded-xl p-3 text-center transition-colors disabled:cursor-default ${lastWeek && detailWeek === lastWeek.week ? 'bg-[#C9A84C]/15 border border-[#C9A84C]/40' : 'bg-[#FAF6EE] border border-transparent'}`}
            >
              <div className="font-['Frank_Ruhl_Libre'] font-black text-[#0D1B2A] text-xl">{lastWeek?.points ?? '—'}</div>
              <div className="text-[11px] text-gray-500 mt-0.5 flex items-center justify-center gap-1">
                שבוע שעבר{lastWeek ? ` · ${lastWeek.actions} פעולות` : ''}
                {lastWeek && lastWeek.actions > 0 && <ChevronDown size={11} className={`transition-transform ${detailWeek === lastWeek.week ? 'rotate-180' : ''}`} />}
              </div>
            </button>
          </div>

          {detailWeek && weekActivities.length > 0 && (
            <div className="space-y-1.5 mb-3 border-t border-dashed border-gray-100 pt-3">
              {weekActivities.map((a, i) => (
                <div key={i} className="flex items-center justify-between gap-2 bg-[#FAF6EE] rounded-lg px-3 py-1.5">
                  <div className="min-w-0">
                    <span className="text-xs text-[#0D1B2A]">{a.label}</span>
                    <span className="text-[10px] text-gray-400 mr-1.5">{a.date.split('-').reverse().slice(0, 2).join('/')}</span>
                  </div>
                  <span className="shrink-0 text-xs font-bold text-[#C9A84C]">+{a.points}</span>
                </div>
              ))}
            </div>
          )}

          <div className="text-sm font-bold text-center mb-2">
            {!lastWeek ? (
              <span className="text-gray-400">שבוע ראשון!</span>
            ) : weeklyChangePct !== null && weeklyChangePct >= 0 ? (
              <span className="text-green-500">↑ {weeklyChangePct}% מהשבוע שעבר</span>
            ) : (
              <span className="text-red-500">↓ {Math.abs(weeklyChangePct ?? 0)}% מהשבוע שעבר</span>
            )}
          </div>
          {bestWeek && (
            <div className="text-[11px] text-gray-400 text-center border-t border-dashed border-gray-100 pt-2">
              שיא: {bestWeek.actions} פעולות בשבוע {bestWeek.week}
            </div>
          )}
        </div>

        {/* קטע 4: חם/קר */}
        <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
          <div className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3">חם / קר — אנשי קשר</div>
          <div className="flex items-center justify-center gap-4 text-sm font-bold mb-3">
            <span>🟢 {temperature.hot}</span>
            <span>🟡 {temperature.warm}</span>
            <span>🔴 {temperature.cold}</span>
          </div>
          {temperature.coldest.length > 0 && (
            <div className="space-y-2">
              {temperature.coldest.map(c => (
                <div key={c.name} className="flex items-center justify-between gap-2 bg-[#FAF6EE] rounded-xl p-2.5 border border-[#EDE6D6]">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-[#0D1B2A] truncate">{c.name}</div>
                    <div className="text-[11px] text-gray-500">{c.days === null ? 'לא תועד קשר עדיין' : `${c.days} ימים בלי יצירת קשר`}</div>
                  </div>
                  <button
                    onClick={() => onContactClick?.(c.name)}
                    className="shrink-0 bg-[#0D1B2A] text-[#E8C97A] text-xs font-bold px-3 py-1.5 rounded-lg active:scale-95 transition-transform"
                  >
                    חזור
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* טבלת ניקוד — מידע: כמה שווה כל פעולה */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <button onClick={() => setIsInfoOpen(v => !v)} className="w-full flex items-center justify-between p-4">
            <span className="text-sm font-bold text-gray-400 uppercase tracking-wide flex items-center gap-2"><Info size={15} /> טבלת ניקוד — כמה שווה כל פעולה</span>
            <ChevronDown size={16} className={`text-gray-400 transition-transform ${isInfoOpen ? 'rotate-180' : ''}`} />
          </button>
          {isInfoOpen && (
            <div className="px-4 pb-4 space-y-1.5">
              {Object.entries(POINT_RULES).map(([key, rule]) => (
                <div key={key} className="flex items-center justify-between gap-2 bg-[#FAF6EE] rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${rule.category === 'execution' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                      {rule.category === 'execution' ? 'ביצוע' : 'תכנון'}
                    </span>
                    <span className="text-sm text-[#0D1B2A] truncate">{rule.label}</span>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-[#C9A84C]">+{rule.points}</span>
                </div>
              ))}
              <p className="text-[10px] text-gray-400 pt-1">פעולות "ביצוע" (השלמה בפועל) שוות יותר מפעולות "תכנון" (יצירה מראש). כמה משימות/הזמנות שנוספות יחד (למשל דרך תכנון AI) מנוקדות לפי מספרן.</p>
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-[#0D1B2A] text-[#C9A84C] font-bold px-6 py-3 rounded-full shadow-xl z-50 text-lg animate-bounce">
          {toast}
        </div>
      )}
    </div>
  );
}
