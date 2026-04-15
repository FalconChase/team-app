import React, { useMemo } from 'react';
import { LOGBOOK_WEATHER_COLORS } from '../../constants/weatherConstants';

export function LogbookPie({ hourlyData = [], hourRange }) {
  const radius = 50;
  const center = 50;
  const innerRadius = 15;
  const midRadius = 32.5;

  const segments = useMemo(() => {
    const segs = [];
    const anglePerSlice = 360 / 12;

    for (let i = 0; i < 12; i++) {
      const startAngleDeg = i * anglePerSlice - 90;
      const endAngleDeg = (i + 1) * anglePerSlice - 90;

      const startRad = (startAngleDeg * Math.PI) / 180;
      const endRad = (endAngleDeg * Math.PI) / 180;

      const c1 = Math.cos(startRad);
      const s1 = Math.sin(startRad);
      const c2 = Math.cos(endRad);
      const s2 = Math.sin(endRad);

// ── Mask out-of-range segments per ring ──────────────────────────────────
      const outerIdx = i;
      const innerIdx = i + 12;
      const outerInRange = !hourRange || (outerIdx >= hourRange.start && outerIdx <= hourRange.end);
      const innerInRange = !hourRange || (innerIdx >= hourRange.start && innerIdx <= hourRange.end);
      const valOuter = outerInRange ? (hourlyData[outerIdx] || 0) : 0;
      const valInner = innerInRange ? (hourlyData[innerIdx] || 0) : 0;

      const dInner = `
        M ${center + innerRadius * c1},${center + innerRadius * s1}
        L ${center + midRadius * c1},${center + midRadius * s1}
        A ${midRadius},${midRadius} 0 0,1 ${center + midRadius * c2},${center + midRadius * s2}
        L ${center + innerRadius * c2},${center + innerRadius * s2}
        A ${innerRadius},${innerRadius} 0 0,0 ${center + innerRadius * c1},${center + innerRadius * s1}
        Z
      `;

      const dOuter = `
        M ${center + midRadius * c1},${center + midRadius * s1}
        L ${center + radius * c1},${center + radius * s1}
        A ${radius},${radius} 0 0,1 ${center + radius * c2},${center + radius * s2}
        L ${center + midRadius * c2},${center + midRadius * s2}
        A ${midRadius},${midRadius} 0 0,0 ${center + midRadius * c1},${center + midRadius * s1}
        Z
      `;

      segs.push({ d: dOuter, value: valOuter, inRange: outerInRange });
      segs.push({ d: dInner, value: valInner, inRange: innerInRange });
    }
    return segs;
  }, [hourlyData]);

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
          fill={seg.inRange ? (LOGBOOK_WEATHER_COLORS[seg.value] || 'white') : '#e5e7eb'}
          stroke="#000"
          strokeWidth="0.5"
        />
      ))}
      <circle cx={center} cy={center} r={radius} fill="none" stroke="#000" strokeWidth="1.2" />
      <circle cx={center} cy={center} r={midRadius} fill="none" stroke="#000" strokeWidth="0.6" />
      <circle cx={center} cy={center} r={innerRadius} fill="white" stroke="#000" strokeWidth="0.5" />
    </svg>
  );
}
