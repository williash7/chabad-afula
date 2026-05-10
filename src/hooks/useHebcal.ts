import { useState, useEffect } from 'react';

export function useHebcal() {
  const [shabbat, setShabbat] = useState<any>(null);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [hebrewDate, setHebrewDate] = useState<string>('טוען...');

  useEffect(() => {
    // Fetch Shabbat times
    fetch('https://www.hebcal.com/shabbat?cfg=json&city=Afula&m=30')
      .then(r => r.json())
      .then(data => {
        // Hebcal ignores m= for named cities and returns 18 min before sunset.
        // Afula minhag is 30 min — subtract 12 min from the candle lighting time.
        if (data.items) {
          data.items = data.items.map((item: any) =>
            item.category === 'candles'
              ? { ...item, date: new Date(new Date(item.date).getTime() - 12 * 60000).toISOString() }
              : item
          );
        }
        setShabbat(data);
      })
      .catch(console.error);

    // Fetch Holidays
    fetch('https://www.hebcal.com/hebcal?v=1&cfg=json&year=2026&month=x&mf=on&c=on&city=Afula&s=on')
      .then(r => r.json())
      .then(data => {
        if (data.items) {
          setHolidays(data.items.filter((item: any) => 
            item.category === 'holiday' || item.category === 'roshchodesh'
          ));
        }
      })
      .catch(console.error);

    // Fetch today's Hebrew date
    const today = new Date();
    fetch(`https://www.hebcal.com/converter?cfg=json&gy=${today.getFullYear()}&gm=${today.getMonth() + 1}&gd=${today.getDate()}&g2h=1`)
      .then(r => r.json())
      .then(data => {
        if (data.hebrew) {
          setHebrewDate(data.hebrew);
        }
      })
      .catch(console.error);
  }, []);

  return { shabbat, holidays, hebrewDate };
}
