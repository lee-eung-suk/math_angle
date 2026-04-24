import React, { useState, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Square, Triangle, Hexagon, Download, Moon, Sun, Plus, Minus } from 'lucide-react';
import { toPng } from 'html-to-image';

import { EquationDisplay } from './components/EquationDisplay';

type Point = { id: string; x: number; y: number };

const signedArea = (pts: Point[]) => {
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const p1 = pts[i];
    const p2 = pts[(i + 1) % pts.length];
    area += p1.x * p2.y - p2.x * p1.y;
  }
  return (area / 2) || 1; // avoid 0
};

let audioCtx: AudioContext | null = null;
const playSound = (type: 'drag' | 'snap' | 'success') => {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;
    if (type === 'drag') {
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
      gain.gain.setValueAtTime(0.02, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'snap') {
      osc.frequency.setValueAtTime(300, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.setValueAtTime(600, now + 0.1);
      osc.frequency.setValueAtTime(800, now + 0.2);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.linearRampToValueAtTime(0.05, now + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    }
  } catch (e) {}
};

const COLORS = ['#FF4B4B', '#FFB429', '#00D18A', '#0090FF', '#9E54FF', '#FF66C4', '#FF8F00', '#00B1A7'];

const DEFAULT_TRIANGLE = [
  { id: 't1', x: 200, y: 400 },
  { id: 't2', x: 600, y: 400 },
  { id: 't3', x: 400, y: 150 },
];

const DEFAULT_QUAD = [
  { id: 'q1', x: 200, y: 200 },
  { id: 'q2', x: 600, y: 200 },
  { id: 'q3', x: 500, y: 450 },
  { id: 'q4', x: 300, y: 450 },
];

const generatePolys = (n: number) => {
  const pts = [];
  const cx = 400, cy = 300, r = 180;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    pts.push({ id: `f${i}`, x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return pts;
};

const GATHERED_CENTER = { x: 400, y: 300 };

export default function App() {
  const [mode, setMode] = useState<'triangle' | 'quad' | 'free'>('triangle');
  const [points, setPoints] = useState<Point[]>(DEFAULT_TRIANGLE);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [isGathered, setIsGathered] = useState(false);
  const [isDark, setIsDark] = useState(true);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  
  useEffect(() => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDark(true);
    } else {
      setIsDark(false);
    }
  }, []);

  const handlePointerDown = (id: string, e: React.PointerEvent<SVGCircleElement>) => {
    if (isGathered) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDraggingId(id);
    playSound('drag');
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!draggingId || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    let x = ((e.clientX - rect.left) / rect.width) * 800;
    let y = ((e.clientY - rect.top) / rect.height) * 600;
    
    x = Math.max(30, Math.min(770, x));
    y = Math.max(30, Math.min(570, y));

    setPoints((pts) => pts.map((p) => (p.id === draggingId ? { ...p, x, y } : p)));
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement | SVGCircleElement>) => {
    if (draggingId) {
      setDraggingId(null);
      playSound('snap');
    }
  };

  const handleModeChange = (newMode: 'triangle' | 'quad' | 'free') => {
    setMode(newMode);
    setIsGathered(false);
    if (newMode === 'triangle') setPoints(DEFAULT_TRIANGLE);
    else if (newMode === 'quad') setPoints(DEFAULT_QUAD);
    else setPoints(generatePolys(5));
    playSound('snap');
  };

  const anglesData = useMemo(() => {
    const area = signedArea(points);
    let totalSum = 0;

    const data = points.map((p, i) => {
      const next = points[(i + 1) % points.length];
      const prev = points[(i - 1 + points.length) % points.length];

      const a1 = Math.atan2(next.y - p.y, next.x - p.x);
      const a2 = Math.atan2(prev.y - p.y, prev.x - p.x);

      let startAngle, endAngle;
      if (area > 0) {
        startAngle = a1; endAngle = a2;
      } else {
        startAngle = a2; endAngle = a1;
      }

      let diff = endAngle - startAngle;
      while (diff < 0) diff += 2 * Math.PI;
      while (diff > 2 * Math.PI) diff -= 2 * Math.PI;

      const deg = diff * (180 / Math.PI);
      totalSum += deg;

      return {
        id: p.id,
        x: p.x,
        y: p.y,
        startAngle,
        endAngle,
        diff,
        deg,
        displayDeg: 0,
        color: COLORS[i % COLORS.length]
      };
    });

    const expectedSum = (points.length - 2) * 180;
    
    // Always enforce exact math for learning tool
    let currentSum = 0;
    data.forEach((d, i) => {
      if (i === data.length - 1) {
        d.displayDeg = Math.round((expectedSum - currentSum) * 10) / 10;
        // Optionally correct visual diff so it closes perfectly:
        // d.diff = d.displayDeg * (Math.PI / 180);
      } else {
        d.displayDeg = Math.round(d.deg * 10) / 10;
        currentSum += d.displayDeg;
      }
    });
    totalSum = expectedSum;

    return { data, totalSum, area };
  }, [points]);

  const gatheredState = useMemo(() => {
    const state: Record<string, { rot: number; acc: number }> = {};
    let currentAcc = mode === 'triangle' ? Math.PI : 0; 
    anglesData.data.forEach((d) => {
      state[d.id] = {
        rot: currentAcc - d.startAngle,
        acc: currentAcc,
      };
      currentAcc += d.diff;
    });
    return state;
  }, [anglesData, mode]); 

  const handleDownload = async () => {
    if (containerRef.current) {
      playSound('success');
      try {
        const dataUrl = await toPng(containerRef.current, { cacheBust: true, backgroundColor: isDark ? '#09090b' : '#f8fafc' });
        const link = document.createElement('a');
        link.download = `도형_탐구_${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
      } catch (err) {
        console.error("Screenshot failed:", err);
      }
    }
  };

  const polygonPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  return (
    <div className={`h-screen w-full flex flex-col font-sans overflow-hidden transition-colors duration-500 select-none ${isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-slate-100 text-slate-900'}`}>
      
      {/* Top Navigation Header */}
      <nav className={`h-16 md:h-20 backdrop-blur-md border-b px-4 md:px-8 flex items-center justify-between shrink-0 transition-colors duration-500 z-20 ${isDark ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white/80 border-slate-200'}`}>
        <div className="flex items-center space-x-3 md:space-x-4">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg md:text-xl shadow-sm shadow-blue-500/20">Σ</div>
          <h1 className={`text-lg md:text-xl font-semibold hidden sm:block ${isDark ? 'text-zinc-100' : 'text-slate-800'}`}>
            도형의 각도 탐구 <span className={`text-xs md:text-sm font-normal ml-2 ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>v1.2</span>
          </h1>
        </div>
        
        <div className={`flex p-1 rounded-lg transition-colors ${isDark ? 'bg-zinc-800/80' : 'bg-slate-100'}`}>
          <button onClick={() => handleModeChange('triangle')} className={`px-4 md:px-6 py-1.5 md:py-2 rounded-md font-medium text-xs md:text-sm transition-all ${mode === 'triangle' ? (isDark ? 'bg-zinc-700 text-blue-400 shadow-sm' : 'bg-white shadow-sm text-blue-600') : (isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-slate-500 hover:text-slate-700')}`}>삼각형 탐구</button>
          <button onClick={() => handleModeChange('quad')} className={`px-4 md:px-6 py-1.5 md:py-2 rounded-md font-medium text-xs md:text-sm transition-all ${mode === 'quad' ? (isDark ? 'bg-zinc-700 text-blue-400 shadow-sm' : 'bg-white shadow-sm text-blue-600') : (isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-slate-500 hover:text-slate-700')}`}>사각형 탐구</button>
          <button onClick={() => handleModeChange('free')} className={`px-4 md:px-6 py-1.5 md:py-2 rounded-md font-medium text-xs md:text-sm transition-all ${mode === 'free' ? (isDark ? 'bg-zinc-700 text-blue-400 shadow-sm' : 'bg-white shadow-sm text-blue-600') : (isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-slate-500 hover:text-slate-700')}`}>다각형 랩</button>
        </div>
        
        <div className="flex items-center space-x-2 md:space-x-3">
          <button onClick={() => setIsDark(!isDark)} className={`p-2 rounded-full transition-colors border ${isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`} title="테마 변경">
            {isDark ? <Sun className="w-4 h-4 md:w-5 md:h-5" /> : <Moon className="w-4 h-4 md:w-5 md:h-5" />}
          </button>
          <button onClick={handleDownload} className="px-3 md:px-4 py-1.5 md:py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold shadow-lg shadow-blue-500/30 hover:bg-blue-700 flex items-center gap-2 transition-colors">
            <Download className="w-4 h-4" /> <span className="hidden md:inline">결과 저장</span>
          </button>
        </div>
      </nav>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Sidebar Controls */}
        <aside className={`w-full md:w-72 border-b md:border-b-0 md:border-r p-4 md:p-6 flex flex-col space-y-4 md:space-y-6 shrink-0 overflow-y-auto transition-colors z-10 ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white/50 border-slate-200'}`}>
          <div className={`rounded-2xl p-5 md:p-6 shadow-sm border transition-colors ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'}`}>
            <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>내각의 크기의 합</p>
            <motion.h2 
              key={Math.round(anglesData.totalSum)} 
              initial={{ scale: 1.05, color: '#3b82f6' }} 
              animate={{ scale: 1, color: isDark ? '#f4f4f5' : '#0f172a' }}
              className="text-5xl md:text-6xl font-light tracking-tight tabular-nums"
            >
              {Math.round(anglesData.totalSum)}<span className="text-blue-500 text-3xl md:text-4xl">°</span>
            </motion.h2>
            <div className={`mt-4 h-2 w-full rounded-full overflow-hidden ${isDark ? 'bg-zinc-800' : 'bg-slate-100'}`}>
              <div className="h-full bg-blue-500 w-full rounded-full transition-all"></div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className={`text-sm font-semibold ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>꼭짓점 분석</h3>
            <div className="space-y-2 max-h-[25vh] md:max-h-none overflow-y-auto pr-2 custom-scrollbar">
              {anglesData.data.map((d, i) => {
                 const hexColor = COLORS[i % COLORS.length];
                 return (
                   <motion.div key={`list-${d.id}`} layout className={`flex items-center justify-between p-3 border rounded-xl transition-colors ${isDark ? 'bg-zinc-800/40 border-zinc-700/50' : 'bg-slate-50 border-slate-200'}`}>
                     <div className="flex items-center space-x-3">
                       <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: hexColor }}></div>
                       <span className={`text-sm font-medium ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>각도 {String.fromCharCode(65 + i)}</span>
                     </div>
                     <span className={`font-mono font-bold ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>{d.displayDeg}°</span>
                   </motion.div>
                 );
              })}
            </div>
          </div>

          <div className="flex-1 hidden md:block"></div>

          <div className={`p-4 border rounded-xl transition-colors ${isDark ? 'bg-indigo-950/30 border-indigo-900/50' : 'bg-yellow-50 border-yellow-200/60'}`}>
            <h4 className={`text-xs font-bold uppercase mb-1 italic ${isDark ? 'text-indigo-400' : 'text-yellow-800'}`}>탐구 미션</h4>
            <div className={`text-sm leading-snug space-y-2 ${isDark ? 'text-indigo-200/80' : 'text-yellow-900'}`}>
              <AnimatePresence mode="wait">
                <motion.p key={mode} initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}}>
                  {mode === 'triangle' && "꼭짓점을 요리조리 드래그해보세요! 모양이 아무리 찌그러져도 각의 합은 항상 같을까요?"}
                  {mode === 'quad' && "사각형을 잘라서 삼각형 두 개로 만들 수 있을까요? 삼각형의 합 180도와 연관 지어 생각해보세요 🤔"}
                  {mode === 'free' && "다각형에서 각의 개수가 늘어나면 총합은 어떻게 변할까요? 일정한 규칙을 찾아보세요!"}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>
        </aside>

        {/* Main Simulation Area */}
        <main ref={containerRef} className={`flex-1 relative transition-colors duration-500 [background-size:24px_24px] ${isDark ? 'bg-[radial-gradient(#27272a_1px,transparent_1px)]' : 'bg-[radial-gradient(#cbd5e1_1px,transparent_1px)]'}`}>
          {/* Interaction Hint */}
          <div data-html2canvas-ignore className={`absolute top-4 md:top-8 right-4 md:right-8 p-3 md:p-4 rounded-xl border shadow-sm backdrop-blur-md z-10 transition-colors ${isDark ? 'bg-zinc-900/80 border-zinc-700/50' : 'bg-white/80 border-white/40'}`}>
             <div className="flex items-center space-x-2 md:space-x-3">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                <p className={`text-xs md:text-sm font-medium ${isDark ? 'text-zinc-300' : 'text-slate-600'}`}>점을 드래그하여 도형을 바꿔보세요</p>
             </div>
          </div>

          <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-8 md:p-16 pb-24 md:pb-32">
            <div className="w-full h-full max-w-4xl relative">
              <svg
                ref={svgRef}
                viewBox="0 0 800 600"
                className="w-full h-full touch-none overflow-visible drop-shadow-xl"
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
              >
                <motion.path
                  d={polygonPath}
                  className="transition-colors duration-500"
                  fill={isDark ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.05)'}
                  stroke={isDark ? '#3b82f6' : '#2563eb'}
                  strokeWidth="4"
                  strokeLinejoin="round"
                  animate={{ opacity: isGathered ? 0 : 1 }}
                  transition={{ duration: 0.5 }}
                />

                <AnimatePresence>
                  {isGathered && mode === 'triangle' && (
                    <motion.line
                      x1={GATHERED_CENTER.x - 120}
                      y1={GATHERED_CENTER.y}
                      x2={GATHERED_CENTER.x + 120}
                      y2={GATHERED_CENTER.y}
                      stroke={isDark ? '#52525b' : '#cbd5e1'}
                      strokeWidth="3"
                      strokeDasharray="6 6"
                      strokeLinecap="round"
                      initial={{ opacity: 0, pathLength: 0 }}
                      animate={{ opacity: 1, pathLength: 1 }}
                      exit={{ opacity: 0, pathLength: 0 }}
                      transition={{ duration: 0.6 }}
                      className="drop-shadow-sm"
                    />
                  )}
                </AnimatePresence>

                {anglesData.data.map((d, i) => {
                  const R = 50;
                  const p1x = R * Math.cos(d.startAngle);
                  const p1y = R * Math.sin(d.startAngle);
                  const p2x = R * Math.cos(d.endAngle);
                  const p2y = R * Math.sin(d.endAngle);
                  const largeArc = d.diff > Math.PI ? 1 : 0;
                  const path = `M 0 0 L ${p1x} ${p1y} A ${R} ${R} 0 ${largeArc} 1 ${p2x} ${p2y} Z`;

                  const color = COLORS[i % COLORS.length];

                  return (
                    <motion.g
                      key={`wedge-${d.id}`}
                      style={{ filter: isGathered ? 'drop-shadow(0px 10px 15px rgba(0,0,0,0.2))' : 'none' }}
                      animate={{
                        x: isGathered ? GATHERED_CENTER.x : d.x,
                        y: isGathered ? GATHERED_CENTER.y : d.y,
                        rotate: isGathered ? gatheredState[d.id]?.rot * (180 / Math.PI) : 0,
                        scale: isGathered ? (mode === 'triangle' ? 2 : 1.8) : 1
                      }}
                      transition={{ type: 'spring', bounce: 0.25, duration: 0.9, delay: isGathered ? i * 0.1 : 0 }}
                    >
                      {/* Bounding box stabilization for accurate 0,0 rotation origin */}
                      <circle cx={0} cy={0} r={R + 8} fill="transparent" stroke="none" />
                      <path d={path} fill={color} opacity={0.35} />
                      <path d={path} fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
                    </motion.g>
                  );
                })}

                <AnimatePresence>
                    {points.map((p, i) => {
                    const color = COLORS[i % COLORS.length];  
                    return (
                    <motion.circle
                        key={`pt-${p.id}`}
                        cx={p.x}
                        cy={p.y}
                        r={14}
                        className="cursor-grab active:cursor-grabbing hover:opacity-80"
                        fill={isDark ? '#fafafa' : '#ffffff'}
                        stroke={color}
                        strokeWidth="5"
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.9 }}
                        onPointerDown={(e) => handlePointerDown(p.id, e)}
                        animate={{ opacity: isGathered ? 0 : 1, scale: draggingId === p.id ? 1.4 : 1 }}
                        exit={{ opacity: 0, scale: 0 }}
                        initial={{ opacity: 0, scale: 0 }}
                        transition={{ duration: 0.2 }}
                    />
                    )})}
                </AnimatePresence>

                {anglesData.data.map((d, i) => {
                  const bisect = d.startAngle + d.diff / 2;
                  
                  let targetAngle = bisect;
                  let targetX = d.x + Math.cos(targetAngle) * 85;
                  let targetY = d.y + Math.sin(targetAngle) * 85;

                  if (isGathered) {
                    targetAngle = gatheredState[d.id]?.acc + d.diff / 2;
                    targetX = GATHERED_CENTER.x + Math.cos(targetAngle) * 85;
                    targetY = GATHERED_CENTER.y + Math.sin(targetAngle) * 85;
                  }

                  const color = COLORS[i % COLORS.length];

                  return (
                    <motion.g
                      key={`label-${d.id}`}
                      animate={{ x: targetX, y: targetY }}
                      transition={{ type: 'spring', bounce: 0.15, duration: 0.8, delay: isGathered ? i * 0.08 : 0 }}
                    >
                      <motion.text
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill={isDark ? color : color}
                        fontSize={isGathered ? "20" : "18"}
                        fontWeight="900"
                        className="select-none pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                        animate={{ opacity: (isGathered && d.diff < 0.2) ? 0 : 1 }}
                      >
                        {d.displayDeg}°
                      </motion.text>
                    </motion.g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Equation Display & Learning Aids */}
          <EquationDisplay
            isGathered={isGathered}
            isDark={isDark}
            mode={mode}
            anglesData={anglesData}
            pointsCount={points.length}
          />

          {/* Floating Proof Action */}
          <div data-html2canvas-ignore className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center justify-center space-x-2 md:space-x-4 z-10 w-full max-w-xl px-4">
            
            {/* Reset Button */}
            <button
              onClick={() => handleModeChange(mode)}
              className={`p-3 md:p-4 rounded-full shadow-lg border backdrop-blur group hover:scale-[1.05] active:scale-95 transition-all ${isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
              title="원래 모양으로 초기화"
            >
              <svg className="w-5 h-5 group-hover:-rotate-180 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </button>

            {mode === 'free' && (
              <div className={`flex items-center p-1.5 md:p-2 rounded-full shadow-lg border backdrop-blur transition-colors ${isDark ? 'bg-zinc-900/90 border-zinc-700/50' : 'bg-white/90 border-slate-200'}`}>
                <button onClick={() => setPoints(generatePolys(Math.max(3, points.length - 1)))} className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-slate-100'}`}>
                  <Minus className={`w-4 h-4 md:w-5 md:h-5 ${isDark ? 'text-zinc-300' : 'text-slate-700'}`} />
                </button>
                <div className={`font-extrabold text-base md:text-lg w-8 md:w-10 text-center tabular-nums ${isDark ? 'text-zinc-100' : 'text-slate-800'}`}>{points.length}</div>
                <button onClick={() => setPoints(generatePolys(Math.min(10, points.length + 1)))} className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-slate-100'}`}>
                  <Plus className={`w-4 h-4 md:w-5 md:h-5 ${isDark ? 'text-zinc-300' : 'text-slate-700'}`} />
                </button>
              </div>
            )}
            
            <button
              onClick={() => { setIsGathered(!isGathered); playSound('success'); }}
              className={`px-6 md:px-8 py-3 md:py-4 rounded-full shadow-xl flex items-center space-x-3 group hover:scale-[1.02] active:scale-95 transition-all truncate border backdrop-blur
                ${isGathered ? 
                  (isDark ? 'bg-zinc-200 border-zinc-100 text-zinc-900 shadow-zinc-200/20' : 'bg-slate-900 border-slate-800 text-white') : 
                  (isDark ? 'bg-zinc-900/90 border-zinc-700 text-zinc-100 hover:bg-zinc-800' : 'bg-white/90 border-slate-200 text-slate-800 hover:bg-white')}
              `}
            >
              <div className={`w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${isGathered ? (isDark ? 'bg-zinc-900 text-zinc-200' : 'bg-white text-slate-900') : (isDark ? 'bg-zinc-700 text-zinc-200' : 'bg-slate-900 text-white')}`}>
                <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
              </div>
              <span className="font-bold tracking-tight uppercase text-xs md:text-sm">
                 {isGathered ? '다시 흩어보기' : '각 모아보기'}
              </span>
            </button>
          </div>
        </main>
      </div>

      {/* Bottom Hint Bar */}
      <footer className={`h-10 md:h-12 border-t px-4 md:px-8 flex items-center justify-between text-[10px] md:text-xs font-medium shrink-0 transition-colors z-20 ${isDark ? 'bg-zinc-900/50 border-zinc-800 text-zinc-500' : 'bg-white border-slate-200 text-slate-400'}`}>
        <div className="flex space-x-4 md:space-x-6">
          <span>모드: 인터랙티브 탐구</span>
          <span className="hidden sm:inline">단위: 도 (°)</span>
        </div>
        <div className="flex items-center space-x-2">
          <span>대상: 초등학교 4학년</span>
        </div>
      </footer>
    </div>
  );
}
