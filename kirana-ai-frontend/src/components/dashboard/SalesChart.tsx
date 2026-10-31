import React, { useState } from 'react';
import { TimePeriod } from '../../types/retail';
import { useRetailData } from '../../context/RetailDataContext';
import { formatINR } from '../../utils/formatting';

interface SalesChartProps {
  period: TimePeriod;
  onPeriodChange: (period: TimePeriod) => void;
}

export const SalesChart: React.FC<SalesChartProps> = ({ period, onPeriodChange }) => {
  const { getChartData } = useRetailData();
  const data = getChartData(period);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Chart layout dimensions
  const width = 800;
  const height = 260;
  const padLeft = 60;
  const padRight = 30;
  const padTop = 30;
  const padBottom = 40;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const maxVal = Math.max(...data.map((d) => d.sales), 100);
  // Nice ceiling for Y axis
  const yCeil = Math.ceil((maxVal * 1.15) / 100) * 100;

  // Calculate points
  const points = data.map((d, i) => {
    const x = padLeft + (i / (data.length - 1)) * chartW;
    const y = padTop + chartH - (d.sales / yCeil) * chartH;
    return { x, y, ...d };
  });

  // Construct SVG path for area & line
  const linePath = points.reduce((acc, pt, i) => {
    if (i === 0) return `M ${pt.x} ${pt.y}`;
    const prev = points[i - 1];
    const cpx1 = prev.x + (pt.x - prev.x) / 2;
    const cpy1 = prev.y;
    const cpx2 = prev.x + (pt.x - prev.x) / 2;
    const cpy2 = pt.y;
    return `${acc} C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${pt.x} ${pt.y}`;
  }, '');

  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padTop + chartH} L ${points[0].x} ${padTop + chartH} Z`;

  // Y-axis ticks
  const yTicks = [0, Math.round(yCeil / 2), yCeil];

  const hoveredPoint = hoverIndex !== null ? points[hoverIndex] : null;

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-[#10121C]/75 backdrop-blur-xl border border-white/10 shadow-xl space-y-4">
      {/* Header and Period Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-extrabold text-white flex items-center gap-2">
            <span>Sales Over Time</span>
            <span className="w-2 h-2 rounded-full bg-[#F97316] animate-pulse" />
          </h2>
          <p className="text-xs text-slate-400">
            Revenue trend and counter volume · விற்பனை வளர்ச்சி
          </p>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex items-center gap-1 p-1 bg-white/[0.05] rounded-xl border border-white/10 self-start sm:self-auto">
          {(
            [
              { id: 'today', label: 'Today' },
              { id: '7days', label: 'Last 7 Days' },
              { id: '30days', label: 'Last 30 Days' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => {
                onPeriodChange(t.id);
                setHoverIndex(null);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                period === t.id
                  ? 'bg-gradient-to-r from-[#9333EA] to-[#F97316] text-white shadow-[0_0_12px_rgba(249,115,22,0.4)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Chart Container */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible select-none"
        >
          <defs>
            <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F97316" stopOpacity="0.45" />
              <stop offset="50%" stopColor="#9333EA" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#581C87" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#9333EA" />
              <stop offset="50%" stopColor="#E11D48" />
              <stop offset="100%" stopColor="#F97316" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#F97316" floodOpacity="0.6" />
            </filter>
          </defs>

          {/* Grid lines */}
          {yTicks.map((val, idx) => {
            const y = padTop + chartH - (val / yCeil) * chartH;
            return (
              <g key={idx}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="rgba(255,255,255,0.08)"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={padLeft - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="text-[11px] fill-slate-400 font-mono tabular-nums"
                >
                  {formatINR(val)}
                </text>
              </g>
            );
          })}

          {/* Area Fill */}
          <path d={areaPath} fill="url(#salesGradient)" />

          {/* Line Stroke */}
          <path
            d={linePath}
            fill="none"
            stroke="url(#lineGradient)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glow)"
          />

          {/* Points & Hover interactions */}
          {points.map((pt, i) => (
            <g
              key={i}
              className="cursor-pointer"
              onMouseEnter={() => setHoverIndex(i)}
              onClick={() => setHoverIndex(i)}
            >
              {/* Invisible touch area */}
              <circle cx={pt.x} cy={pt.y} r="16" fill="transparent" />

              {/* Point circle */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r={hoverIndex === i ? 6 : 4}
                fill={hoverIndex === i ? '#F97316' : '#9333EA'}
                stroke="#FFFFFF"
                strokeWidth="2"
                className="transition-all duration-150"
              />

              {/* X Axis Labels */}
              <text
                x={pt.x}
                y={padTop + chartH + 22}
                textAnchor="middle"
                className={`text-[11px] font-medium transition-colors ${
                  hoverIndex === i ? 'fill-white font-bold' : 'fill-slate-400'
                }`}
              >
                {pt.label}
              </text>
            </g>
          ))}

          {/* Vertical guideline for hovered point */}
          {hoveredPoint && (
            <line
              x1={hoveredPoint.x}
              y1={padTop}
              x2={hoveredPoint.x}
              y2={padTop + chartH}
              stroke="#F97316"
              strokeDasharray="3 3"
              strokeWidth="1.5"
            />
          )}
        </svg>

        {/* Hover Tooltip Card */}
        {hoveredPoint && (
          <div
            className="absolute top-2 left-1/2 -translate-x-1/2 sm:translate-x-0 sm:left-auto sm:right-6 pointer-events-none px-3.5 py-2 rounded-xl bg-[#181926]/90 backdrop-blur-xl text-white shadow-xl border border-white/20 text-xs flex items-center gap-3 animate-fade-in shadow-[0_0_20px_rgba(249,115,22,0.3)]"
          >
            <div>
              <span className="text-[10px] text-amber-300 font-semibold block">
                {hoveredPoint.label}
              </span>
              <span className="text-sm font-extrabold text-white tabular-nums">
                {formatINR(hoveredPoint.sales)}
              </span>
            </div>
            <div className="pl-3 border-l border-white/15 text-[11px] text-slate-300">
              <span>{hoveredPoint.transactions} bills</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
