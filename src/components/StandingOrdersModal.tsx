import React, { useState, useMemo } from 'react';
import { X, Search, RefreshCw, AlertTriangle, ChevronDown } from 'lucide-react';
import { useAppStore } from '../store/AppContext';
import { getHkStatus, sortHkList, countHkByStatus, HK_STATUS_LABEL, HK_STATUS_COLOR, HkStatus } from '../lib/standingOrders';

export function StandingOrdersModal({ onClose }: { onClose: () => void }) {
  const { hk, failures, refresh, settings, updateSettings } = useAppStore();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | HkStatus | 'errors'>('all');
  const [showSettings, setShowSettings] = useState(false);

  const threshold = settings.hkExpiringThreshold ?? 2;
  const failNames = useMemo(() => new Set(failures.map((f: any) => f.name)), [failures]);
  const failByName = useMemo(() => {
    const m: Record<string, any> = {};
    failures.forEach((f: any) => { m[f.name] = f; });
    return m;
  }, [failures]);

  const sorted = useMemo(() => sortHkList(hk, failNames, threshold), [hk, failNames, threshold]);
  const counts = useMemo(() => countHkByStatus(hk, threshold), [hk, threshold]);

  let list = sorted;
  if (filter === 'errors') list = list.filter(h => failNames.has(h.name));
  else if (filter !== 'all') list = list.filter(h => getHkStatus(h, threshold) === filter);
  if (search) list = list.filter(h => h.name?.toLowerCase().includes(search.toLowerCase()));

  const filterTabs: { id: 'all' | HkStatus | 'errors'; label: string; count: number }[] = [
    { id: 'all', label: 'הכל', count: hk.length },
    { id: 'expiring', label: 'מסתיימות בקרוב', count: counts.expiring },
    { id: 'expired', label: 'הסתיימו', count: counts.expired },
    { id: 'active', label: 'פעילות', count: counts.active },
    { id: 'errors', label: 'כשלי חיוב', count: failures.length },
  ];

  return (
    <div className="fixed inset-0 bg-[#FAF6EE] z-[100] flex flex-col h-full" dir="rtl">
      {/* Header */}
      <div className="bg-[#0D1B2A] text-white px-4 py-3 flex items-center justify-between shrink-0 shadow-md">
        <button onClick={onClose} className="p-2 -m-2 text-white/60 hover:text-white transition-colors">
          <X size={22} />
        </button>
        <h2 className="font-['Frank_Ruhl_Libre'] text-lg font-bold text-[#C9A84C]">הוראות קבע</h2>
        <button onClick={() => refresh()} className="p-2 -m-2 text-white/60 hover:text-white transition-colors" title="רענן">
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Summary strip */}
      <div className="px-4 pt-4 pb-2 shrink-0">
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-white rounded-xl p-2.5 text-center border border-[#EDE6D6] shadow-sm">
            <div className="font-['Frank_Ruhl_Libre'] text-xl font-bold text-emerald-600">{counts.active}</div>
            <div className="text-[10px] text-gray-500 mt-0.5">פעילות</div>
          </div>
          <div className="bg-white rounded-xl p-2.5 text-center border border-amber-200 shadow-sm">
            <div className="font-['Frank_Ruhl_Libre'] text-xl font-bold text-amber-600">{counts.expiring}</div>
            <div className="text-[10px] text-gray-500 mt-0.5">מסתיימות בקרוב</div>
          </div>
          <div className="bg-white rounded-xl p-2.5 text-center border border-[#EDE6D6] shadow-sm">
            <div className="font-['Frank_Ruhl_Libre'] text-xl font-bold text-gray-400">{counts.expired}</div>
            <div className="text-[10px] text-gray-500 mt-0.5">הסתיימו</div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-2">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="חיפוש לפי שם..."
            className="w-full bg-white border border-[#EDE6D6] rounded-xl py-2.5 pr-9 pl-3 text-sm outline-none focus:border-[#C9A84C]"
          />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 no-scrollbar">
          {filterTabs.map(t => (
            <button
              key={t.id}
              onClick={() => setFilter(t.id)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors whitespace-nowrap ${
                filter === t.id ? 'bg-[#0D1B2A] text-[#C9A84C] border-[#0D1B2A]' : 'bg-white text-gray-500 border-[#EDE6D6]'
              }`}
            >
              {t.label} ({t.count})
            </button>
          ))}
        </div>

        {/* Threshold settings */}
        <button
          onClick={() => setShowSettings(v => !v)}
          className="mt-2 text-[11px] text-[#9B7A2F] font-semibold flex items-center gap-1"
        >
          <ChevronDown size={12} className={`transition-transform ${showSettings ? 'rotate-180' : ''}`} />
          מגדירים "מסתיימת בקרוב" כשנותרו {threshold} חיובים או פחות
        </button>
        {showSettings && (
          <div className="mt-2 bg-white rounded-xl p-3 border border-[#EDE6D6] flex items-center gap-3">
            <span className="text-xs text-gray-500 shrink-0">סף התראה (מס' חיובים שנותרו):</span>
            <input
              type="number"
              min={0}
              max={24}
              value={threshold}
              onChange={e => updateSettings({ hkExpiringThreshold: Math.max(0, Number(e.target.value) || 0) })}
              className="w-16 border border-[#EDE6D6] rounded-lg px-2 py-1 text-sm text-center outline-none focus:border-[#C9A84C]"
            />
          </div>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pb-24 md:pb-6">
        {list.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">אין הוראות קבע להצגה</div>
        ) : (
          <div className="space-y-2">
            {list.map((h, i) => {
              const status = getHkStatus(h, threshold);
              const fail = failByName[h.name];
              return (
                <div key={i} className={`bg-white rounded-xl p-3 border shadow-sm ${fail ? 'border-red-200' : 'border-[#EDE6D6]'}`}>
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-[#0D1B2A] truncate">{h.name}</div>
                      <div className="text-[11px] text-gray-500 mt-0.5">
                        חיוב אחרון: {h.lastBilled || '—'}
                      </div>
                    </div>
                    <div className="text-left shrink-0">
                      <div className="font-['Frank_Ruhl_Libre'] text-base font-bold text-[#9B7A2F]">₪{(Number(h.amount) || 0).toLocaleString()}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">לחודש</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-2">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${HK_STATUS_COLOR[status]}`}>
                      {HK_STATUS_LABEL[status]}{status !== 'expired' ? ` · נותרו ${h.remaining ?? '—'}` : ''}
                    </span>
                    {fail && (
                      <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-red-50 text-red-600 border border-red-200 flex items-center gap-1">
                        <AlertTriangle size={11} /> {fail.reason || 'כשל חיוב'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
