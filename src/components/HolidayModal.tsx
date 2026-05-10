import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store/AppContext';
import { createHolidayDoc } from '../lib/api';
import { X, Check, MessageSquare, FileText, ExternalLink, Loader2 } from 'lucide-react';

export function HolidayModal({ holiday, onClose }: { holiday: any, onClose: () => void }) {
  const { holidayExtras, updateHolidayExtras, donors, crm, hk, failures } = useAppStore();
  const [inviteCategory, setInviteCategory] = useState('all');
  
  // Use either the real id or fallback to stringified name for custom holidays
  const id = holiday.id || holiday.name;
  const extra = holidayExtras[id] || { insights: {}, lastYear: {}, reminders: [], tasks: [] };

  const [isEditingInsights, setIsEditingInsights] = useState(false);
  const [isEditingLastYear, setIsEditingLastYear] = useState(false);
  const [isAddingReminder, setIsAddingReminder] = useState(false);
  const [addTaskText, setAddTaskText] = useState('');
  const [isCreatingDoc, setIsCreatingDoc] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const hDate = new Date(holiday.dateStr);
  const days = Math.ceil((hDate.getTime() - today.getTime()) / 86400000);

  const [insightForm, setInsightForm] = useState(extra.insights || { good: '', improve: '', plan: '' });
  const [lastYearForm, setLastYearForm] = useState(extra.lastYear || { donors: '', amount: '' });
  const [reminderForm, setReminderForm] = useState({ title: '', days: '7', wa: false });
  const [budgetForm, setBudgetForm] = useState<{expenses: any[], income: any[]}>(extra.budget || { expenses: [], income: [] });
  const [isEditingBudget, setIsEditingBudget] = useState(false);

  const [isInviting, setIsInviting] = useState(false);
  const [inviteText, setInviteText] = useState(`שלום פרטי,\nרצינו להזמין אותך ל${holiday.name}!\nנשמח מאוד לראותך השנה.\n\nלפרטים נוספים ואישור הגעה:\n`);

  const invitees = useMemo(() => {
    let list = Object.values(donors);
    if (inviteCategory !== 'all') {
      list = list.filter((d: any) => {
        const c = crm[d.name] || {};
        if (inviteCategory === 'target' && !c.target) return false;
        if (inviteCategory === 'hk') {
          const hasHk = hk.some((h: any) => h.name === d.name && h.active);
          if (!hasHk) return false;
        }
        if (inviteCategory === 'errors') {
          const hasError = failures.some((f: any) => f.name === d.name);
          if (!hasError) return false;
        }
        if (['close', 'approach', 'third', 'far'].includes(inviteCategory) && c.circle !== inviteCategory) return false;
        return true;
      });
    } else {
      list = list.filter((d: any) => {
        const c = crm[d.name] || {};
        return c.target || c.circle === 'close' || c.circle === 'approach' || c.circle === 'third';
      });
    }
    return list.sort((a: any, b: any) => {
      const cA = crm[a.name]?.circle;
      const cB = crm[b.name]?.circle;
      if (cA === 'close' && cB !== 'close') return -1;
      if (cB === 'close' && cA !== 'close') return 1;
      return 0;
    });
  }, [donors, crm]);

  const saveInsights = () => {
    updateHolidayExtras(id, { insights: insightForm });
    setIsEditingInsights(false);
  };

  const saveBudget = () => {
    updateHolidayExtras(id, { budget: budgetForm });
    setIsEditingBudget(false);
  };

  const saveLastYear = () => {
    updateHolidayExtras(id, { lastYear: lastYearForm });
    setIsEditingLastYear(false);
  };

  const saveReminder = () => {
    if (!reminderForm.title.trim()) return;
    const nextReminders = [...(extra.reminders || []), reminderForm];
    updateHolidayExtras(id, { reminders: nextReminders });
    setIsAddingReminder(false);
    setReminderForm({ title: '', days: '7', wa: false });
  };

  const handleCreateDoc = async () => {
    setIsCreatingDoc(true);
    setDocError(null);
    const dateLabel = hDate.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });
    const result = await createHolidayDoc(holiday.name, dateLabel);
    if (result) {
      const nextDocs = [...(extra.docs || []), { url: result.url, title: result.title, createdAt: new Date().toISOString() }];
      updateHolidayExtras(id, { docs: nextDocs });
      window.open(result.url, '_blank');
    } else {
      setDocError('לא ניתן ליצור מסמך. וודא שה-GAS מעודכן ויש חיבור לשרת.');
    }
    setIsCreatingDoc(false);
  };

  const deleteDoc = (idx: number) => {
    const nextDocs = [...(extra.docs || [])];
    nextDocs.splice(idx, 1);
    updateHolidayExtras(id, { docs: nextDocs });
  };

  const deleteReminder = (idx: number) => {
    const nextReminders = [...(extra.reminders || [])];
    nextReminders.splice(idx, 1);
    updateHolidayExtras(id, { reminders: nextReminders });
  };

  const toggleTask = (idx: number) => {
    const nextTasks = [...(extra.tasks || [])];
    nextTasks[idx].done = !nextTasks[idx].done;
    updateHolidayExtras(id, { tasks: nextTasks });
  };

  const addTask = () => {
    if (!addTaskText.trim()) return;
    const nextTasks = [...(extra.tasks || []), { text: addTaskText.trim(), done: false }];
    updateHolidayExtras(id, { tasks: nextTasks });
    setAddTaskText('');
  };

  // Derived relative donors
  const relDonors = Object.values(donors).filter((d: any) => {
    return d.donations?.some((don: any) => {
      if (!don.date) return false;
      const dDateStr = don.date.split('/').reverse().join('-');
      const dDate = new Date(dDateStr);
      return Math.abs(dDate.getTime() - hDate.getTime()) < 45 * 86400000;
    });
  }).slice(0, 5) as any[];

  return (
    <div className="fixed inset-0 bg-black/60 z-[200] flex items-end justify-center p-0 md:p-4 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-[#FAF6EE] rounded-t-3xl md:rounded-3xl p-5 pb-10 w-full max-w-[430px] max-h-[92vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">{holiday.hebrew || 'אירוע'}</div>
            <h2 className="font-['Frank_Ruhl_Libre'] text-2xl font-bold text-[#0D1B2A]">{holiday.name}</h2>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-200/50 rounded-full text-gray-500 hover:bg-gray-200">
            <X size={20} />
          </button>
        </div>

        <div className="bg-gradient-to-br from-[#2D1B69] to-[#4A2E8C] rounded-2xl p-4 text-white mb-5 flex items-center gap-4 relative overflow-hidden">
          <div className="text-4xl relative z-10">{holiday.emoji || '📅'}</div>
          <div className="flex-1 relative z-10">
            <div className="font-['Frank_Ruhl_Libre'] text-lg font-bold">{holiday.name}</div>
            <div className="text-xs text-white/60 mb-1">{hDate.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
            {holiday.desc && <div className="text-[11px] text-white/50">{holiday.desc}</div>}
          </div>
          <div className="bg-white/10 rounded-xl px-3 py-2 text-center shrink-0 relative z-10">
            <span className="font-['Frank_Ruhl_Libre'] text-2xl font-black block leading-none">{days > 0 ? days : 'X'}</span>
            <span className="text-[10px] text-white/50">{days > 0 ? 'ימים' : 'עבר'}</span>
          </div>
          <div className="absolute -left-2 -top-2 text-7xl opacity-5">✡</div>
        </div>

        {/* Reminders section */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-['Frank_Ruhl_Libre'] text-lg font-bold text-[#0D1B2A]">🔔 תזכורות</h3>
            <button onClick={() => setIsAddingReminder(!isAddingReminder)} className="text-xs font-bold text-[#9B7A2F] bg-[#C9A84C]/10 px-3 py-1.5 rounded-lg active:scale-95 transition-transform">+ הוסף</button>
          </div>
          
          {isAddingReminder && (
             <div className="bg-white rounded-xl p-4 shadow-sm mb-3 border border-[#EDE6D6]">
               <div className="space-y-3">
                 <div>
                   <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">כותרת התזכורת</label>
                   <input value={reminderForm.title} onChange={e => setReminderForm({...reminderForm, title: e.target.value})} type="text" className="w-full bg-white border border-[#EDE6D6] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#C9A84C]" placeholder="שלח הזמנות, הכן עלון..." />
                 </div>
                 <div>
                   <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">כמה לפני החג?</label>
                   <select value={reminderForm.days} onChange={e => setReminderForm({...reminderForm, days: e.target.value})} className="w-full bg-white border border-[#EDE6D6] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#C9A84C]">
                     <option value="7">שבוע</option>
                     <option value="14">שבועיים</option>
                     <option value="30">חודש</option>
                   </select>
                 </div>
                 <div className="flex items-center gap-2">
                   <input type="checkbox" checked={reminderForm.wa} onChange={e => setReminderForm({...reminderForm, wa: e.target.checked})} id="remWaCheck" />
                   <label htmlFor="remWaCheck" className="text-xs font-semibold text-[#0D1B2A]">שליחה ב-WhatsApp Business?</label>
                 </div>
                 <button onClick={saveReminder} className="w-full bg-[#0D1B2A] text-[#E8C97A] font-bold rounded-lg py-2 mt-2">שמור תזכורת</button>
               </div>
             </div>
          )}

          <div className="space-y-2">
            {extra.reminders?.length > 0 ? extra.reminders.map((r: any, i: number) => (
              <div key={i} className="bg-white rounded-xl p-3 shadow-sm flex items-center justify-between border-r-4 border-blue-400">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🔔</span>
                  <div>
                    <div className="text-sm font-bold text-[#0D1B2A]">{r.title}</div>
                    <div className="text-[11px] text-gray-500">{r.days} ימים לפני · {r.wa ? 'WhatsApp' : 'תזכורת בלבד'}</div>
                  </div>
                </div>
                <button onClick={() => deleteReminder(i)} className="text-red-400 hover:text-red-600 bg-red-50 p-2 rounded-lg"><X size={16}/></button>
              </div>
            )) : <div className="text-sm text-gray-400 text-center bg-gray-50 rounded-xl p-3">אין תזכורות למאורע זה</div>}
          </div>
        </div>

        {/* Tasks Section */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-['Frank_Ruhl_Libre'] text-lg font-bold text-[#0D1B2A]">📋 משימות</h3>
          </div>
          <div className="space-y-2 mb-3">
            {extra.tasks?.length > 0 ? extra.tasks.map((t: any, i: number) => (
              <div key={i} onClick={() => toggleTask(i)} className="bg-white rounded-xl p-3 shadow-sm flex items-center gap-3 cursor-pointer">
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${t.done ? 'bg-[#C9A84C] border-[#C9A84C]' : 'border-gray-300'}`}>
                  {t.done && <Check size={12} className="text-white" />}
                </div>
                <span className={`text-sm ${t.done ? 'text-gray-400 line-through' : 'text-[#0D1B2A]'}`}>{t.text}</span>
              </div>
            )) : null}
          </div>
          <div className="flex gap-2">
            <input value={addTaskText} onChange={e => setAddTaskText(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTask()} type="text" className="flex-1 bg-white border border-[#EDE6D6] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#C9A84C]" placeholder="משימה חדשה..." />
            <button onClick={addTask} className="bg-[#0D1B2A] rounded-xl px-4 text-[#E8C97A] font-bold shadow-sm">הוסף</button>
          </div>
        </div>

        {/* Invitations Section */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-['Frank_Ruhl_Libre'] text-lg font-bold text-[#0D1B2A]">✉️ שליחת הזמנות ב-WhatsApp</h3>
            <button onClick={() => setIsInviting(!isInviting)} className="text-xs font-bold text-[#9B7A2F] bg-[#C9A84C]/10 px-3 py-1.5 rounded-lg active:scale-95 transition-transform">{isInviting ? 'סגור' : 'הזמן מתפללים'}</button>
          </div>

          {isInviting && (
            <div className="bg-white rounded-xl p-4 shadow-sm mb-3 border border-[#EDE6D6]">
              <label className="block text-[11px] font-bold text-[#0D1B2A] uppercase mb-2">נוסח ההזמנה</label>
              <textarea 
                value={inviteText} 
                onChange={e => setInviteText(e.target.value)} 
                rows={4} 
                className="w-full bg-[#FAF6EE] border border-[#EDE6D6] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#C9A84C] resize-none mb-4" 
                placeholder="הכנס כאן את נוסח ההזמנה..."
              />
              
              <div className="text-[11px] font-bold text-gray-500 uppercase mb-2">שלח ל ({invitees.length}):</div>
              <div className="flex gap-2 overflow-x-auto pb-2 mb-3 no-scrollbar shrink-0">
                {[
                  { id: 'all', label: 'שורשי מוקדי' },
                  { id: 'close', label: '⭐ קרוב' },
                  { id: 'approach', label: '🔄 מתקרב' },
                  { id: 'third', label: '⭕ מ. שלישי' },
                  { id: 'target', label: '🎯 להקרב' },
                  { id: 'hk', label: 'הוק' },
                  { id: 'errors', label: 'שגיאות' }
                ].map(c => (
                  <button
                    key={c.id}
                    onClick={() => setInviteCategory(c.id)}
                    className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium border-[1.5px] transition-colors ${
                      inviteCategory === c.id
                        ? 'bg-[#0D1B2A] border-[#0D1B2A] text-[#C9A84C]'
                        : 'bg-white border-[#EDE6D6] text-gray-500'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                {invitees.map((d: any, i: number) => {
                  const circle = crm[d.name]?.circle;
                  const isTarget = crm[d.name]?.target;
                  return (
                    <div key={i} className="flex justify-between items-center bg-[#FAF6EE] rounded-lg p-2 border border-[#EDE6D6]">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-bold text-[#0D1B2A] truncate max-w-[150px]">{d.name}</div>
                        <div className="flex gap-1">
                          {circle === 'close' && <span className="text-[10px] bg-green-100 text-green-800 px-1.5 py-0.5 rounded-md">⭐</span>}
                          {circle === 'approach' && <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-md">🔄</span>}
                          {circle === 'third' && <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded-md">⭕</span>}
                          {isTarget && <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-md">🎯</span>}
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          let p = (crm[d.name]?.phone || '').replace(/\D/g, '');
                          if (p && p.startsWith('0')) p = '972' + p.substring(1);
                          const fn = d.name.trim().split(' ')[0] || d.name;
                          const msg = inviteText.replace('פרטי', fn);
                          const url = p ? `https://wa.me/${p}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
                          window.open(url, '_blank');
                        }}
                        className="bg-[#25D366]/10 text-[#25D366] p-2 rounded-lg hover:bg-[#25D366]/20 transition-colors flex items-center gap-1 font-bold text-[10px]"
                      >
                        <MessageSquare size={14} /> WhatsApp
                      </button>
                    </div>
                  );
                })}
                {invitees.length === 0 && (
                  <div className="text-center text-gray-500 text-xs py-4">אין מתפללים במעגלי הקרבה. תוכל להוסיף אותם בכרטיסיה אנשי קשר.</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Budget Section */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-['Frank_Ruhl_Libre'] text-lg font-bold text-[#0D1B2A]">💰 תכנון תקציב</h3>
            <button onClick={() => setIsEditingBudget(!isEditingBudget)} className="text-xs font-bold text-[#9B7A2F] bg-[#C9A84C]/10 px-3 py-1.5 rounded-lg active:scale-95 transition-transform">{isEditingBudget ? 'בטל' : 'עריכה ✏️'}</button>
          </div>

          {isEditingBudget ? (
            <div className="bg-white rounded-xl p-4 shadow-sm mb-3 border border-[#EDE6D6]">
              <div className="space-y-4">
                {/* Expenses */}
                <div>
                  <h4 className="text-xs font-bold text-[#0D1B2A] mb-2 border-b pb-1">הוצאות</h4>
                  {budgetForm.expenses.map((exp: any, i: number) => (
                    <div key={i} className="flex gap-2 mb-2 items-center">
                      <input value={exp.name} onChange={e => { const newE = [...budgetForm.expenses]; newE[i].name = e.target.value; setBudgetForm({...budgetForm, expenses: newE}) }} className="flex-1 bg-white border border-[#EDE6D6] rounded-md px-2 py-1 text-xs" placeholder="שם הוצאה" />
                      <input value={exp.planned} onChange={e => { const newE = [...budgetForm.expenses]; newE[i].planned = e.target.value; setBudgetForm({...budgetForm, expenses: newE}) }} className="w-16 bg-white border border-[#EDE6D6] rounded-md px-2 py-1 text-xs" type="number" placeholder="מתוכנן" />
                      <input value={exp.actual} onChange={e => { const newE = [...budgetForm.expenses]; newE[i].actual = e.target.value; setBudgetForm({...budgetForm, expenses: newE}) }} className="w-16 bg-white border border-[#EDE6D6] rounded-md px-2 py-1 text-xs" type="number" placeholder="בפועל" />
                      <button onClick={() => { const newE = [...budgetForm.expenses]; newE.splice(i, 1); setBudgetForm({...budgetForm, expenses: newE}) }} className="text-red-400"><X size={14} /></button>
                    </div>
                  ))}
                  <button onClick={() => setBudgetForm({...budgetForm, expenses: [...budgetForm.expenses, {name:'', planned:'', actual:''}]})} className="text-xs text-[#9B7A2F] font-bold">+ הוסף הוצאה</button>
                </div>

                {/* Income */}
                <div>
                  <h4 className="text-xs font-bold text-[#0D1B2A] mb-2 border-b pb-1">הכנסות מיועדות</h4>
                  {budgetForm.income.map((inc: any, i: number) => (
                    <div key={i} className="flex gap-2 mb-2 items-center">
                      <input value={inc.name} onChange={e => { const newI = [...budgetForm.income]; newI[i].name = e.target.value; setBudgetForm({...budgetForm, income: newI}) }} className="flex-1 bg-white border border-[#EDE6D6] rounded-md px-2 py-1 text-xs" placeholder="שם הכנסה" />
                      <input value={inc.planned} onChange={e => { const newI = [...budgetForm.income]; newI[i].planned = e.target.value; setBudgetForm({...budgetForm, income: newI}) }} className="w-16 bg-white border border-[#EDE6D6] rounded-md px-2 py-1 text-xs" type="number" placeholder="מתוכנן" />
                      <input value={inc.actual} onChange={e => { const newI = [...budgetForm.income]; newI[i].actual = e.target.value; setBudgetForm({...budgetForm, income: newI}) }} className="w-16 bg-white border border-[#EDE6D6] rounded-md px-2 py-1 text-xs" type="number" placeholder="בפועל" />
                      <button onClick={() => { const newI = [...budgetForm.income]; newI.splice(i, 1); setBudgetForm({...budgetForm, income: newI}) }} className="text-red-400"><X size={14} /></button>
                    </div>
                  ))}
                  <button onClick={() => setBudgetForm({...budgetForm, income: [...budgetForm.income, {name:'', planned:'', actual:''}]})} className="text-xs text-[#9B7A2F] font-bold">+ הוסף הכנסה</button>
                </div>
                
                <button onClick={saveBudget} className="w-full bg-[#0D1B2A] text-[#E8C97A] font-bold rounded-lg py-2 mt-2">שמור תקציב</button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm p-4 border border-[#EDE6D6]">
              {(() => {
                const exps = extra.budget?.expenses || [];
                const incs = extra.budget?.income || [];
                if (exps.length === 0 && incs.length === 0) {
                  return <div className="text-sm text-gray-400 text-center py-2">אין נתוני תקציב. לחץ על עריכה להוספה.</div>;
                }
                
                const totalExpPlan = exps.reduce((sum: number, e: any) => sum + (Number(e.planned) || 0), 0);
                const totalExpAct = exps.reduce((sum: number, e: any) => sum + (Number(e.actual) || 0), 0);
                const totalIncAct = incs.reduce((sum: number, i: any) => sum + (Number(i.actual) || 0), 0);
                
                return (
                  <div className="space-y-4">
                    {/* Summary row */}
                    <div className="grid grid-cols-3 gap-2 text-center border-b border-[#EDE6D6] pb-3">
                      <div>
                        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">הוצאות (בפועל)</div>
                        <div className="font-['Frank_Ruhl_Libre'] text-lg font-bold text-red-600">₪{totalExpAct.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">הכנסות (בפועל)</div>
                        <div className="font-['Frank_Ruhl_Libre'] text-lg font-bold text-green-600">₪{totalIncAct.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">מאזן</div>
                        <div className={`font-['Frank_Ruhl_Libre'] text-lg font-bold ${totalIncAct - totalExpAct >= 0 ? 'text-green-600' : 'text-red-600'}`} dir="ltr">₪{(totalIncAct - totalExpAct).toLocaleString()}</div>
                      </div>
                    </div>
                    
                    {/* Detailed list if not too many, or just a small summary */}
                    <div className="space-y-3">
                      {exps.length > 0 && (
                        <div>
                          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wide mb-1">פירוט הוצאות</div>
                          {exps.map((e: any, i: number) => (
                            <div key={i} className="flex justify-between text-xs py-1 border-b border-gray-50 last:border-0">
                              <span className="font-medium text-[#0D1B2A]">{e.name}</span>
                              <span className="text-gray-600">תכנון: ₪{e.planned || 0} | <span className="font-bold text-red-600">בפועל: ₪{e.actual || 0}</span></span>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {incs.length > 0 && (
                        <div>
                          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wide mb-1">פירוט הכנסות</div>
                          {incs.map((inc: any, i: number) => (
                            <div key={i} className="flex justify-between text-xs py-1 border-b border-gray-50 last:border-0">
                              <span className="font-medium text-[#0D1B2A]">{inc.name}</span>
                              <span className="text-gray-600">תכנון: ₪{inc.planned || 0} | <span className="font-bold text-green-600">בפועל: ₪{inc.actual || 0}</span></span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Last Year Stats Section */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-['Frank_Ruhl_Libre'] text-lg font-bold text-[#0D1B2A]">📈 שנה שעברה</h3>
            <button onClick={() => setIsEditingLastYear(!isEditingLastYear)} className="text-xs font-bold text-[#9B7A2F] bg-[#C9A84C]/10 px-3 py-1.5 rounded-lg active:scale-95 transition-transform">{isEditingLastYear ? 'בטל' : 'עדכון ✏️'}</button>
          </div>
          {isEditingLastYear ? (
             <div className="bg-white rounded-xl p-4 shadow-sm mb-3 border border-[#EDE6D6]">
               <div className="space-y-3">
                 <div>
                   <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">מספר תורמים</label>
                   <input value={lastYearForm.donors} onChange={e => setLastYearForm({...lastYearForm, donors: e.target.value})} type="number" className="w-full bg-white border border-[#EDE6D6] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#C9A84C]" placeholder="0" />
                 </div>
                 <div>
                   <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">סכום כולל (₪)</label>
                   <input value={lastYearForm.amount} onChange={e => setLastYearForm({...lastYearForm, amount: e.target.value})} type="number" className="w-full bg-white border border-[#EDE6D6] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#C9A84C]" placeholder="0" />
                 </div>
                 <button onClick={saveLastYear} className="w-full bg-[#0D1B2A] text-[#E8C97A] font-bold rounded-lg py-2 mt-2">שמור נתונים</button>
               </div>
             </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden flex divide-x divide-x-reverse divide-[#EDE6D6] border border-[#EDE6D6]">
              <div className="flex-1 p-3 flex items-center gap-3">
                <span className="text-2xl opacity-80">👥</span>
                <div>
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">תורמים שתרמו</div>
                  <div className="font-['Frank_Ruhl_Libre'] text-xl font-bold text-[#0D1B2A]">{extra.lastYear?.donors || '—'}</div>
                </div>
              </div>
              <div className="flex-1 p-3 flex items-center gap-3">
                <span className="text-2xl opacity-80">💰</span>
                <div>
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">סכום כולל (₪)</div>
                  <div className="font-['Frank_Ruhl_Libre'] text-xl font-bold text-[#0D1B2A]">{extra.lastYear?.amount ? Number(extra.lastYear.amount).toLocaleString() : '—'}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Insights Section */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-['Frank_Ruhl_Libre'] text-lg font-bold text-[#0D1B2A]">📝 תובנות וסיכום</h3>
            <button onClick={() => setIsEditingInsights(!isEditingInsights)} className="text-xs font-bold text-[#9B7A2F] bg-[#C9A84C]/10 px-3 py-1.5 rounded-lg active:scale-95 transition-transform">{isEditingInsights ? 'בטל' : 'עריכה ✏️'}</button>
          </div>
          {isEditingInsights ? (
             <div className="bg-white rounded-xl p-4 shadow-sm mb-3 border border-[#EDE6D6]">
               <div className="space-y-3">
                 <div>
                   <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1 flex items-center gap-1.5">✅ מה עבד טוב?</label>
                   <textarea value={insightForm.good} onChange={e => setInsightForm({...insightForm, good: e.target.value})} rows={2} className="w-full bg-white border border-[#EDE6D6] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#C9A84C] resize-none" placeholder="מה הצליח..."></textarea>
                 </div>
                 <div>
                   <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1 flex items-center gap-1.5">📈 מה לשפר?</label>
                   <textarea value={insightForm.improve} onChange={e => setInsightForm({...insightForm, improve: e.target.value})} rows={2} className="w-full bg-white border border-[#EDE6D6] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#C9A84C] resize-none" placeholder="מה אפשר לעשות טוב יותר..."></textarea>
                 </div>
                 <div>
                   <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1 flex items-center gap-1.5">🗓️ תוכנית לשנה הבאה</label>
                   <textarea value={insightForm.plan} onChange={e => setInsightForm({...insightForm, plan: e.target.value})} rows={2} className="w-full bg-white border border-[#EDE6D6] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#C9A84C] resize-none" placeholder="רעיונות, תוכניות..."></textarea>
                 </div>
                 <button onClick={saveInsights} className="w-full bg-[#0D1B2A] text-[#E8C97A] font-bold rounded-lg py-2 mt-2">שמור תובנות</button>
               </div>
             </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm p-4 border border-[#EDE6D6] space-y-3">
              {extra.insights?.good || extra.insights?.improve || extra.insights?.plan ? (
                <>
                  {extra.insights?.good && (
                    <div className="flex gap-3">
                      <span className="text-lg">✅</span>
                      <div>
                        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">מה עבד טוב </div>
                        <div className="text-sm font-medium text-[#0D1B2A] mt-0.5">{extra.insights.good}</div>
                      </div>
                    </div>
                  )}
                  {extra.insights?.improve && (
                    <div className="flex gap-3 pt-3 border-t border-[#EDE6D6]">
                      <span className="text-lg">📈</span>
                      <div>
                        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">מה לשפר</div>
                        <div className="text-sm font-medium text-[#0D1B2A] mt-0.5">{extra.insights.improve}</div>
                      </div>
                    </div>
                  )}
                  {extra.insights?.plan && (
                    <div className="flex gap-3 pt-3 border-t border-[#EDE6D6]">
                      <span className="text-lg">🗓️</span>
                      <div>
                        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">תוכנית לשנה הבאה</div>
                        <div className="text-sm font-medium text-[#0D1B2A] mt-0.5">{extra.insights.plan}</div>
                      </div>
                    </div>
                  )}
                </>
              ) : <div className="text-sm text-gray-400 text-center py-2">לחץ עריכה להוספת תובנות</div>}
            </div>
          )}
        </div>

        {/* Documents Section */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-['Frank_Ruhl_Libre'] text-lg font-bold text-[#0D1B2A]">📄 מסמכים</h3>
            <button
              onClick={handleCreateDoc}
              disabled={isCreatingDoc}
              className="text-xs font-bold text-[#9B7A2F] bg-[#C9A84C]/10 px-3 py-1.5 rounded-lg active:scale-95 transition-transform flex items-center gap-1.5 disabled:opacity-50"
            >
              {isCreatingDoc ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
              {isCreatingDoc ? 'יוצר...' : 'צור מסמך Google'}
            </button>
          </div>

          {docError && (
            <div className="bg-red-50 text-red-600 text-xs rounded-xl p-3 mb-3 border border-red-200">{docError}</div>
          )}

          <div className="space-y-2">
            {(extra.docs || []).length > 0 ? (extra.docs || []).map((doc: any, i: number) => (
              <div key={i} className="bg-white rounded-xl p-3 shadow-sm flex items-center justify-between border border-[#EDE6D6]">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText size={18} className="text-[#4285F4] shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-[#0D1B2A] truncate">{doc.title}</div>
                    <div className="text-[10px] text-gray-400">{new Date(doc.createdAt).toLocaleDateString('he-IL')}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-[#4285F4] bg-blue-50 p-2 rounded-lg hover:bg-blue-100">
                    <ExternalLink size={14} />
                  </a>
                  <button onClick={() => deleteDoc(i)} className="text-red-400 bg-red-50 p-2 rounded-lg hover:bg-red-100">
                    <X size={14} />
                  </button>
                </div>
              </div>
            )) : (
              <div className="text-sm text-gray-400 text-center bg-gray-50 rounded-xl p-3">
                לחץ "צור מסמך Google" ליצירת מסמך תכנון מקושר לחג
              </div>
            )}
          </div>
        </div>

        {/* Related Donors */}
        {relDonors.length > 0 && (
          <div>
            <h3 className="font-['Frank_Ruhl_Libre'] text-lg font-bold text-[#0D1B2A] mb-3">👥 תורמים קשורים מאזור התאריך</h3>
            <div className="space-y-2">
              {relDonors.map((d, i) => (
                <div key={i} className="bg-white rounded-xl p-3 border border-[#EDE6D6] flex justify-between items-center shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0D1B2A] to-[#1A2E45] text-white flex items-center justify-center font-bold text-xs">
                      {d.name?.charAt(0)}
                    </div>
                    <div className="text-sm font-bold text-[#0D1B2A]">{d.name}</div>
                  </div>
                  <div className="text-xs font-semibold text-[#9B7A2F]">₪{d.total?.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
