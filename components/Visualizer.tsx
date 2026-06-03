
import React, { useMemo } from 'react';
import { ComplexityData, Point } from '../types';
import { TopicData } from '../constants';

interface VisualizerProps {
  currentN: number;
  activeId: string;
  complexities: ComplexityData[];
  topicData: TopicData;
}

const Visualizer: React.FC<VisualizerProps> = ({ currentN, activeId, complexities, topicData }) => {
  // width/height should reflect 9:16 aspect ratio properly
  const width = 1080;
  const height = 1500; // Increased to allow more vertical breathing room
  const paddingX = 100;
  const paddingY = 150;

  const xScale = (n: number) => paddingX + (n / 100) * (width - paddingX * 2);
  
  const yScale = (val: number) => {
    const availableHeight = height - paddingY * 2.5;
    // We clamp the visual representation so it doesn't fly into the header
    // but we'll add a visual indicator if it's "off-chart"
    const clampedVal = Math.min(val, 110); 
    return (height - paddingY) - (clampedVal / 100) * availableHeight;
  };

  const paths = useMemo(() => {
    return complexities.map(comp => {
      const points: Point[] = [];
      for (let n = 0; n <= 100; n += 0.5) {
        const val = comp.formula(n);
        points.push({ x: xScale(n), y: yScale(val) });
      }
      const d = `M ${points[0].x} ${points[0].y} ` +
        points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
      return { ...comp, d };
    });
  }, [complexities]);

  return (
    <div className="relative w-full h-full bg-[#050505] rounded-[60px] border border-white/10 overflow-hidden shadow-2xl flex flex-col items-center justify-center">
      {/* Grid */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.03] pointer-events-none">
        <pattern id="grid-pattern" width="60" height="60" patternUnits="userSpaceOnUse">
          <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="1" />
        </pattern>
        <rect width="100%" height="100%" fill="url(#grid-pattern)" />
      </svg>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        {/* Y-Axis Limit Line (The "Ceiling") */}
        <line 
          x1={paddingX} y1={yScale(100)} x2={width-paddingX} y2={yScale(100)} 
          stroke="rgba(255, 50, 50, 0.3)" strokeWidth="4" strokeDasharray="10,10"
        />
        <text 
           x={width - paddingX - 10} y={yScale(100) - 15} 
           fill="rgba(255, 50, 50, 0.6)" fontSize="24" fontWeight="bold" textAnchor="end" className="font-mono"
        >
          COST LIMIT
        </text>

        {/* Axes */}
        <g className="opacity-90">
          {/* X Axis */}
          <line
            x1={paddingX}
            y1={height - paddingY}
            x2={width - paddingX}
            y2={height - paddingY}
            stroke="white"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <text
            x={width / 2}
            y={height - paddingY + 80}
            fill="white"
            textAnchor="middle"
            fontSize="36"
            fontWeight="900"
            className="font-mono tracking-widest uppercase"
          >
            {topicData.xAxisLabel}
          </text>

          {/* Y Axis */}
          <line
            x1={paddingX}
            y1={height - paddingY}
            x2={paddingX}
            y2={paddingY}
            stroke="white"
            strokeWidth="6"
            strokeLinecap="round"
          />
        </g>

        {/* Background Curves */}
        {paths.map(path => (
          <path
            key={`bg-${path.id}`}
            d={path.d}
            fill="none"
            stroke={path.color}
            strokeWidth="4"
            opacity="0.05"
          />
        ))}

        {/* Animated Curves */}
        {paths.map(path => {
          const val = path.formula(currentN);
          const isOffChart = val > 100;
          const currentY = yScale(val);
          const currentX = xScale(currentN);

          const segmentPoints: Point[] = [];
          for (let n = 0; n <= currentN; n += 0.5) {
            segmentPoints.push({ x: xScale(n), y: yScale(path.formula(n)) });
          }
          const segmentD = segmentPoints.length > 0
            ? `M ${segmentPoints[0].x} ${segmentPoints[0].y} ` + segmentPoints.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')
            : '';

          return (
            <g key={path.id}>
              <path
                d={segmentD}
                fill="none"
                stroke={path.color}
                strokeWidth={isOffChart ? "6" : "14"}
                strokeLinecap="round"
                opacity={isOffChart ? 0.4 : 1}
                style={{ filter: isOffChart ? 'none' : `drop-shadow(0 0 20px ${path.color}88)` }}
              />
              {currentN > 0 && (
                <g>
                  {/* Point Marker */}
                  <circle cx={currentX} cy={currentY} r={isOffChart ? "8" : "14"} fill="#fff" />
                  {!isOffChart && <circle cx={currentX} cy={currentY} r="25" fill={path.color} className="animate-pulse opacity-40" />}

                  {/* Winner/Loser Status */}
                  {currentN > 80 && !isOffChart && val < 40 && (
                    <text
                       x={currentX} y={currentY - 40}
                       fill="#50fa7b" fontSize="24" fontWeight="bold" textAnchor="middle" className="font-mono"
                    >
                      WINNER
                    </text>
                  )}
                  {isOffChart && (
                    <text
                       x={currentX} y={currentY - 30}
                       fill="#ff5555" fontSize="22" fontWeight="bold" textAnchor="middle" className="font-mono"
                    >
                      CRITICAL
                    </text>
                  )}

                  {/* Label follows the point */}
                  <text
                    x={currentX + 30}
                    y={currentY}
                    fill={isOffChart ? "#999" : path.color}
                    fontSize="32"
                    fontWeight="900"
                    className="font-mono"
                    alignmentBaseline="middle"
                    style={{ textShadow: '0 0 15px rgba(0,0,0,0.9)' }}
                  >
                    {path.label}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div >
  );
};

export default Visualizer;
