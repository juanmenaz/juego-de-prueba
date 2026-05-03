import React from 'react';

interface UIElementProps {
  label: string;
  value: string | number;
}

export const UIElement = ({ label, value }: UIElementProps) => (
  <div className="flex items-center gap-2">
    <div className="w-3 h-3 rotate-45 bg-[#00ff88] shadow-[0_0_10px_rgba(0,255,136,0.6)]" />
    <div className="flex items-baseline gap-1">
      <span className="text-xs font-black text-[#00ff88] tracking-tighter uppercase whitespace-nowrap">{label}</span>
      <span className="text-lg font-black text-white leading-none whitespace-nowrap">{value}</span>
    </div>
  </div>
);

export const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const GameUI = ({ level, score, timeLeft, gameState, onStart }: any) => {
  return (
    <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between z-10">
      <div className="w-full flex justify-between items-center px-8 pointer-events-auto">
        <UIElement label="STAGE" value={level} />
        <UIElement label="SCORE" value={score} />
        <UIElement label="TIMER" value={formatTime(timeLeft)} />
      </div>

      <div className="flex-1 flex items-center justify-center pointer-events-auto">
        {gameState !== 'playing' && gameState !== 'start' && (
          <div className="bg-black/90 backdrop-blur-xl p-12 border-2 border-[#00ff88] shadow-[0_0_50px_rgba(0,255,136,0.3)] text-center animate-in fade-in zoom-in duration-300">
            <h2 className="text-6xl font-black text-[#00ff88] mb-2 tracking-tighter uppercase italic">
              {gameState === 'won' ? 'System Compiled' : 'System Halted'}
            </h2>
            <p className="text-white/70 mb-10 font-mono text-sm tracking-widest uppercase">
              {gameState === 'won' ? 'Galaxy Node: SECURED' : 'Critical logic error in core memory'}
            </p>
            <button 
              onClick={onStart} 
              className="bg-[#00ff88] hover:bg-[#00ff88]/80 text-black px-16 py-4 rounded-none font-black tracking-widest text-xl transition-all hover:scale-105 active:scale-95 pointer-events-auto"
            >
              REBOOT SYSTEM
            </button>
          </div>
        )}
        {gameState === 'start' && (
          <div className="text-center">
            <button 
              onClick={onStart} 
              className="bg-white/5 hover:bg-white/10 text-[#00ff88] border border-[#00ff88]/40 px-12 py-4 rounded-none font-black tracking-widest text-xl transition-all hover:scale-105 active:scale-95 pointer-events-auto shadow-[0_0_20px_rgba(0,255,136,0.1)]"
            >
              INITIALIZE MATRIX
            </button>
          </div>
        )}
      </div>

      <div className="w-full flex justify-between items-end px-8 pointer-events-auto">
         <div className="text-[#00ff88] font-black text-lg tracking-tighter opacity-80 leading-none uppercase">
          Matrix Galaxy<br/>Contador
        </div>
        <div className="flex flex-col items-end opacity-40">
           <span className="text-[10px] text-white font-mono uppercase">System Active</span>
           <div className="w-24 h-1 bg-white/20 mt-1" />
        </div>
      </div>
    </div>
  );
};
