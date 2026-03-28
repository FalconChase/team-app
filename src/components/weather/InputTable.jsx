import React, { useRef, useEffect } from 'react';
import { DAYS_IN_MONTH, HOURS_IN_DAY, WEATHER_COLORS, WEATHER_LABELS } from '../../constants/weatherConstants';

export function InputTable({ data, onDataChange }) {
  const hours = Array.from({ length: HOURS_IN_DAY }, (_, i) => i + 1);
  const days  = Array.from({ length: DAYS_IN_MONTH }, (_, i) => i + 1);

  const isDragging     = useRef(false);
  const dragStartValue = useRef(0);

  const getColLabel = (index) => String.fromCharCode(65 + index);

  useEffect(() => {
    const handleGlobalMouseUp = () => { isDragging.current = false; };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  const handleInputChange = (dayIdx, hourIdx, valStr) => {
    let val = parseInt(valStr, 10);
    if (isNaN(val)) val = 0;
    if (val < 0) val = 0;
    if (val > 4) val = 4;
    onDataChange(dayIdx, hourIdx, val);
  };

  const handleKeyDown = (e, dayIdx, hourIdx) => {
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    e.preventDefault();
    let d = dayIdx;
    let h = hourIdx;
    if (e.key === 'ArrowUp')    d = Math.max(0, d - 1);
    if (e.key === 'ArrowDown')  d = Math.min(DAYS_IN_MONTH - 1, d + 1);
    if (e.key === 'ArrowLeft')  h = Math.max(0, h - 1);
    if (e.key === 'ArrowRight') h = Math.min(HOURS_IN_DAY - 1, h + 1);
    const el = document.getElementById(`wt-cell-${d}-${h}`);
    if (el) { el.focus(); el.select(); }
  };

  const handleMouseDown = (val) => {
    isDragging.current    = true;
    dragStartValue.current = val;
  };

  const handleMouseEnter = (dayIdx, hourIdx, e) => {
    if (isDragging.current && e.buttons === 1) {
      if (data[dayIdx][hourIdx] !== dragStartValue.current) {
        onDataChange(dayIdx, hourIdx, dragStartValue.current);
      }
    }
  };

  const handleFocus = (e) => e.target.select();

  return (
    <div className="wt-table-wrap">

      {/* Header */}
      <div className="wt-table-header">
        <div>
          <h2>Input Data</h2>
          <p>1=Fair, 2=Cloudy, 3=Showering, 4=Rainy/Stormy. Use arrow keys to navigate. Click and drag to paint.</p>
        </div>
        <div className="wt-legend-row">
          {Object.entries(WEATHER_LABELS).map(([key, label]) => (
            <div key={key} className="wt-legend-item">
              <div
                className="wt-legend-swatch"
                style={{ backgroundColor: WEATHER_COLORS[Number(key)] }}
              />
              <span>{Number(key)}: {label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Scrollable table */}
      <div className="wt-table-scroll">
        <table className="wt-data-table">
          <thead>
            <tr>
              <th>Day</th>
              {hours.map((h, i) => (
                <th key={h}>
                  <div>{h}</div>
                  <div style={{ fontWeight: 'normal', fontSize: '10px', color: '#6b7280' }}>
                    {getColLabel(i)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map((day, dayIdx) => (
              <tr key={day}>
                <td className="day-label">{day}</td>
                {hours.map((_, hourIdx) => {
                  const val   = data[dayIdx][hourIdx];
                  const color = val > 0 ? WEATHER_COLORS[val] : 'white';
                  return (
                    <td key={hourIdx}>
                      <input
                        id={`wt-cell-${dayIdx}-${hourIdx}`}
                        type="text"
                        maxLength={1}
                        aria-label={`Day ${dayIdx + 1}, Hour ${hourIdx + 1}`}
                        className="wt-cell-input"
                        style={{ backgroundColor: color }}
                        value={val === 0 ? '' : val}
                        onChange={(e) => handleInputChange(dayIdx, hourIdx, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, dayIdx, hourIdx)}
                        onMouseDown={() => handleMouseDown(val)}
                        onMouseEnter={(e) => handleMouseEnter(dayIdx, hourIdx, e)}
                        onFocus={handleFocus}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
