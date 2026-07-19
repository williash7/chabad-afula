import React, { useState } from 'react';
import { useAppStore } from '../store/AppContext';
import { MessageSquare, Phone, X, Edit, Calendar, PlusCircle, ClipboardList, RefreshCw, CalendarDays, MapPin, Navigation } from 'lucide-react';
import { format } from 'date-fns';
import { DonationModal } from './DonationModal';
import { MeetingModal } from './MeetingModal';
import { ThankYouModal } from './ThankYouModal';
import { DateConverterModal } from './DateConverterModal';
import { MergeContactsModal } from './MergeContactsModal';
import { HDate } from '@hebcal/core';
import { Link2 } from 'lucide-react';

export function ProfileModal({ name, onClose }: { name: string, onClose: () => void }) {
  const { donors, crm, updateCrm, refresh } = useAppStore();
  const [editingPhone, setEditingPhone] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [isEditingFields, setIsEditingFields] = useState(false);
  const [editedFields, setEditedFields] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDonationOpen, setIsDonationOpen] = useState(false);
  const [isMeetingOpen, setIsMeetingOpen] = useState(false);
  const [isDateConverterOpen, setIsDateConverterOpen] = useState(false);
  const [isMergeOpen, setIsMergeOpen] = useState(false);
  const [thankYouInfo, setThankYouInfo] = useState<{amount: number} | null>(null);
  
  const donor = donors[name] || { name, total: 0, donations: [], lastDate: '' };
  const crmData = crm[name] || { circle: 'far', target: false, phone: '' };

  // שדות "תאריך חשוב": יום הולדת (עברי/לועזי) ויארצייט/פטירה — כולל שדות
  // מרובים כמו "יארצייט אב" ו"יארצייט אם", כל שם עמודה שקיים בגיליון.
  const isYahrzeitKey = (k: string) => /יארצייט|יורצייט|פטירה|יום השנה/.test(k);
  const isBirthdayKey = (k: string) => k.includes('לידה');
  const isImportantDateKey = (k: string) => isYahrzeitKey(k) || isBirthdayKey(k);

  const convertDateToHebrew = (gregStr: string, fieldKey: string) => {
    try {
      let d = 0, m = 0, y = 0;
      // Try parsing as YYYY-MM-DD
      const isoMatch = String(gregStr).match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (isoMatch) {
        y = parseInt(isoMatch[1], 10);
        m = parseInt(isoMatch[2], 10) - 1;
        d = parseInt(isoMatch[3], 10);
      } else {
        // Try parsing DD/MM/YYYY or DD.MM.YYYY or DD-MM-YYYY
        const dmyMatch = String(gregStr).match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})$/);
        if (dmyMatch) {
          d = parseInt(dmyMatch[1], 10);
          m = parseInt(dmyMatch[2], 10) - 1;
          y = parseInt(dmyMatch[3], 10);
          if (y < 100) {
            y += y > 50 ? 1900 : 2000;
          }
        }
      }

      const isFutureOrValid = y >= 1900 && y <= 2100;
      
      if (isFutureOrValid && m >= 0 && m <= 11 && d > 0 && d <= 31) {
        const h = new HDate(new Date(y, m, d));
        let hebrewStr = h.render('he');
        // Remove year if it's not a specific full date we want to keep years for,
        // although for birthdays keeping the year is nice or optionally just the day/month
        // Let's just keep the full string.
        const targetKey = (fieldKey.includes('יארצייט') || fieldKey.includes('יורצייט')) ? 'יארצייט' : 'תאריך לידה עברי';
        setEditedFields(prev => ({ ...prev, [targetKey]: hebrewStr }));
        
        // Show success logic or auto-save? Just updating the state is fine.
        return;
      }
      alert('יש להזין תאריך בפורמט: DD/MM/YYYY או YYYY-MM-DD כדי להמיר.');
    } catch {
      alert('שגיאה בהמרת התאריך.');
    }
  };

  const handleFieldSave = async () => {
    setIsSaving(true);
    import('../lib/api').then(async ({ apiPost }) => {
      let changed = false;
      const reverseMapRaw = localStorage.getItem('reverseHeaderMap');
      const reverseHeaderMap = reverseMapRaw ? JSON.parse(reverseMapRaw) : {};
      
      const newCustomFields = { ...(crmData.customFields || {}) };

      for (const [field, value] of Object.entries(editedFields)) {
         const originalValue = (donor as any)[field] || newCustomFields[field] || '';
         if (originalValue !== value) {
            newCustomFields[field] = value;
            changed = true;
            
            // Still attempt to save to google sheets if it has a mapping
            if (reverseHeaderMap[field]) {
                const backendFieldKey = reverseHeaderMap[field];
                await apiPost('updateDonorField', { name, field: backendFieldKey, value });
            }

            // Update personal details sheet for dates
            if (field.includes('לידה') || field.includes('פטירה') || field.includes('יארצייט') || field.includes('יורצייט')) {
                await apiPost('updatePersonalDate', { name, field, value });
            }
         }
      }
      
      if (changed) {
         updateCrm(name, { customFields: newCustomFields });
         refresh();
      }
      setIsEditingFields(false);
      setIsSaving(false);
    });
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

  const setCircle = (circle: string) => {
    updateCrm(name, { circle });
  };

  const toggleTarget = () => {
    updateCrm(name, { target: !crmData.target });
  };

  const savePhone = () => {
    // Strip non-digits
    let cleanPhone = phoneInput.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '972' + cleanPhone.substring(1);
    }
    updateCrm(name, { phone: cleanPhone });
    
    import('../lib/api').then(({ apiPost }) => {
      const reverseMapRaw = localStorage.getItem('reverseHeaderMap');
      const reverseHeaderMap = reverseMapRaw ? JSON.parse(reverseMapRaw) : {};
      const backendFieldKey = reverseHeaderMap['טלפון'] || 'טלפון';
      apiPost('updateDonorField', { name, field: backendFieldKey, value: cleanPhone }).then(() => refresh());
    });
    
    setEditingPhone(false);
  };

  const resolvedPhone = (() => {
    const raw = crmData.phone || (donor as any)['טלפון'] || '';
    let n = String(raw).replace(/\D/g, '');
    if (n.startsWith('0')) n = '972' + n.substring(1);
    return n;
  })();

  const openWhatsApp = () => {
    if (!resolvedPhone) {
      setPhoneInput('');
      setEditingPhone(true);
      return;
    }
    window.open(`https://wa.me/${resolvedPhone}`, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[200] flex items-end md:items-center justify-center" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-[#FAF6EE] rounded-t-3xl md:rounded-3xl p-5 pb-10 md:pb-6 w-full max-w-[430px] md:max-w-2xl max-h-[92vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
        
        <div className="flex justify-between items-start mb-4">
           <button onClick={onClose} className="p-2 bg-white rounded-full shadow-sm">
             <X size={20} className="text-gray-500" />
           </button>
           <button
             onClick={() => setIsMergeOpen(true)}
             className="flex items-center gap-1.5 bg-white px-3 py-2 rounded-full shadow-sm text-xs font-bold text-gray-500 hover:text-[#0D1B2A] transition-colors"
             title="חיבור עם איש קשר כפול"
           >
             <Link2 size={14} /> מזג עם איש קשר אחר
           </button>
        </div>

        {/* Profile Header */}
        <div className="flex flex-col items-center mb-6">
          <div 
            className="w-[76px] h-[76px] rounded-full flex items-center justify-center font-['Frank_Ruhl_Libre'] text-3xl font-bold text-white mb-3"
            style={{ background: getAvatarColor(name) }}
          >
            {name.charAt(0)}
          </div>
          <h2 className="font-['Frank_Ruhl_Libre'] text-2xl font-bold text-[#0D1B2A]">{name}</h2>
          
          <div className="flex gap-2 mt-3 flex-wrap justify-center">
            {crmData.circle === 'close' && <span className="bg-green-100 text-green-800 rounded-full px-3 py-1 text-xs border border-green-200">⭐ קרוב</span>}
            {crmData.circle === 'approach' && <span className="bg-amber-100 text-amber-800 rounded-full px-3 py-1 text-xs border border-amber-200">🔄 מתקרב</span>}
            {crmData.circle === 'third' && <span className="bg-purple-100 text-purple-800 rounded-full px-3 py-1 text-xs border border-purple-200">⭕ מעגל שלישי</span>}
            {crmData.target && <span className="bg-blue-100 text-blue-800 rounded-full px-3 py-1 text-xs border border-blue-200">🎯 להקרב</span>}
            {donor.total > 5000 && <span className="bg-purple-100 text-purple-800 rounded-full px-3 py-1 text-xs border border-purple-200">💎 VIP</span>}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 bg-white rounded-2xl p-4 shadow-sm mb-5 divide-x-reverse divide-[#EDE6D6] divide-x">
          <div className="text-center px-2">
            <div className="font-['Frank_Ruhl_Libre'] text-xl font-bold text-[#0D1B2A]">₪{(donor.total||0).toLocaleString()}</div>
            <div className="text-[10px] text-gray-500">סהכ</div>
          </div>
          <div className="text-center px-2">
            <div className="font-['Frank_Ruhl_Libre'] text-xl font-bold text-[#0D1B2A]">{donor.donations?.length || 0}</div>
            <div className="text-[10px] text-gray-500">תרומות</div>
          </div>
          <div className="text-center px-2">
            <div className="font-['Frank_Ruhl_Libre'] text-sm font-bold text-[#0D1B2A] mt-1 line-clamp-1">{donor.lastDate || '—'}</div>
            <div className="text-[10px] text-gray-500 mt-0.5">אחרונה</div>
          </div>
        </div>

        {/* Important dates: birthdays + parents' yahrzeits */}
        {(() => {
          const combined = { ...donor, ...(crmData.customFields || {}) };
          const dateKeys = Object.keys(combined).filter(k => isImportantDateKey(k) && (combined as any)[k]);
          if (dateKeys.length === 0) return null;
          return (
            <div className="bg-white rounded-2xl p-4 shadow-sm mb-5">
              <h3 className="font-['Frank_Ruhl_Libre'] text-lg font-bold text-[#0D1B2A] mb-3">📅 תאריכים חשובים</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {dateKeys.map(key => (
                  <div key={key} className="flex items-center gap-2.5 bg-[#FAF6EE] rounded-xl p-3 border border-[#EDE6D6]">
                    <span className="text-xl shrink-0">{isYahrzeitKey(key) ? '🕯️' : '🎂'}</span>
                    <div className="min-w-0">
                      <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wide truncate">{key}</div>
                      <div className="text-sm font-bold text-[#0D1B2A] truncate">{(combined as any)[key]}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Circles */}
        <h3 className="font-['Frank_Ruhl_Libre'] text-lg font-bold text-[#0D1B2A] mb-3">מעגל קשר</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          <button 
            onClick={() => setCircle('close')}
            className={`p-3 rounded-xl border-2 text-center transition-colors ${crmData.circle === 'close' ? 'bg-[#D1FAE5] border-[#10B981]' : 'bg-white border-[#EDE6D6]'}`}
          >
            <span className="block text-xl mb-1">⭐</span>
            <span className="text-xs font-semibold text-[#0D1B2A]">קרוב</span>
          </button>
          <button 
            onClick={() => setCircle('approach')}
            className={`p-3 rounded-xl border-2 text-center transition-colors ${crmData.circle === 'approach' ? 'bg-[#FEF3C7] border-[#F59E0B]' : 'bg-white border-[#EDE6D6]'}`}
          >
            <span className="block text-xl mb-1">🔄</span>
            <span className="text-xs font-semibold text-[#0D1B2A]">מתקרב</span>
          </button>
          <button 
            onClick={() => setCircle('third')}
            className={`p-3 rounded-xl border-2 text-center transition-colors ${crmData.circle === 'third' ? 'bg-[#EDE9FE] border-[#8B5CF6]' : 'bg-white border-[#EDE6D6]'}`}
          >
            <span className="block text-xl mb-1">⭕</span>
            <span className="text-xs font-semibold text-[#0D1B2A]">מעגל 3</span>
          </button>
          <button 
            onClick={() => setCircle('far')}
            className={`p-3 rounded-xl border-2 text-center transition-colors ${crmData.circle === 'far' ? 'bg-[#F3F4F6] border-[#9CA3AF]' : 'bg-white border-[#EDE6D6]'}`}
          >
            <span className="block text-xl mb-1">○</span>
            <span className="text-xs font-semibold text-[#0D1B2A]">רחוק</span>
          </button>
        </div>

        {/* Target Toggle */}
        <div 
          onClick={toggleTarget}
          className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between mb-5 cursor-pointer"
        >
           <div>
             <div className="text-sm font-bold text-[#0D1B2A]">🎯 רוצה להקרב</div>
             <div className="text-[11px] text-gray-500 mt-0.5">המערכת תייצר משימות ותזכורות אוטומטיות לחיזוק הקשר</div>
           </div>
           <div className={`w-[46px] h-[26px] rounded-full relative transition-colors shrink-0 ${crmData.target ? 'bg-[#C9A84C]' : 'bg-[#EDE6D6]'}`}>
             <div className={`w-[22px] h-[22px] bg-white rounded-full absolute top-[2px] shadow flex transition-all ${crmData.target ? 'left-[2px]' : 'right-[2px]'}`} />
           </div>
        </div>

        {/* Actions */}
        {(() => {
          const address = (donor as any)['כתובת'] || crmData.customFields?.['כתובת'] || '';
          const mapsUrl = address
            ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address + ' עפולה')}`
            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ' עפולה')}`;
          return (
            <div className="grid grid-cols-2 gap-3 mb-5">
              <button onClick={openWhatsApp} className="bg-green-50 text-green-700 border border-green-200 rounded-xl p-3 flex flex-col items-center justify-center gap-1 font-semibold text-sm">
                <MessageSquare size={18} />
                WhatsApp
              </button>
              <button onClick={() => resolvedPhone ? window.open(`tel:${resolvedPhone}`) : setEditingPhone(true)} className="bg-blue-50 text-blue-700 border border-blue-200 rounded-xl p-3 flex flex-col items-center justify-center gap-1 font-semibold text-sm">
                <Phone size={18} />
                התקשר
              </button>
              <button onClick={() => setIsDonationOpen(true)} className="bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D] rounded-xl p-3 flex flex-col items-center justify-center gap-1 font-semibold text-sm">
                <PlusCircle size={18} />
                תרומה
              </button>
              <button onClick={() => setIsMeetingOpen(true)} className="bg-purple-50 text-purple-700 border border-purple-200 rounded-xl p-3 flex flex-col items-center justify-center gap-1 font-semibold text-sm">
                <ClipboardList size={18} />
                מפגש
              </button>
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="col-span-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl p-3 flex items-center justify-center gap-2 font-semibold text-sm hover:bg-blue-100 transition-colors"
              >
                <Navigation size={18} />
                {address ? `נווט לכתובת: ${address}` : 'חיפוש כתובת במפה'}
              </a>
            </div>
          );
        })()}

        {/* Dynamic Fields Details */}
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-['Frank_Ruhl_Libre'] text-lg font-bold text-[#0D1B2A]">פרטים ומידע מלאים</h3>
            <button 
              onClick={() => {
                const init: Record<string, string> = {};
                const combined = { ...donor, ...(crmData.customFields || {}) };
                Object.keys(combined).filter(k => !['name','total','donations','lastDate'].includes(k) && !/^\d+$/.test(k)).forEach(k => {
                  init[k] = (combined as any)[k] || '';
                });
                // Ensure common fields are at least suggested if missing
                const common = ['טלפון', 'כתובת', 'תאריך לידה', 'תאריך לידה עברי', 'יארצייט', 'שם זוג', 'תפילין', 'מזוזות', 'פורים', 'פסח', 'ל"ג בעומר', 'שבועות', 'ראש השנה', 'סוכות', 'חנוכה', 'י"א ניסן'];
                common.forEach(c => {
                  if (init[c] === undefined) init[c] = '';
                });
                setEditedFields(init);
                setIsEditingFields(true);
              }}
              className="bg-[#C9A84C]/10 text-[#9B7A2F] px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors hover:bg-[#C9A84C]/20"
            >
              <Edit size={14} /> ערוך הכל
            </button>
          </div>
          <div className="grid grid-cols-1 gap-y-3">
            {(() => {
               const combined = { ...donor, ...(crmData.customFields || {}) };
               // תאריכי לידה/יארצייט כבר מוצגים למעלה בכרטיס "תאריכים חשובים" — לא כופלים אותם כאן
               const keys = Object.keys(combined).filter(k => !['name','total','donations','lastDate'].includes(k) && !/^\d+$/.test(k) && !isImportantDateKey(k));
               const isAddressKey = (k: string) => ['כתובת', 'address', 'רחוב', 'עיר'].some(t => k.toLowerCase().includes(t));
               const openInMaps = (addr: string) => {
                 window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr + ' עפולה')}`, '_blank');
               };
               if (keys.length > 0) {
                 return keys.map(key => {
                   const val = (combined as any)[key] || '';
                   const isAddr = isAddressKey(key);
                   return (
                     <div key={key} className="flex flex-col border-b border-gray-50 pb-2.5 last:border-0 last:pb-0">
                       <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">{key}</span>
                       <div className="flex items-center justify-between gap-2">
                         <span className="text-[13px] font-medium text-[#0D1B2A] leading-relaxed flex-1">{val || '—'}</span>
                         {isAddr && val && (
                           <button
                             onClick={() => openInMaps(val)}
                             className="shrink-0 flex items-center gap-1 bg-blue-50 text-blue-600 px-2.5 py-1 rounded-lg text-[11px] font-bold hover:bg-blue-100 transition-colors"
                           >
                             <MapPin size={12} /> מפה
                           </button>
                         )}
                       </div>
                     </div>
                   );
                 });
               } else {
                 return (
                   <div className="text-center py-6">
                     <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-2 text-gray-300">
                       <Calendar size={20} />
                     </div>
                     <p className="text-xs text-gray-400">אין עדיין מידע נוסף בגיליון.<br/>לחץ על ערוך כדי להוסיף.</p>
                   </div>
                 );
               }
            })()}
          </div>
        </div>

        {/* Dynamic Fields Edit Modal */}
        {isEditingFields && (
          <div className="fixed inset-0 bg-black/60 z-[220] flex items-center justify-center p-4 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && setIsEditingFields(false)}>
            <div className="bg-white rounded-2xl p-5 w-full max-w-sm max-h-[85vh] flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-xl text-[#0D1B2A]">עריכת מידע מלא</h3>
                <button onClick={() => setIsEditingFields(false)} className="text-gray-400 p-1 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>
              
              <div className="overflow-y-auto flex-1 pr-1 space-y-4 mb-5 custom-scrollbar">
                {Object.keys(editedFields).map(key => (
                  <div key={key} className="flex flex-col group">
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide group-focus-within:text-[#C9A84C] transition-colors">{key}</label>
                      {/* Only allow deleting non-standard fields in UI if they are empty */}
                      {!editedFields[key] && !['טלפון', 'כתובת'].includes(key) && (
                        <button 
                          onClick={() => {
                            const next = { ...editedFields };
                            delete next[key];
                            setEditedFields(next);
                          }}
                          className="text-[10px] text-red-300 hover:text-red-500"
                        >מחק</button>
                      )}
                    </div>
                    <div className="relative">
                      <input 
                        type="text"
                        value={editedFields[key] || ''}
                        onChange={e => setEditedFields(prev => ({ ...prev, [key]: e.target.value }))}
                        className={`w-full border-[1.5px] border-[#EDE6D6] rounded-xl py-2.5 text-sm focus:border-[#C9A84C] focus:ring-1 focus:ring-[#C9A84C]/20 outline-none transition-all pl-3 ${
                           ((key.includes('לידה') || key.includes('יארצייט') || key.includes('יורצייט')) && !key.includes('עברי') && editedFields[key]) ? 'pr-9' : 'pr-3.5'
                        }`}
                        placeholder={`הזן ${key}...`}
                      />
                      {((key.includes('לידה') || key.includes('יארצייט') || key.includes('יורצייט')) && !key.includes('עברי') && editedFields[key]) && (
                        <button 
                          onClick={() => convertDateToHebrew(editedFields[key], key)}
                          title="המר לעברי"
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#C9A84C] bg-white p-1 rounded-md transition-colors"
                        >
                          <RefreshCw size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                
                <div className="pt-2 border-t border-dashed border-gray-100 flex flex-col gap-2">
                  <button 
                    onClick={() => {
                      const name = prompt('שם השדה החדש (למשל: יום הולדת, שם האישה...):');
                      if (name && !editedFields[name]) {
                        setEditedFields(prev => ({ ...prev, [name]: '' }));
                      }
                    }}
                    className="flex items-center gap-2 text-xs font-bold text-[#9B7A2F] py-2 w-full justify-center bg-[#EDE6D6]/30 rounded-xl hover:bg-[#EDE6D6]/50 transition-colors"
                  >
                    + הוסף שדה חדש שלא מופיע
                  </button>
                  <button 
                    onClick={() => setIsDateConverterOpen(true)}
                    className="flex items-center gap-2 text-xs font-bold text-[#0D1B2A] py-2 w-full justify-center bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    <CalendarDays size={14} /> מחשבון משוכלל להמרת תאריכים
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                 <button 
                   onClick={handleFieldSave} 
                   disabled={isSaving}
                   className="w-full bg-[#0D1B2A] text-[#E8C97A] py-3.5 rounded-xl font-bold text-sm shadow-lg active:scale-[0.98] transition-transform disabled:opacity-70 flex items-center justify-center gap-2"
                 >
                   {isSaving ? (
                     <>
                       <RefreshCw className="animate-spin" size={16} /> שומר שינויים...
                     </>
                   ) : 'שמור את כל השינויים'}
                 </button>
                 <button onClick={() => setIsEditingFields(false)} className="w-full py-2.5 rounded-xl text-gray-400 text-sm font-medium">
                   חזור ללא שמירה
                 </button>
              </div>
            </div>
          </div>
        )}

        {/* History / Timeline */}
        {(() => {
          const events: any[] = [];
          (donor.donations || []).forEach((don: any) => events.push({ type: 'donation', date: don.date, data: don }));
          (donor.meetings || []).forEach((m: any) => events.push({ type: 'meeting', date: m.date, data: m }));
          
          events.sort((a, b) => {
            const dA = a.date ? new Date(a.date.split('/').reverse().join('-')) : new Date(0);
            const dB = b.date ? new Date(b.date.split('/').reverse().join('-')) : new Date(0);
            return dB.getTime() - dA.getTime();
          });

          if (events.length === 0) return null;

          return (
            <div className="bg-white rounded-2xl p-4 shadow-sm mb-5 relative">
              <h3 className="font-['Frank_Ruhl_Libre'] text-lg font-bold text-[#0D1B2A] mb-4">היסטוריה מלאה</h3>
              <div className="relative pr-5">
                <div className="absolute right-2.5 top-0 bottom-0 w-0.5 bg-[#EDE6D6]" />
                <div className="space-y-4">
                  {events.map((e, i) => (
                    <div key={i} className="relative">
                      <div className={`absolute -right-5 top-1.5 w-3 h-3 rounded-full border-2 border-white shadow-[0_0_0_3px_rgba(201,168,76,0.2)] ${e.type === 'donation' ? 'bg-[#C9A84C]' : 'bg-[#3B82F6]'}`} />
                      <div className="bg-white border border-[#EDE6D6] rounded-xl p-3 shadow-sm">
                        {e.type === 'donation' ? (
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="text-sm font-semibold text-[#0D1B2A]">💰 {e.data.purpose || 'תרומה'}</div>
                              <div className="text-[11px] text-gray-500 mt-1">{e.date} · {e.data.method} {e.data.notes ? `· ${e.data.notes}` : ''}</div>
                              <div className="font-['Frank_Ruhl_Libre'] font-bold text-[#9B7A2F] mt-1.5">₪{(e.data.amount || 0).toLocaleString()}</div>
                            </div>
                            <button 
                              onClick={() => {
                                setThankYouInfo({ amount: e.data.amount || 0 });
                              }}
                              className="text-green-600 bg-green-50 p-2 text-xs rounded-lg border border-green-100 hover:bg-green-100 transition-colors flex items-center gap-1 font-bold"
                              title="שלח הודעת הוקרה"
                            >
                              <MessageSquare size={14} /> הודעת תודה
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="text-sm font-semibold text-[#0D1B2A]">📝 מפגש — {e.data.meetType || ''}</div>
                            <div className="text-[11px] text-gray-500 mt-1">{e.date} {e.data.purpose ? `· ${e.data.purpose}` : ''}</div>
                            {e.data.notes && <div className="text-xs text-[#3B82F6] mt-1.5 leading-snug">{e.data.notes}</div>}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {/* WhatsApp Phone Modal */}
        {editingPhone && (
          <div className="fixed inset-0 bg-black/50 z-[210] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-5 w-full max-w-sm">
              <h3 className="font-bold text-lg mb-2">מספר טלפון ל-WhatsApp</h3>
              <p className="text-sm text-gray-500 mb-4">הכנס את מספר הטלפון פעם אחת (יישמר באפליקציה).</p>
              <input 
                type="tel"
                value={phoneInput}
                onChange={e => setPhoneInput(e.target.value)}
                placeholder="050-000-0000"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 mb-4 text-left"
                dir="ltr"
              />
              <div className="flex justify-end gap-2">
                 <button onClick={() => setEditingPhone(false)} className="px-4 py-2 rounded-lg text-gray-500">ביטול</button>
                 <button onClick={savePhone} className="bg-[#C9A84C] text-white px-4 py-2 rounded-lg font-bold">שמור</button>
              </div>
            </div>
          </div>
        )}

      </div>
      
      {isDonationOpen && <DonationModal onClose={() => setIsDonationOpen(false)} defaultName={name} />}
      {isMeetingOpen && <MeetingModal onClose={() => setIsMeetingOpen(false)} donorName={name} />}
      {isDateConverterOpen && <DateConverterModal onClose={() => setIsDateConverterOpen(false)} />}
      {isMergeOpen && <MergeContactsModal onClose={() => setIsMergeOpen(false)} presetName={name} onMerged={onClose} />}
      {thankYouInfo && <ThankYouModal donorName={name} amount={thankYouInfo.amount} phone={crmData.phone || ''} onClose={() => setThankYouInfo(null)} />}
    </div>
  );
}
