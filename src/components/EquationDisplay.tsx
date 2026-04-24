import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

type AngleData = {
  id: string;
  displayDeg: number;
  color: string;
};

interface EquationDisplayProps {
  isGathered: boolean;
  isDark: boolean;
  mode: 'triangle' | 'quad' | 'free';
  anglesData: { data: AngleData[]; totalSum: number; numCircles?: number };
  pointsCount: number;
}

export const EquationDisplay: React.FC<EquationDisplayProps> = ({ isGathered, isDark, mode, anglesData, pointsCount }) => {
  const numCircles = anglesData.numCircles || 1;
  const showCirclesBreakdown = numCircles > 1;

  return (
    <div className="absolute bottom-24 md:bottom-32 left-1/2 -translate-x-1/2 w-[98%] sm:w-full px-2 sm:px-4 flex flex-col items-center pointer-events-none z-10">
      <AnimatePresence>
        {isGathered && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: 'spring', bounce: 0.4 }}
            className={`flex flex-col items-center space-y-1 p-3 sm:p-4 md:p-6 rounded-3xl shadow-2xl backdrop-blur-xl border ${isDark ? 'bg-zinc-900/90 border-zinc-700/80 shadow-black/50' : 'bg-white/90 border-slate-200/80 shadow-slate-300/50'}`}
          >
            <div className="flex flex-wrap justify-center items-center gap-1.5 sm:gap-2 md:gap-3 text-base sm:text-2xl md:text-3xl font-black font-sans tracking-tighter">
              {anglesData.data.map((d, i) => (
                <React.Fragment key={d.id}>
                  {i > 0 && <span className={`text-[12px] sm:text-xl md:text-3xl ${isDark ? 'text-zinc-600' : 'text-slate-300'}`}>+</span>}
                  <motion.span 
                    initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }} 
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} 
                    transition={{ delay: 0.15 + i * 0.1, duration: 0.4 }}
                    style={{ color: d.color }}
                    className="drop-shadow-sm whitespace-nowrap text-sm sm:text-2xl md:text-4xl"
                  >
                    {d.displayDeg}°
                  </motion.span>
                </React.Fragment>
              ))}
              <span className={`text-[12px] sm:text-xl md:text-3xl ${isDark ? 'text-zinc-600' : 'text-slate-300'}`}>=</span>
              <motion.span 
                className={`ml-0.5 sm:ml-1 text-base sm:text-2xl md:text-4xl ${isDark ? 'text-zinc-100' : 'text-slate-800'}`}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: [1.5, 1], opacity: 1 }}
                transition={{ delay: 0.2 + anglesData.data.length * 0.1, type: "spring", bounce: 0.6 }}
              >
                {anglesData.totalSum}°
              </motion.span>
            </div>

            {showCirclesBreakdown ? (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + anglesData.data.length * 0.1 }}
                className={`flex justify-center items-center gap-1 sm:gap-2 text-sm sm:text-lg md:text-xl font-bold tracking-tight mt-1 ${isDark ? 'text-zinc-300' : 'text-slate-600'}`}
              >
                <span className={isDark ? 'text-zinc-600' : 'text-slate-300'}>=</span>
                {Array.from({ length: numCircles }).map((_, c) => {
                  const circleDeg = (c === numCircles - 1 && anglesData.totalSum % 360 !== 0) ? anglesData.totalSum % 360 : 360;
                  return (
                    <React.Fragment key={`breakdown-${c}`}>
                      {c > 0 && <span className={isDark ? 'text-zinc-600' : 'text-slate-300'}>+</span>}
                      <span>{circleDeg === 360 ? '1바퀴' : `${circleDeg}°`}</span>
                    </React.Fragment>
                  );
                })}
              </motion.div>
            ) : mode === 'triangle' ? (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + anglesData.data.length * 0.1 }}
                className={`flex justify-center items-center gap-1 sm:gap-2 text-sm sm:text-lg md:text-xl font-bold tracking-tight mt-1 ${isDark ? 'text-zinc-300' : 'text-slate-600'}`}
              >
                <span className={isDark ? 'text-zinc-600' : 'text-slate-300'}>=</span>
                <span>반원 (180°)</span>
              </motion.div>
            ) : null}
            
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              transition={{ delay: 1.0 + anglesData.data.length * 0.1 }}
              className={`text-sm md:text-base font-bold tracking-tight mt-3 flex flex-col items-center gap-1 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}
            >
              <span>
                {mode === 'triangle' ? '반 바퀴를 딱 채웠어요! (180°)' : 
                 mode === 'quad' ? '한 바퀴(360°)! 완벽한 원이네요.' :
                 `다각형의 내각의 합은 ${(pointsCount - 2) * 180}° 예요.`}
              </span>
              <span className={`text-xs md:text-sm font-medium mt-1 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                {mode === 'triangle' 
                  ? '왜 직선과 반원이 같은 180°일까요? 🤔'
                  : '모양이 바뀌어도 왜 항상 합이 같을까요? 🤔'}
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {!isGathered && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={`mt-4 px-5 py-2.5 rounded-full text-xs md:text-sm font-semibold shadow-sm border backdrop-blur-sm ${isDark ? 'bg-zinc-800/80 text-zinc-300 border-zinc-700/50' : 'bg-white/80 text-slate-600 border-slate-200/50'}`}
          >
            {mode === 'triangle' ? '도형을 변형해도 세 각의 합은 항상 180°일까요?' : 
             mode === 'quad' ? '사각형을 두 개의 삼각형으로 나누어 생각해보세요 💡' :
             '꼭짓점이 추가될 때마다 내각의 합은 어떻게 변할까요?'}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
