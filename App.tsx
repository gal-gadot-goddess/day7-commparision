import { audioService } from './services/audioService';
(window as any).audioService = audioService;

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { fetchTopicData, DEFAULT_CONFIG, buildComplexities } from './constants';
import { ComplexityData } from './types';
import Visualizer from './components/Visualizer';

const App: React.FC = () => {
  const params = new URLSearchParams(window.location.search);
  const isRecording = params.get('recording') === 'true';

  const [topicData, setTopicData] = useState(DEFAULT_CONFIG);
  const [complexities, setComplexities] = useState<ComplexityData[]>([]);
  const [currentN, setCurrentN] = useState(0);
  const [isStarted, setIsStarted] = useState(false);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    fetchTopicData().then((data) => {
      setTopicData(data);
      setComplexities(buildComplexities(data));
    });
  }, []);

  /* Expose hooks for automation */
  useEffect(() => {
    (window as any).startSorting = handleStart;
    (window as any).isSortingCompleted = false;
  }, []);

  const runParallelSymphony = useCallback(() => {
    let startTime: number | null = null;
    const duration = 15000; // 15s duration

    (window as any).isSortingCompleted = false;

    const animate = (time: number) => {
      if (!startTime) startTime = time;
      const progress = Math.min((time - startTime) / duration, 1);
      const n = progress * 100;

      setCurrentN(n);

      if (Math.floor(n) % 6 === 0 && n > 0 && n < 100) {
        audioService.playScan(n, '#3b82f6');
      }

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        audioService.playComplete();
        setIsStarted(false);
        (window as any).isSortingCompleted = true; // Signal completion
        console.log('SORTING_COMPLETED');
      }
    };

    // Resume audio context
    audioService.resume();
    animationRef.current = requestAnimationFrame(animate);
  }, []);

  const handleStart = () => {
    if (!isStarted) {
      setIsStarted(true);
      setCurrentN(0);
      runParallelSymphony();
    }
  };

  return (
    <div className="h-[100dvh] w-screen bg-[#000] text-white flex flex-col overflow-hidden p-6 font-sans select-none relative">
      <div className="absolute inset-0 grid-bg opacity-20 pointer-events-none"></div>
      
      <header className={`flex flex-col gap-2 px-2 shrink-0 text-center items-center z-10 ${isRecording ? 'pt-24 mb-12' : 'pt-10 mb-6'}`}>
        <div className="flex flex-col gap-1 items-center">
          <h1 className={`${isRecording ? 'text-8xl' : 'text-5xl'} font-black tracking-tighter uppercase leading-none text-white animate-pulse shadow-lg`}>
            {topicData.title}
          </h1>
          <p className={`${isRecording ? 'text-4xl' : 'text-2xl'} text-[#50fa7b] italic font-medium mt-4 tracking-wide`}>
            {topicData.tagline}
          </p>
        </div>

        <div className="flex flex-col items-center mt-8 border-b border-white/10 pb-4 w-full">
          <div className="flex items-baseline gap-4">
            <span className={`${isRecording ? 'text-3xl' : 'text-xl'} font-bold tracking-[0.3em] text-gray-500 uppercase`}>
              {topicData.xAxisLabel}
            </span>
            <span className={`${isRecording ? 'text-6xl' : 'text-4xl'} font-mono text-blue-500 font-black shadow-[0_0_20px_rgba(59,130,246,0.5)]`}>
              {Math.floor(currentN)}
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col gap-8 min-h-0 overflow-hidden pb-10 z-10">
        <section className="flex-[9] min-h-0 relative shrink-0">
          <Visualizer currentN={currentN} activeId="all" complexities={complexities} topicData={topicData} />
        </section>

        <section className="bg-white/[0.03] border border-white/10 rounded-[40px] p-8 shrink-0 z-50 backdrop-blur-xl shadow-2xl">
          <div className="flex flex-wrap justify-center gap-6">
            {complexities.map((c: ComplexityData) => (
              <div key={c.id} className="flex items-center gap-4 bg-white/5 px-6 py-3 rounded-full border border-white/10 backdrop-blur-md hover:bg-white/10 transition-all">
                <div
                  className="w-6 h-6 rounded-full shadow-[0_0_15px_rgba(255,255,255,0.3)] shrink-0"
                  style={{
                    backgroundColor: c.color,
                    boxShadow: currentN >= 100 ? `0 0 20px ${c.color}` : 'none'
                  }}
                />
                <span className={`${isRecording ? 'text-2xl' : 'text-lg'} font-black text-white/90 whitespace-nowrap tracking-wider uppercase`}>{c.label}</span>
              </div>
            ))}
          </div>
        </section>
      </main>

      {!isRecording && (
        <button 
          onClick={handleStart}
          className="fixed bottom-10 right-10 bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-8 rounded-full shadow-2xl transition-all active:scale-95 z-[100]"
        >
          {isStarted ? 'Running...' : 'Start Symphony'}
        </button>
      )}
    </div>
  );
};

export default App;
