import React from 'react';
import { DAYS_IN_MONTH, WEATHER_COLORS, LOGBOOK_WEATHER_COLORS, WEATHER_LABELS, LOGBOOK_WEATHER_LABELS } from '../../constants/weatherConstants';
import { WeatherType } from '../../constants/weatherTypes';
import { DayPie } from './DayPie';
import { LogbookPie } from './LogbookPie';

const DEFAULT_LOGO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Department_of_Public_Works_and_Highways_%28DPWH%29.svg/1280px-Department_of_Public_Works_and_Highways_%28DPWH%29.svg.png?20260123161510';

export function ChartLayout({ data, contractInfo, variant = 'standard' }) {
  const days = Array.from({ length: DAYS_IN_MONTH }, (_, i) => i + 1);

  const PieComponent    = variant === 'logbook' ? LogbookPie : DayPie;
  const title           = variant === 'logbook' ? 'LOGBOOK WEATHER CHART' : 'WEATHER CHART';
  const currentColors   = variant === 'logbook' ? LOGBOOK_WEATHER_COLORS : WEATHER_COLORS;
  const currentLabels   = variant === 'logbook' ? LOGBOOK_WEATHER_LABELS : WEATHER_LABELS;

  return (
    <div className="wt-chart-root">

      {/* HEADER */}
      <div className="wt-chart-header">
        <div className="wt-chart-logo">
          <img
            src={contractInfo.logoUrl || DEFAULT_LOGO}
            alt="DPWH Logo"
          />
        </div>

        <div className="wt-chart-center-text">
          <div className="republic">REPUBLIC OF THE PHILIPPINES</div>
          <div className="dept">DEPARTMENT OF PUBLIC WORKS AND HIGHWAYS</div>
          <div className="office">{contractInfo.officeName || 'REGIONAL OFFICE XIII'}</div>
          <div className="address">{contractInfo.officeAddress}</div>
          <div className="wt-chart-meta">
            <div className="meta-item">
              <span className="meta-label">Project:</span>
              <span className="meta-value">{contractInfo.projectName}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Month:</span>
              <span className="meta-value">{contractInfo.month}</span>
            </div>
          </div>
        </div>

        <div className="wt-chart-right-spacer" />
      </div>

      {/* TITLE BAR */}
      <div className="wt-chart-title-bar">
        <span>{title}</span>
      </div>

      {/* 7x5 MAIN GRID */}
      <div className="wt-fixed-chart-grid">
        {days.map((day) => (
          <div key={day} className="wt-grid-cell">
            <div className="wt-day-label-overlay">Day {day}</div>
            <div className="wt-pie-wrapper">
              <PieComponent dayNumber="" hourlyData={data[day - 1]} />
            </div>
          </div>
        ))}

        {/* FOOTER — LEGEND (spans 2 cols) */}
        <div className="wt-footer-legend">
          <div className="legend-title">Legend:</div>
          <div className="wt-legend-grid">
            {Object.entries(WeatherType)
              .filter(([, val]) => typeof val === 'number' && val !== 0)
              .map(([key, val]) => (
                <div key={key} className="wt-legend-entry">
                  <div
                    className="wt-legend-swatch-sm"
                    style={{ backgroundColor: currentColors[val] }}
                  />
                  <span>{currentLabels[val]}</span>
                </div>
              ))}
          </div>
        </div>

        {/* FOOTER — SIGNATORY (spans 2 cols) */}
        <div className="wt-footer-signatory">
          <div className="prepared-label">Prepared by:</div>
          <div className="sig-name">
            <div className="sig-name-text">
              {contractInfo.signatoryName || '__________________________'}
            </div>
            <div className="sig-designation">
              {contractInfo.signatoryDesignation || 'Project Engineer'}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
