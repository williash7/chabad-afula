import React from 'react';

export function LoadingScreen({ text }: { text: string }) {
  return (
    <div className="fixed inset-0 bg-[#0D1B2A] flex flex-col items-center justify-center z-[999]">
      <div className="font-['Frank_Ruhl_Libre'] text-6xl text-[#C9A84C] mb-5 animate-pulse">ח</div>
      <div className="font-['Frank_Ruhl_Libre'] text-2xl text-white mb-2">בית חבד עפולה</div>
      <div className="text-sm text-white/40">{text}</div>
      <div className="w-[200px] h-[3px] bg-white/10 rounded-sm mt-6 overflow-hidden">
        <div className="h-full bg-[#C9A84C] rounded-sm w-full animate-[loadFill_3s_ease_forwards]" style={{ animationTimingFunction: 'linear' }}></div>
      </div>
    </div>
  );
}
