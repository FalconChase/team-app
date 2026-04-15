import React from 'react';
import { LOGBOOK_WEATHER_COLORS } from '../../constants/weatherConstants';

export function StandardPie({ dayNumber, hourlyData = [], isExplanation = false, hourRange }) {
  const center = 50;
  const outerRadius  = 39;
  const middleRadius = 26;
  const innerRadius  = 13;

  const renderRing = (isInner, innerR, outerR) => {
    const anglePerSlice = 360 / 12;
    return [...Array(12)].map((_, i) => {
      const startAngleDeg = i * anglePerSlice - 90;
      const endAngleDeg   = (i + 1) * anglePerSlice - 90;
      const startRad = (startAngleDeg * Math.PI) / 180;
      const endRad   = (endAngleDeg * Math.PI) / 180;

      const x1o = center + outerR * Math.cos(startRad);
      const y1o = center + outerR * Math.sin(startRad);
      const x2o = center + outerR * Math.cos(endRad);
      const y2o = center + outerR * Math.sin(endRad);
      const x1i = center + innerR * Math.cos(startRad);
      const y1i = center + innerR * Math.sin(startRad);
      const x2i = center + innerR * Math.cos(endRad);
      const y2i = center + innerR * Math.sin(endRad);

      const d = `
        M ${x1i},${y1i}
        L ${x1o},${y1o}
        A ${outerR},${outerR} 0 0,1 ${x2o},${y2o}
        L ${x2i},${y2i}
        A ${innerR},${innerR} 0 0,0 ${x1i},${y1i}
        Z
      `;

      const hourIdx = isInner ? i + 12 : i;
      const inRange = isExplanation || !hourRange || (hourIdx >= hourRange.start && hourIdx <= hourRange.end);
      const val = inRange ? (hourlyData[hourIdx] || 0) : 0;
      return (
        <path
          key={hourIdx}
          d={d}
          fill={inRange ? (LOGBOOK_WEATHER_COLORS[val] || '#ffffff') : '#e5e7eb'}
          stroke="#000000"
          strokeWidth="0.5"
        />
      );
    });
  };

  const renderHourLabels = () => {
    const hoursToShow = isExplanation
      ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
      : [3, 6, 9, 12];

    return hoursToShow.map((hour) => {
      const angle = (hour * 30 - 90) * (Math.PI / 180);
      const x = center + (outerRadius + 4) * Math.cos(angle);
      const y = center + (outerRadius + 4) * Math.sin(angle);
      return (
        <text
          key={hour}
          x={x}
          y={y}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="4.5"
          fontWeight="bold"
          fill="black"
          fontFamily="Arial, sans-serif"
        >
          {hour}
        </text>
      );
    });
  };

  const renderRadialLines = () =>
    [...Array(12)].map((_, i) => {
      const angle = (i * 30 - 90) * (Math.PI / 180);
      const x1 = center + innerRadius * Math.cos(angle);
      const y1 = center + innerRadius * Math.sin(angle);
      const x2 = center + outerRadius * Math.cos(angle);
      const y2 = center + outerRadius * Math.sin(angle);
      return (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="black" strokeWidth="0.5" />
      );
    });

  return (
    <svg
      viewBox="0 0 100 100"
      style={{ width: '100%', height: '100%' }}
      preserveAspectRatio="xMidYMid meet"
    >
      {renderRing(false, middleRadius, outerRadius)}
      {renderRing(true, innerRadius, middleRadius)}
      {renderRadialLines()}
      <circle cx={center} cy={center} r={outerRadius}  fill="none" stroke="black" strokeWidth="0.8" />
      <circle cx={center} cy={center} r={middleRadius} fill="none" stroke="black" strokeWidth="0.5" />
      <circle cx={center} cy={center} r={innerRadius}  fill="none" stroke="black" strokeWidth="0.5" />
      {renderHourLabels()}
      <text
        x={center}
        y={center}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={isExplanation ? '10' : '14'}
        fontWeight="bold"
        fill="black"
        fontFamily="Arial, sans-serif"
      >
        {isExplanation ? '1' : dayNumber}
      </text>
    </svg>
  );
}
