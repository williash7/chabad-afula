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

// מכתב תודה מעוצב (תעודת הוקרה) לתרומה ספציפית — שם, סכום ותאריך מתעדכנים
// אוטומטית מהתרומה שממנה נפתח. אפשר להוריד כתמונה, לשתף בוואטסאפ (Web Share
// עם קובץ במובייל, ואם לא נתמך — הורדה + פתיחת שיחת וואטסאפ עם טקסט) או
// לשלוח במייל (mailto עם נושא וגוף מוכנים; יש לצרף את התמונה שהורדה ידנית,
// כי לינק mailto לא יכול לצרף קבצים בדפדפן).
export function ThankYouLetterModal({ donorName, amount, date, phone, email, onClose }: Props) {
  const letterRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<'download' | 'whatsapp' | 'email' | null>(null);
  const [emailInput, setEmailInput] = useState(email || '');
  const [phoneInput, setPhoneInput] = useState(phone || '');
  const [downloaded, setDownloaded] = useState(false);

  const today = new Date();
  const displayDate = date || today.toLocaleDateString('he-IL');

  const bodyText = `לכבוד ${donorName},\n\nברצוננו להביע תודה עמוקה על תרומתך הנדיבה בסך ₪${amount.toLocaleString()}, שהתקבלה בתאריך ${displayDate}.\nתרומתך תורמת רבות לפעילות בית חב"ד עפולה ולקהילה כולה.\nיהי רצון שתתברך/י בכל הברכות הטובות!\n\nבברכה,\nצוות בית חב"ד עפולה`;

  const renderImage = async (): Promise<string> => {
    if (!letterRef.current) throw new Error('no ref');
    return toPng(letterRef.current, {
      width: 900,
      height: 1120,
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
          {/* Letter preview / capture target */}
          <div className="rounded-2xl overflow-hidden border border-[#EDE6D6] shadow-sm">
            <div
              ref={letterRef}
              style={{ width: 450, height: 560, direction: 'rtl' }}
              className="relative bg-[#FAF6EE] flex flex-col items-center justify-between p-8 mx-auto"
            >
              {/* Decorative border */}
              <div className="absolute inset-3 border-2 border-[#C9A84C] rounded-xl pointer-events-none" />
              <div className="absolute inset-5 border border-[#C9A84C]/40 rounded-lg pointer-events-none" />

              <div className="relative z-10 flex flex-col items-center pt-4">
                <div className="w-14 h-14 bg-gradient-to-br from-[#C9A84C] to-[#9B7A2F] rounded-full flex items-center justify-center font-['Frank_Ruhl_Libre'] text-2xl text-white font-black shadow-md">
                  ח
                </div>
                <div className="font-['Frank_Ruhl_Libre'] text-sm font-bold text-[#9B7A2F] mt-2">בית חב"ד עפולה</div>
              </div>

              <div className="relative z-10 text-center flex-1 flex flex-col items-center justify-center gap-4 px-2">
                <div className="font-['Frank_Ruhl_Libre'] text-2xl font-black text-[#0D1B2A]">תעודת הוקרה ותודה</div>
                <div className="text-sm text-[#3a3a3a] leading-relaxed">
                  לכבוד<br />
                  <span className="font-['Frank_Ruhl_Libre'] text-xl font-bold text-[#0D1B2A] block mt-1">{donorName}</span>
                </div>
                <div className="text-xs text-[#5a5a5a] leading-relaxed max-w-[320px]">
                  על תרומתך הנדיבה, המוקדשת מעומק הלב לטובת פעילות בית חב"ד עפולה והקהילה
                </div>
                <div className="font-['Frank_Ruhl_Libre'] text-3xl font-black text-[#C9A84C] mt-1">₪{amount.toLocaleString()}</div>
                <div className="text-[11px] text-[#8a8a8a]">{displayDate}</div>
              </div>

              <div className="relative z-10 text-center pb-2">
                <div className="text-xs text-[#5a5a5a]">בברכה,</div>
                <div className="font-['Frank_Ruhl_Libre'] text-sm font-bold text-[#0D1B2A]">צוות בית חב"ד עפולה</div>
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
