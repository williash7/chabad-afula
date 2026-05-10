import React, { useState } from 'react';
import { useAppStore } from '../store/AppContext';
import { RefreshCw, Download, FileText, X, PieChart } from 'lucide-react';
import { Donor } from '../types';

export function ReportsTab() {
  const { summary, donations, donors, crm, refresh } = useAppStore();
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  if (!summary) return null;

  const total = summary.total || 1;
  const methods = Object.entries(summary.byMethod || {}).sort((a, b) => (b[1] as number) - (a[1] as number));

  const topDonors: Donor[] = (Object.values(donors) as Donor[])
    .sort((a: Donor, b: Donor) => (b.total || 0) - (a.total || 0))
    .slice(0, 8);
  const maxD = topDonors[0]?.total || 1;

  let close = 0, approach = 0, third = 0, target = 0;
  Object.values(crm).forEach((c: any) => {
    if (c.circle === 'close') close++;
    else if (c.circle === 'approach') approach++;
    else if (c.circle === 'third') third++;
    if (c.target) target++;
  });

  const uniquePurposes = Array.from(new Set(donations.map(d => d.purpose).filter(p => !!p)));
  const uniqueMethods = Array.from(new Set(donations.map(d => d.method).filter(m => !!m)));

  const downloadCSV = (title: string, data: any[]) => {
    if (data.length === 0) return alert('אין נתונים לדוח זה');
    const headers = ['שם תורם', 'תאריך', 'סכום', 'יעד/נישה', 'אפיק גבייה'];
    let csvContent = '﻿';
    csvContent += headers.join(',') + '\n';
    data.forEach(d => {
      const row = [
        `"${(d.name || '').replace(/"/g, '""')}"`,
        `"${d.date || ''}"`,
        d.amount || 0,
        `"${(d.purpose || '').replace(/"/g, '""')}"`,
        `"${(d.method || '').replace(/"/g, '""')}"`
      ];
      csvContent += row.join(',') + '\n';
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${title}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsExportMenuOpen(false);
  };

  return (
    <div className="animate-in fade-in pb-24 md:pb-6">
      <div className="bg-[#0D1B2A] px-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow-md">
        <div className="w-9 h-9 bg-gradient-to-br from-[#C9A84C] to-[#9B7A2F] rounded-lg flex items-center justify-center shrink-0 md:hidden">
          <PieChart size={18} className="text-white" />
        </div>
        <div className="flex-1 px-3 md:px-0">
          <div className="font-['Frank_Ruhl_Libre'] text-lg font-bold text-[#C9A84C]">דוחות</div>
          <div className="text-[11px] text-white/45 mt-[1px]">נתונים חיים</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExportMenuOpen(true)}
            className="flex items-center gap-1.5 px-3 h-9 bg-[#C9A84C] text-[#0D1B2A] rounded-full text-sm font-bold shadow-md transition-transform active:scale-95"
          >
            <Download size={14} />
            <span className="hidden sm:inline">הנפק דוח</span>
          </button>
          <button onClick={refresh} className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center text-white/80 shrink-0 transition-colors active:bg-white/20">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      <div className="p-4 md:p-6">
        {/* Summary KPIs — always 4-column row on desktop */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 md:mb-6">
          {[
            { emoji: '💰', label: 'סה"כ תרומות', value: `₪${(summary.total || 0).toLocaleString()}` },
            { emoji: '📅', label: 'החודש', value: `₪${(summary.thisMonthTotal || 0).toLocaleString()}` },
            { emoji: '👥', label: 'תורמים', value: String(summary.donorCount || 0) },
            { emoji: '🔄', label: 'הוראות קבע', value: String(summary.hkActive || 0) },
          ].map((item, i) => (
            <div key={i} className="bg-white rounded-xl p-4 shadow-sm text-center">
              <div className="text-2xl mb-1">{item.emoji}</div>
              <div className="font-['Frank_Ruhl_Libre'] text-lg font-bold text-[#0D1B2A]">{item.value}</div>
              <div className="text-[11px] text-gray-500 mt-0.5">{item.label}</div>
            </div>
          ))}
        </div>

        {/* Two-column grid on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Methods */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="font-['Frank_Ruhl_Libre'] text-base font-bold text-[#0D1B2A] mb-3">💰 לפי אפיק גבייה</div>
            <div className="space-y-2.5">
              {methods.map(([method, amount], i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div className="text-[11px] text-gray-500 w-20 shrink-0 text-right">{method}</div>
                  <div className="flex-1 h-2.5 bg-[#EDE6D6] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#C9A84C] to-[#9B7A2F] rounded-full"
                      style={{ width: `${Math.round((amount as number) / total * 100)}%` }}
                    />
                  </div>
                  <div className="text-xs font-semibold text-[#0D1B2A] w-[64px] shrink-0 text-left">
                    ₪{(amount as number).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Donors */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="font-['Frank_Ruhl_Libre'] text-base font-bold text-[#0D1B2A] mb-3">🏆 תורמים מובילים</div>
            <div className="space-y-2.5">
              {topDonors.map((d, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div className="text-[11px] text-gray-500 w-16 shrink-0 text-right truncate">{d.name.split(' ')[0]}</div>
                  <div className="flex-1 h-2.5 bg-[#EDE6D6] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#4A2E8C] to-[#6D28D9] rounded-full"
                      style={{ width: `${Math.round((d.total || 0) / maxD * 100)}%` }}
                    />
                  </div>
                  <div className="text-xs font-semibold text-[#0D1B2A] w-[64px] shrink-0 text-left">
                    ₪{(d.total || 0).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CRM Summary */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="font-['Frank_Ruhl_Libre'] text-base font-bold text-[#0D1B2A] mb-3">👥 מעגלי קשר</div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { emoji: '⭐', label: 'קרוב', count: close },
                { emoji: '🔄', label: 'מתקרב', count: approach },
                { emoji: '⭕', label: 'מעגל שלישי', count: third },
                { emoji: '🎯', label: 'להקרב', count: target },
              ].map((item, i) => (
                <div key={i} className="bg-[#FAF6EE] rounded-xl p-3 text-center">
                  <div className="text-xl mb-1">{item.emoji}</div>
                  <div className="font-['Frank_Ruhl_Libre'] text-2xl font-black text-[#0D1B2A]">{item.count}</div>
                  <div className="text-[11px] text-gray-500 mt-0.5">{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Monthly trend placeholder / extra stat */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="font-['Frank_Ruhl_Libre'] text-base font-bold text-[#0D1B2A] mb-3">📈 סטטיסטיקות</div>
            <div className="space-y-3">
              {[
                { label: 'ממוצע תרומה', value: donations.length ? `₪${Math.round((summary.total || 0) / donations.length).toLocaleString()}` : '—' },
                { label: 'מספר תרומות', value: String(donations.length) },
                { label: 'שיעור הוק מסך תורמים', value: summary.donorCount ? `${Math.round(((summary.hkActive || 0) / summary.donorCount) * 100)}%` : '—' },
              ].map((row, i) => (
                <div key={i} className="flex justify-between items-center border-b border-[#EDE6D6] pb-2 last:border-0 last:pb-0">
                  <span className="text-sm text-gray-600">{row.label}</span>
                  <span className="font-['Frank_Ruhl_Libre'] text-base font-bold text-[#0D1B2A]">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Export modal — centered on desktop */}
      {isExportMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[200] flex items-end md:items-center justify-center"
          onClick={e => e.target === e.currentTarget && setIsExportMenuOpen(false)}
        >
          <div className="bg-[#FAF6EE] rounded-t-3xl md:rounded-3xl p-5 pb-10 md:pb-6 w-full max-w-[430px] md:max-w-lg max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-5 md:hidden" />
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-['Frank_Ruhl_Libre'] text-xl font-bold text-[#0D1B2A] flex items-center gap-2">
                <FileText size={20} className="text-[#C9A84C]" /> הנפקת דוחות
              </h2>
              <button onClick={() => setIsExportMenuOpen(false)} className="p-2 bg-white rounded-full shadow-sm">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <h3 className="text-[#0D1B2A] font-bold mb-2">דוח כללי</h3>
                <button
                  onClick={() => downloadCSV('דוח_כולל', donations)}
                  className="w-full flex items-center justify-between bg-[#0D1B2A] text-white p-3 rounded-lg hover:bg-[#1A2E45] transition-colors"
                >
                  <span className="text-sm">הנפק דוח כולל (כל התרומות)</span>
                  <Download size={16} className="text-[#C9A84C]" />
                </button>
              </div>

              {uniquePurposes.length > 0 && (
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <h3 className="text-[#0D1B2A] font-bold mb-2">דוחות לפי יעדים / נישות</h3>
                  <div className="space-y-2">
                    {uniquePurposes.map((p, i) => (
                      <button
                        key={i}
                        onClick={() => downloadCSV(`דוח_${(p as string).replace(/\s+/g, '_')}`, donations.filter(d => d.purpose === p))}
                        className="w-full flex items-center justify-between text-[#0D1B2A] bg-gray-50 p-2.5 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <span className="text-sm truncate pl-2">{p as string}</span>
                        <Download size={14} className="text-gray-500 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {uniqueMethods.length > 0 && (
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <h3 className="text-[#0D1B2A] font-bold mb-2">דוחות לפי אפיק גבייה</h3>
                  <div className="space-y-2">
                    {uniqueMethods.map((m, i) => (
                      <button
                        key={i}
                        onClick={() => downloadCSV(`דוח_${(m as string).replace(/\s+/g, '_')}`, donations.filter(d => d.method === m))}
                        className="w-full flex items-center justify-between text-[#0D1B2A] bg-gray-50 p-2.5 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <span className="text-sm truncate pl-2">{m as string}</span>
                        <Download size={14} className="text-gray-500 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
