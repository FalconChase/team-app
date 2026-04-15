import React, { useMemo } from 'react';
import { HOURS_IN_DAY, WEATHER_COLORS } from '../../constants/weatherConstants';

export function DayPie({ hourlyData = [], hourRange }) {
  const radius = 50;
  const center = 50;
  const innerRadius = 15;

  const segments = useMemo(() => {
    const segs = [];
    const anglePerSlice = 360 / HOURS_IN_DAY;

    for (let i = 0; i < HOURS_IN_DAY; i++) {
      const startAngleDeg = i * anglePerSlice - 90;
      const endAngleDeg = (i + 1) * anglePerSlice - 90;

      const startRad = (startAngleDeg * Math.PI) / 180;
      const endRad = (endAngleDeg * Math.PI) / 180;

      const x1 = center + radius * Math.cos(startRad);
      const y1 = center + radius * Math.sin(startRad);
      const x2 = center + radius * Math.cos(endRad);
      const y2 = center + radius * Math.sin(endRad);

      const d = `M ${center},${center} L ${x1},${y1} A ${radius},${radius} 0 0,1 ${x2},${y2} Z`;

      // ── Mask out-of-range segments — white if outside selected hour window ──
      const inRange = !hourRange || (i >= hourRange.start && i <= hourRange.end);
      const val = inRange ? (hourlyData[i] || 0) : 0;

      segs.push({ d, value: val, inRange });
    }
    return segs;
  }, [hourlyData, hourRange]);

  console.log('DayPie hourRange:', hourRange, 'out-of-range count:', segments.filter(s => !s.inRange).length);

  return (
    <svg
      viewBox="0 0 100 100"
      style={{ width: '100%', height: '100%' }}
      preserveAspectRatio="xMidYMid meet"
    >
      {segments.map((seg, idx) => (
        <path
          key={idx}
          d={seg.d}
          fill={seg.inRange ? (WEATHER_COLORS[seg.value] || 'white') : '#e5e7eb'}
          stroke="#000"
          strokeWidth="0.5"
        />
      ))}
      <circle cx={center} cy={center} r={radius} fill="none" stroke="#000" strokeWidth="1.2" />
      <circle cx={center} cy={center} r={innerRadius} fill="white" stroke="#000" strokeWidth="0.5" />
    </svg>
  );
}
