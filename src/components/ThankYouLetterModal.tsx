import React, { useRef, useState } from 'react';
import { X, Download, MessageSquare, Mail, Loader2 } from 'lucide-react';
import { toPng } from 'html-to-image';

interface Props {
  donorName: string;
  amount: number;
  date: string;
  phone?: string;
  email?: string;
  onClose: () => void;
}

type Lang = 'he' | 'en' | 'ru';

// טקסטים מתורגמים לתוכן המכתב עצמו (כרטיס העיצוב + הודעת השיתוף). ממשק
// המודל (כפתורים, תוויות השדות) נשאר בעברית בכוונה, כמו בשאר האפליקציה —
// רק תוכן המכתב שנשלח לתורם משתנה לפי השפה הנבחרת.
const LETTER_TEXT: Record<Lang, {
  dir: 'rtl' | 'ltr';
  locale: string;
  certTitle: string;
  toLabel: string;
  thanksLine: string;
  regards: string;
  team: string;
  body: (donorName: string, amount: number, date: string) => string;
}> = {
  he: {
    dir: 'rtl',
    locale: 'he-IL',
    certTitle: 'תעודת הוקרה ותודה',
    toLabel: 'לכבוד',
    thanksLine: 'על תרומתך הנדיבה, המוקדשת מעומק הלב לטובת פעילות בית חב"ד עפולה והקהילה',
    regards: 'בברכה,',
    team: 'צוות בית חב"ד עפולה',
    body: (donorName, amount, date) =>
      `לכבוד ${donorName},\n\nברצוננו להביע תודה עמוקה על תרומתך הנדיבה בסך ₪${amount.toLocaleString()}, שהתקבלה בתאריך ${date}.\nתרומתך תורמת רבות לפעילות בית חב"ד עפולה ולקהילה כולה.\nיהי רצון שתתברך/י בכל הברכות הטובות!\n\nבברכה,\nצוות בית חב"ד עפולה`,
  },
  en: {
    dir: 'ltr',
    locale: 'en-US',
    certTitle: 'Certificate of Appreciation',
    toLabel: 'Dear',
    thanksLine: 'For your generous donation, given wholeheartedly in support of Chabad Afula and our community',
    regards: 'Warm regards,',
    team: 'The Chabad Afula Team',
    body: (donorName, amount, date) =>
      `Dear ${donorName},\n\nWe want to express our deep gratitude for your generous donation of ₪${amount.toLocaleString()}, received on ${date}.\nYour contribution greatly supports the activities of Chabad Afula and the entire community.\nMay you be blessed with all good blessings!\n\nWarm regards,\nThe Chabad Afula Team`,
  },
  ru: {
    dir: 'ltr',
    locale: 'ru-RU',
    certTitle: 'Благодарственная грамота',
    toLabel: 'Уважаем(ый/ая)',
    thanksLine: 'За ваше щедрое пожертвование от всего сердца в поддержку общины Хабад Афула',
    regards: 'С уважением,',
    team: 'Команда Хабад Афула',
    body: (donorName, amount, date) =>
      `Уважаем(ый/ая) ${donorName},\n\nМы хотим выразить глубокую благодарность за ваше щедрое пожертвование в размере ₪${amount.toLocaleString()}, полученное ${date}.\nВаш вклад значительно поддерживает деятельность общины Хабад Афула и всей общины.\nПусть вас благословят во всем!\n\nС уважением,\nКоманда Хабад Афула`,
  },
};

