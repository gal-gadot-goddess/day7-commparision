
import React, { useEffect, useRef } from 'react';

interface TerminalProps {
  code: string;
  progress: number;
  color: string;
}

const Terminal: React.FC<TerminalProps> = ({ code, progress, color }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const lines = code.split('\n');

  // Calculate how many lines to show based on progress (0-100)
  // Instead of linear map, we want to simulate execution flow.
  // We can cycle through the blocks or just scroll slowly.
  // For simplicity and effect, we map progress to the full length but ensure it starts revealing from top.
  const totalLines = lines.length;
  // Make it move a bit faster at start to show code, then slow down?
  // Or just linear 0-100 map to total lines is standard terminal output simulation.
  const currentLineIndex = Math.min(Math.floor((progress / 100) * totalLines), totalLines - 1);

  // Auto-scroll to keep active line in view
  useEffect(() => {
    if (containerRef.current) {
      const lineHeight = 24; // Approximate height of a text-lg line with padding
      const scrollTarget = (currentLineIndex * lineHeight) - (containerRef.current.clientHeight / 2);
      containerRef.current.scrollTo({ top: scrollTarget, behavior: 'smooth' });
    }
  }, [currentLineIndex]);

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden border border-white/20 bg-[#0a0a0a] flex flex-col shadow-2xl">
      {/* KreggsCode Terminal Header */}
      <div className="bg-[#1a1a1a] px-4 py-3 flex items-center justify-between border-b border-white/10 shrink-0">
        <div className="flex gap-3">
          <div className="w-4 h-4 rounded-full bg-red-500" />
          <div className="w-4 h-4 rounded-full bg-yellow-500" />
          <div className="w-4 h-4 rounded-full bg-green-500" />
        </div>
        <div className="text-base font-mono uppercase tracking-widest font-black text-gray-400">KreggsCode</div>
        <div className="w-8" />
      </div>

      {/* Scrolled Content */}
      <div
        ref={containerRef}
        className="flex-1 p-6 overflow-hidden relative font-mono text-xl md:text-2xl leading-relaxed"
      >
        <div className="absolute inset-0 pointer-events-none opacity-[0.05]"
          style={{ background: `linear-gradient(180deg, ${color}22 0%, transparent 100%)` }} />

        <div className="relative z-10">
          {lines.map((line, idx) => {
            const isHeader = line.startsWith('[');
            const isActive = idx === currentLineIndex;
            const isRevealed = idx <= currentLineIndex;

            return (
              <div
                key={idx}
                className={`flex gap-4 transition-all duration-200 ${isRevealed ? 'opacity-100' : 'opacity-20 blur-[1px]'}`}
                style={{
                  backgroundColor: isActive ? `${color}44` : 'transparent',
                  borderLeft: isActive ? `6px solid ${color}` : '6px solid transparent',
                  paddingTop: '4px',
                  paddingBottom: '4px'
                }}
              >
                <span className="text-gray-600 select-none w-8 text-right shrink-0 font-bold">{idx + 1}</span>
                <span
                  className="break-all whitespace-pre-wrap"
                  style={{
                    color: isHeader ? color : isActive ? '#fff' : '#aaa',
                    fontWeight: isHeader || isActive ? '900' : 'bold',
                    textShadow: isActive ? `0 0 15px ${color}` : 'none'
                  }}
                >
                  {line || ' '}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Terminal;
