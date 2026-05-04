import React, { useState } from 'react';
import { useAppStore } from '../store/AppContext';
import { Search, Star, RefreshCw, Target, AlertTriangle, Plus, Users } from 'lucide-react';
import { Donor } from '../types';
import { ProfileModal } from './ProfileModal';

export function DonorsTab() {
  const { donors, hk, failures, crm, refresh } = useAppStore();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('total');
  const [selectedDonor, setSelectedDonor] = useState<string | null>(null);

  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [newContactName, setNewContactName] = useState('');

  const handleAddContactClick = () => {
    setIsAddContactOpen(true);
  };

  const submitNewContact = async () => {
    const name = newContactName.trim();
    if (!name) return;
    if (donors[name]) {
      alert('איש קשר בשם זה כבר קיים');
      return;
    }
    
    setIsAddContactOpen(false);
    setNewContactName('');
    
    const { apiPost, saveCRMData, getCRMData } = await import('../lib/api');
    await apiPost('updateDonorField', { name, field: 'מקור', value: 'אפליקציה' });
    
    // Also save an empty entry in local CRM to immediately display it in the list
    const currentCrm = getCRMData();
    saveCRMData({ ...currentCrm, [name]: { circle: 'far' } });
    
    refresh();
    setSelectedDonor(name);
  };

  const getAvatarColor = (name: string) => {
    const c = [
      'linear-gradient(135deg,#C9A84C,#9B7A2F)',
      'linear-gradient(135deg,#4A2E8C,#2D1B69)',
      'linear-gradient(135deg,#059669,#047857)',
      'linear-gradient(135deg,#DC2626,#991B1B)',
      'linear-gradient(135deg,#2563EB,#1D4ED8)',
      'linear-gradient(135deg,#D97706,#92400E)'
    ];
    let h = 0;
    for (let i = 0; i < name.length; i++) {
      h = (h * 31 + name.charCodeAt(i)) % c.length;
    }
    return c[Math.abs(h)];
  };

  const hkNames = new Set(hk.filter(h => h.active).map(h => h.name));
  const errNames = new Set(failures.map(f => f.name));
  
  let list: Donor[] = Object.values(donors);

  if (filter === 'close') list = list.filter(d => crm[d.name]?.circle === 'close');
  else if (filter === 'approach') list = list.filter(d => crm[d.name]?.circle === 'approach');
  else if (filter === 'third') list = list.filter(d => crm[d.name]?.circle === 'third');
  else if (filter === 'target') list = list.filter(d => crm[d.name]?.target);
  else if (filter === 'hk') list = list.filter(d => hkNames.has(d.name));
  else if (filter === 'errors') list = list.filter(d => errNames.has(d.name));

  if (search) {
    list = list.filter(d => d.name.toLowerCase().includes(search.toLowerCase()));
  }

  const getNearestDateDays = (d: Donor) => {
     let minDays = 365;
     const today = new Date();
     const gBday = (d as any)['תאריך לידה'] || (d as any)['יום הולדת'];
     if (gBday) {
        let day = 0, m = 0;
        const gStr = String(gBday);
        const isoMatch = gStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
        if (isoMatch) { m = parseInt(isoMatch[2]); day = parseInt(isoMatch[3]); }
        else {
           const match = gStr.match(/(\d{1,2})[\/\.-](\d{1,2})/);
           if (match) { day = parseInt(match[1]); m = parseInt(match[2]); }
        }
        if (day > 0 && m > 0 && day <= 31 && m <= 12) {
           const dateThisYear = new Date(today.getFullYear(), m - 1, day);
           if (dateThisYear < today) dateThisYear.setFullYear(today.getFullYear() + 1);
           const dist = Math.ceil((dateThisYear.getTime() - today.getTime()) / 86400000);
           if (dist < minDays) minDays = dist;
        }
     }
     
     // Very rough check if hebrew date exists and has a month, to give it *some* sorting bump
     // Ideally we'd use hebcal here like in HomeTab
     const hBday = String((d as any)['תאריך לידה עברי'] || '');
     const yahrzeit = String((d as any)['יארצייט'] || (d as any)['יורצייט'] || (d as any)['יום השנה'] || '');
     if (minDays === 365 && (hBday || yahrzeit)) {
        return 364; // push those with some hebrew dates up relative to those with none
     }
     
     return minDays;
  };

  list.sort((a, b) => {
    if (sort === 'total') return (b.total || 0) - (a.total || 0);
    if (sort === 'name') return a.name.localeCompare(b.name, 'he');
    if (sort === 'circle') {
       const w = { close: 4, approach: 3, third: 2, target: 1 };
       const wA = w[(crm[a.name] || {}).circle as keyof typeof w] || 0;
       const wB = w[(crm[b.name] || {}).circle as keyof typeof w] || 0;
       return wB - wA || (b.total || 0) - (a.total || 0);
    }
    if (sort === 'date') {
       return getNearestDateDays(a) - getNearestDateDays(b);
    }
    return 0;
  });

  return (
    <div className="animate-in fade-in pb-24">
      {/* Topbar */}
      <div className="bg-[#0D1B2A] px-4 py-3 pb-3 flex items-center justify-between sticky top-0 z-50 shadow-md">
        <div className="w-9 h-9 bg-gradient-to-br from-[#C9A84C] to-[#9B7A2F] rounded-lg flex items-center justify-center font-['Frank_Ruhl_Libre'] text-xl text-white font-black shrink-0">
          <Users size={20} />
        </div>
        <div className="flex-1 px-3">
          <div className="font-['Frank_Ruhl_Libre'] text-lg font-bold text-[#C9A84C]">אנשי קשר</div>
          <div className="text-[11px] text-white/45 mt-[1px]">{list.length} אנשי קשר</div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleAddContactClick}
            className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center text-white/80 shrink-0"
          >
            <Plus size={18} />
          </button>
          <button 
            onClick={refresh}
            className={`w-9 h-9 bg-white/10 rounded-full flex items-center justify-center text-white/80 shrink-0 transition-transform active:rotate-180 duration-500`}
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      <div className="p-4">
        {/* Search */}
        <div className="bg-white rounded-xl py-2.5 px-3.5 flex items-center gap-2.5 shadow-sm mb-4 border-[1.5px] border-transparent focus-within:border-[#C9A84C] transition-colors">
          <Search size={18} className="text-gray-400" />
          <input
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-sm text-[#0D1B2A]"
            placeholder="חיפוש לפי שם..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Sort & Filters */}
        <div className="flex gap-2 mb-3">
          <select 
             className="bg-white border border-[#EDE6D6] text-sm rounded-xl px-3 py-1.5 focus:outline-none focus:border-[#C9A84C] text-[#0D1B2A] font-medium shadow-sm w-full"
             value={sort}
             onChange={e => setSort(e.target.value)}
          >
            <option value="total">📝 מיון: לפי תרומה פוטנציאלית / סה"כ</option>
            <option value="name">📝 מיון: לפי שם (א׳-ת׳)</option>
            <option value="circle">📝 מיון: לפי מעגל קרבה</option>
            <option value="date">📝 מיון: לפי תאריכים קרובים</option>
          </select>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 mb-4 no-scrollbar">
          {[
            { id: 'all', label: 'הכל' },
            { id: 'close', label: '⭐ קרוב' },
            { id: 'approach', label: '🔄 מתקרב' },
            { id: 'third', label: '⭕ מ. שלישי' },
            { id: 'target', label: '🎯 להקרב' },
            { id: 'hk', label: 'הוק' },
            { id: 'errors', label: 'שגיאות' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium border-[1.5px] transition-colors ${
                filter === f.id
                  ? 'bg-[#0D1B2A] border-[#0D1B2A] text-[#C9A84C]'
                  : 'bg-white border-[#EDE6D6] text-gray-500'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* List */}
        {list.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <Search size={32} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">לא נמצאו אנשי קשר מתאימים</p>
          </div>
        ) : (
          <div className="space-y-2">
            {list.map(d => {
              const crmData = crm[d.name] || {};
              const isHk = hkNames.has(d.name);
              const isErr = errNames.has(d.name);
              return (
                <div 
                  key={d.name} 
                  className="bg-white rounded-xl p-3 flex items-center gap-3 shadow-sm active:scale-95 transition-transform cursor-pointer"
                  onClick={() => setSelectedDonor(d.name)}
                >
                  <div 
                    className="w-[42px] h-[42px] rounded-full flex justify-center items-center text-white font-['Frank_Ruhl_Libre'] font-bold text-lg shrink-0"
                    style={{ background: getAvatarColor(d.name) }}
                  >
                    {d.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-[#0D1B2A] truncate">{d.name}</div>
                    <div className="text-[11px] text-gray-500 mt-0.5 truncate">
                      {isHk && <span className="text-[#0D1B2A] font-medium mr-1">🔄 הוק</span>}
                      {isErr && <span className="text-red-500 font-medium mr-1">⚠️ שגיאה</span>}
                      {d.lastDate && <span>אחרונה: {d.lastDate}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {crmData.circle === 'close' && <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] bg-green-100 text-green-800">⭐</div>}
                    {crmData.circle === 'approach' && <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] bg-amber-100 text-amber-800">🔄</div>}
                    {crmData.circle === 'third' && <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] bg-purple-100 text-purple-800">⭕</div>}
                    {crmData.target && <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] bg-blue-100 text-blue-800 mr-1">🎯</div>}
                  </div>
                  <div className="text-left shrink-0 mr-2">
                    <div className="font-['Frank_Ruhl_Libre'] text-base font-bold text-[#9B7A2F]">₪{(d.total || 0).toLocaleString()}</div>
                    <div className="text-[10px] text-gray-500">סהכ</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      
      {selectedDonor && <ProfileModal name={selectedDonor} onClose={() => setSelectedDonor(null)} />}
      
      {isAddContactOpen && (
        <div className="fixed inset-0 bg-[#0D1B2A]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" dir="rtl">
          <div className="bg-[#FAF6EE] rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col pt-5">
              <h2 className="px-5 font-['Frank_Ruhl_Libre'] text-xl font-bold text-[#0D1B2A] mb-3">הוספת איש קשר חדש</h2>
              <div className="px-5 pb-5">
                 <input 
                   type="text" 
                   autoFocus
                   value={newContactName}
                   onChange={e => setNewContactName(e.target.value)}
                   onKeyDown={e => { if (e.key === 'Enter') submitNewContact(); }}
                   placeholder="שם ההתלמיד / איש הקשר"
                   className="w-full bg-white border border-[#EDE6D6] rounded-xl p-3 text-sm outline-none focus:border-[#C9A84C] mb-4 shadow-sm"
                 />
                 <div className="flex gap-2">
                   <button onClick={() => setIsAddContactOpen(false)} className="flex-1 py-2.5 text-gray-600 font-bold rounded-xl bg-gray-200 hover:bg-gray-300 transition-colors">ביטול</button>
                   <button 
                     onClick={submitNewContact} 
                     className="flex-1 py-2.5 bg-gradient-to-br from-[#C9A84C] to-[#9B7A2F] text-white font-bold rounded-xl shadow-md active:scale-95 transition-transform"
                   >
                     הוספה
                   </button>
                 </div>
              </div>
          </div>
        </div>
      )}
    </div>
  );
}