// מכתב תודה מעוצב (תעודת הוקרה) לתרומה ספציפית — שם, סכום ותאריך מתעדכנים
// אוטומטית מהתרומה שממנה נפתח. אפשר לבחור שפת תוכן (עברית/אנגלית/רוסית),
// להוריד כתמונה, לשתף בוואטסאפ (Web Share עם קובץ במובייל, ואם לא נתמך —
// הורדה + פתיחת שיחת וואטסאפ עם טקסט) או לשלוח במייל (mailto עם נושא וגוף
// מוכנים; יש לצרף את התמונה שהורדה ידנית, כי לינק mailto לא יכול לצרף
// קבצים בדפדפן).
//
// לוגו: כדי להציג תמונת לוגו במקום העיגול עם "ח", יש לשמור קובץ תמונה
// בשם "logo.png" בתיקיית public/ (כלומר בנתיב public/logo.png). האפליקציה
// טוענת אותו אוטומטית מהנתיב "/logo.png"; אם הקובץ לא קיים, מוצג העיגול
// הדקורטיבי הרגיל כברירת מחדל.
export function ThankYouLetterModal({ donorName, amount, date, phone, email, onClose }: Props) {
  const letterRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<'download' | 'whatsapp' | 'email' | null>(null);
  const [emailInput, setEmailInput] = useState(email || '');
  const [phoneInput, setPhoneInput] = useState(phone || '');
  const [downloaded, setDownloaded] = useState(false);
  const [lang, setLang] = useState<Lang>('he');
  const [logoOk, setLogoOk] = useState(true);

  const t = LETTER_TEXT[lang];

  const today = new Date();
  const displayDate = date || today.toLocaleDateString(t.locale);

  const bodyText = t.body(donorName, amount, displayDate);

  const renderImage = async (): Promise<string> => {
    if (!letterRef.current) throw new Error('no ref');
    return toPng(letterRef.current, {
      width: 900,
      height: 1276,
      pixelRatio: 2,
      backgroundColor: '#FAF6EE',
      fontEmbedCSS: '',
      style: { transform: 'none', margin: '0' },
    });
  };

  const downloadImage = async () => {
    setBusy('download');
    try {
      const dataUrl = await renderImage();
      const link = document.createElement('a');
      link.download = `מכתב-תודה-${donorName}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setDownloaded(true);
    } catch (e) {
      console.error(e);
      alert('שגיאה ביצירת התמונה');
    } finally {
      setBusy(null);
    }
  };

  const sendWhatsapp = async () => {
    setBusy('whatsapp');
    try {
      const dataUrl = await renderImage();
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `todah-${donorName}.png`, { type: 'image/png' });

      // Web Share API עם קובץ — עובד בעיקר בדפדפני מובייל, ופותח את חלונית
      // השיתוף המערכתית שבה אפשר לבחור WhatsApp ישירות עם התמונה מצורפת.
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'מכתב תודה', text: bodyText });
        return;
      }

      // נפילה חזרה: מורידים את התמונה למכשיר ופותחים שיחת וואטסאפ עם הטקסט
      // (יש לצרף את התמונה שהורדה ידנית, כי לינק wa.me לא תומך בצירוף קבצים).
      const link = document.createElement('a');
      link.download = `מכתב-תודה-${donorName}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      let p = (phoneInput || '').replace(/\D/g, '');
      if (p && p.startsWith('0')) p = '972' + p.substring(1);
      const url = p ? `https://wa.me/${p}?text=${encodeURIComponent(bodyText)}` : `https://wa.me/?text=${encodeURIComponent(bodyText)}`;
      window.open(url, '_blank');
    } catch (e) {
      console.error(e);
      alert('שגיאה בשיתוף');
    } finally {
      setBusy(null);
    }
  };

  const sendEmail = async () => {
    setBusy('email');
    try {
      await downloadImage();
      const subject = encodeURIComponent(`מכתב תודה — ${donorName}`);
      const body = encodeURIComponent(`${bodyText}\n\n(התמונה המעוצבת ירדה למכשיר — יש לצרף אותה להודעה)`);
      window.location.href = `mailto:${emailInput || ''}?subject=${subject}&body=${body}`;
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0D1B2A]/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4" dir="rtl">
      <div className="bg-[#FAF6EE] rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="flex justify-between items-center p-4 bg-white border-b border-[#EDE6D6] shrink-0">
          <h2 className="font-['Frank_Ruhl_Libre'] text-lg font-bold text-[#0D1B2A]">מכתב תודה מעוצב</h2>
          <button onClick={onClose} className="p-2 -m-2 text-gray-400 hover:text-gray-600 rounded-full transition-colors active:scale-95">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {/* Language selector */}
          <div className="mb-3">
            <label className="block text-[11px] font-bold text-gray-500 mb-1">שפת המכתב</label>
            <div className="flex gap-2">
              <button
                onClick={() => setLang('he')}
                className={`flex-1 py-2 px-3 rounded-xl border text-sm font-bold transition-colors ${lang === 'he' ? 'bg-[#C9A84C] text-white border-[#C9A84C]' : 'bg-white text-gray-600 border-[#EDE6D6] hover:border-[#C9A84C]'}`}
              >
                עברית
              </button>
              <button
                onClick={() => setLang('en')}
                className={`flex-1 py-2 px-3 rounded-xl border text-sm font-bold transition-colors ${lang === 'en' ? 'bg-[#C9A84C] text-white border-[#C9A84C]' : 'bg-white text-gray-600 border-[#EDE6D6] hover:border-[#C9A84C]'}`}
              >
                English
              </button>
              <button
                onClick={() => setLang('ru')}
                className={`flex-1 py-2 px-3 rounded-xl border text-sm font-bold transition-colors ${lang === 'ru' ? 'bg-[#C9A84C] text-white border-[#C9A84C]' : 'bg-white text-gray-600 border-[#EDE6D6] hover:border-[#C9A84C]'}`}
              >
                Русский
              </button>
            </div>
          </div>

          {/* Letter preview / capture target */}
          <div className="rounded-2xl overflow-hidden border border-[#EDE6D6] shadow-sm">
            <div
              ref={letterRef}
              style={{ width: 450, height: 638, direction: t.dir }}
              className="relative bg-[#FAF6EE] flex flex-col items-center justify-between p-8 mx-auto overflow-hidden"
            >
              {/* Decorative border */}
              <div className="absolute inset-3 border-2 border-[#C9A84C] rounded-xl pointer-events-none" />
              <div className="absolute inset-5 border border-[#C9A84C]/40 rounded-lg pointer-events-none" />

              <div className="relative z-10 flex flex-col items-center pt-4">
                {logoOk ? (
                  <img
                    src="/logo.png"
                    alt="לוגו"
                    onError={() => setLogoOk(false)}
                    className="w-14 h-14 rounded-full object-cover shadow-md"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="w-14 h-14 bg-gradient-to-br from-[#C9A84C] to-[#9B7A2F] rounded-full flex items-center justify-center font-['Frank_Ruhl_Libre'] text-2xl text-white font-black shadow-md">
                    ח
                  </div>
                )}
                <div className="font-['Frank_Ruhl_Libre'] text-sm font-bold text-[#9B7A2F] mt-2">בית חב"ד עפולה</div>
              </div>

              <div className="relative z-10 text-center flex-1 flex flex-col items-center justify-center gap-4 px-2">
                <div className="font-['Frank_Ruhl_Libre'] text-2xl font-black text-[#0D1B2A]">{t.certTitle}</div>
                <div className="text-sm text-[#3a3a3a] leading-relaxed">
                  {t.toLabel}<br />
                  <span className="font-['Frank_Ruhl_Libre'] text-xl font-bold text-[#0D1B2A] block mt-1 break-words max-w-[320px] mx-auto">{donorName}</span>
                </div>
                <div className="text-xs text-[#5a5a5a] leading-relaxed max-w-[320px]">
                  {t.thanksLine}
                </div>
                <div className="font-['Frank_Ruhl_Libre'] text-3xl font-black text-[#C9A84C] mt-1">₪{amount.toLocaleString()}</div>
                <div className="text-[11px] text-[#8a8a8a]">{displayDate}</div>
              </div>

              <div className="relative z-10 text-center pb-2">
                <div className="text-xs text-[#5a5a5a]">{t.regards}</div>
                <div className="font-['Frank_Ruhl_Libre'] text-sm font-bold text-[#0D1B2A]">{t.team}</div>
              </div>
            </div>
          </div>

          {/* Recipient fields */}
          <div className="mt-4 space-y-2">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 mb-1">טלפון לוואטסאפ (אופציונלי)</label>
              <input
                value={phoneInput}
                onChange={e => setPhoneInput(e.target.value)}
                placeholder="050-000-0000"
                dir="ltr"
                className="w-full bg-white border border-[#EDE6D6] rounded-xl px-3 py-2 text-sm outline-none focus:border-[#C9A84C]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 mb-1">אימייל (אופציונלי)</label>
              <input
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                placeholder="name@example.com"
                dir="ltr"
                className="w-full bg-white border border-[#EDE6D6] rounded-xl px-3 py-2 text-sm outline-none focus:border-[#C9A84C]"
              />
            </div>
            {downloaded && (
              <div className="text-[11px] text-emerald-600 font-semibold">✓ התמונה ירדה למכשיר — ניתן לצרף אותה ידנית להודעה</div>
            )}
          </div>
        </div>

        <div className="p-4 bg-white border-t border-[#EDE6D6] shrink-0 space-y-2">
          <button
            onClick={sendWhatsapp}
            disabled={busy !== null}
            className="w-full bg-[#25D366] hover:bg-[#20BE5C] disabled:opacity-60 text-white rounded-xl p-3 font-['Frank_Ruhl_Libre'] font-bold shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            {busy === 'whatsapp' ? <Loader2 size={18} className="animate-spin" /> : <MessageSquare size={18} />}
            שליחה ב-WhatsApp
          </button>
          <div className="flex gap-2">
            <button
              onClick={sendEmail}
              disabled={busy !== null}
              className="flex-1 bg-[#0D1B2A] hover:bg-[#16283d] disabled:opacity-60 text-white rounded-xl p-3 text-sm font-bold shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {busy === 'email' ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
              שליחה במייל
            </button>
            <button
              onClick={downloadImage}
              disabled={busy !== null}
              className="flex-1 bg-white border border-[#EDE6D6] hover:border-[#C9A84C] disabled:opacity-60 text-[#0D1B2A] rounded-xl p-3 text-sm font-bold transition-all flex items-center justify-center gap-2"
            >
              {busy === 'download' ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              הורדה
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
