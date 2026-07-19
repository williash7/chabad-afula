import React from 'react';
import { useAppStore } from '../store/AppContext';
import { Settings as SettingsIcon, RotateCcw } from 'lucide-react';
import { ALL_CIRCLES, CIRCLE_LABELS, DEFAULT_SETTINGS } from '../lib/settings';

export function SettingsTab() {
  const { settings, updateSettings, donors, visibleDonors } = useAppStore();

  const toggleCircle = (circle: string) => {
    const has = settings.visibleCircles.includes(circle);
    const next = has
      ? settings.visibleCircles.filter(c => c !== circle)
      : [...settings.visibleCircles, circle];
    updateSettings({ visibleCircles: next });
  };

  const total = Object.keys(donors).length;
  const visible = Object.keys(visibleDonors).length;

  const toggles: { key: keyof typeof settings; label: string; hint: string }[] = [
    { key: 'addressOnly', label: 'רק עם כתובת', hint: 'מציג רק אנשי קשר שיש להם כתובת מלאה — שימושי במיוחד למפה ולתכנון מסלולים' },
    { key: 'phoneOnly', label: 'רק עם טלפון', hint: 'מציג רק אנשי קשר עם מספר טלפון — שימושי לפני קמפיין שיחות/וואטסאפ' },
    { key: 'donorsOnly', label: 'רק מי שתרם בפועל', hint: 'מסתיר אנשי קשר שנוספו למערכת אך מעולם לא תרמו' },
    { key: 'targetOnly', label: 'רק מסומנים "🎯 להקרב"', hint: 'מציג רק אנשי קשר שסימנת שברצונך להתקרב אליהם' },
  ];

  return (
    <div className="animate-in fade-in pb-24 md:pb-6">
      {/* Topbar */}
      <div className="bg-[#0D1B2A] px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-50 shadow-md">
        <div className="w-9 h-9 bg-gradient-to-br from-[#C9A84C] to-[#9B7A2F] rounded-lg flex items-center justify-center shrink-0 md:hidden">
          <SettingsIcon size={20} className="text-white" />
        </div>
        <div className="flex-1 px-3 md:px-0">
          <div className="font-['Frank_Ruhl_Libre'] text-lg font-bold text-[#C9A84C]">הגדרות</div>
          <div className="text-[11px] text-white/45 mt-[1px]">קובעות מה יוצג בכל מסכי האפליקציה</div>
        </div>
        <button
          onClick={() => updateSettings(DEFAULT_SETTINGS)}
          className="flex items-center gap-1.5 px-3 h-9 bg-white/10 text-white/80 rounded-full text-xs font-bold shrink-0 hover:bg-white/20 transition-colors"
        >
          <RotateCcw size={13} /> איפוס
        </button>
      </div>

      <div className="p-4 md:p-6 max-w-2xl space-y-5">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#EDE6D6]">
          <div className="text-sm text-gray-600">
            מציג <span className="font-bold text-[#0D1B2A]">{visible}</span> מתוך <span className="font-bold text-[#0D1B2A]">{total}</span> אנשי קשר
          </div>
          <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
            ההגדרות האלה קובעות אילו אנשי קשר מופיעים ברשימות ובהמלצות בכל האפליקציה (אנשי קשר, דשבורד, דוחות, הזמנות לחג, נוכחות באירועים). הן <b>לא</b> משפיעות על הסכומים הכספיים והדוחות, ותמיד אפשר למצוא כל איש קשר בעת הוספת תרומה או מפגש.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#EDE6D6]">
          <h3 className="font-['Frank_Ruhl_Libre'] text-lg font-bold text-[#0D1B2A] mb-1">מעגל קרבה</h3>
          <p className="text-[11px] text-gray-400 mb-3">אילו רמות קשר להציג</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ALL_CIRCLES.map(circle => {
              const active = settings.visibleCircles.includes(circle);
              return (
                <button
                  key={circle}
                  onClick={() => toggleCircle(circle)}
                  className={`p-3 rounded-xl border-2 text-center text-sm font-semibold transition-colors ${
                    active ? 'bg-[#D1FAE5] border-[#10B981] text-[#0D1B2A]' : 'bg-white border-[#EDE6D6] text-gray-400'
                  }`}
                >
                  {CIRCLE_LABELS[circle]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#EDE6D6] space-y-4">
          <div>
            <h3 className="font-['Frank_Ruhl_Libre'] text-lg font-bold text-[#0D1B2A]">סינונים נוספים</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">כמה רעיונות נוספים שיכולים לעזור</p>
          </div>
          {toggles.map(t => (
            <div key={t.key as string} onClick={() => updateSettings({ [t.key]: !settings[t.key] } as any)} className="flex items-center justify-between gap-3 cursor-pointer">
              <div className="min-w-0">
                <div className="text-sm font-bold text-[#0D1B2A]">{t.label}</div>
                <div className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{t.hint}</div>
              </div>
              <div className={`w-[46px] h-[26px] rounded-full relative transition-colors shrink-0 ${settings[t.key] ? 'bg-[#C9A84C]' : 'bg-[#EDE6D6]'}`}>
                <div className={`w-[22px] h-[22px] bg-white rounded-full absolute top-[2px] shadow flex transition-all ${settings[t.key] ? 'left-[2px]' : 'right-[2px]'}`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
