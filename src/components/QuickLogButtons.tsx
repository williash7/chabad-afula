import React, { useState } from 'react';
import { useAppStore } from '../store/AppContext';

// שני כפתורי תיעוד מהיר (טלפון / מפגש) — שמירה מיידית כמפגש דרך ה-API
// הקיים (addMeeting), בלי לפתוח שום טופס. משותף לכל מקום שמציג איש קשר
// שכדאי ליצור איתו קשר (אנשי קשר, משימות).
export function QuickLogButtons({ donorName, compact = false }: { donorName: string; compact?: boolean }) {
  const { refresh } = useAppStore();
  const [logged, setLogged] = useState<Record<string, number>>({});

  const handleQuickLog = async (meetType: 'טלפון' | 'אישית') => {
    setLogged(prev => ({ ...prev, [meetType]: Date.now() }));
    const { apiPost } = await import('../lib/api');
    const dateStr = new Date().toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    await apiPost('addMeeting', { name: donorName, date: dateStr, meetType, purpose: '', notes: '' });
    refresh();
  };

  const isRecent = (meetType: string) => !!logged[meetType] && Date.now() - logged[meetType] < 60000;
  const size = compact ? 'text-[11px] py-1.5' : 'text-xs py-1.5';

  return (
    <div className="flex gap-2">
      <button
        onClick={() => handleQuickLog('טלפון')}
        disabled={isRecent('טלפון')}
        className={`flex-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg font-bold flex items-center justify-center gap-1 active:scale-95 transition-transform disabled:opacity-60 ${size}`}
      >
        {isRecent('טלפון') ? '✓ נרשם' : '📞 שוחחתי'}
      </button>
      <button
        onClick={() => handleQuickLog('אישית')}
        disabled={isRecent('אישית')}
        className={`flex-1 bg-green-50 text-green-700 border border-green-200 rounded-lg font-bold flex items-center justify-center gap-1 active:scale-95 transition-transform disabled:opacity-60 ${size}`}
      >
        {isRecent('אישית') ? '✓ נרשם' : '🤝 נפגשנו'}
      </button>
    </div>
  );
}
