import React, { useState } from 'react';
import { InputTable } from '../components/weather/InputTable';
import { ChartLayout } from '../components/weather/ChartLayout';
import { ReportView } from '../components/weather/ReportView';
import { HeaderForm } from '../components/weather/HeaderForm';
import { AutoGenerateModal } from '../components/weather/AutoGenerateModal';
import { StandardFormatView } from '../components/weather/StandardFormatView';
import { WeatherLogsModal } from '../components/weather/WeatherLogsModal';
import { DAYS_IN_MONTH, HOURS_IN_DAY, INITIAL_CONTRACT_INFO } from '../constants/weatherConstants';
import { generateRangeData } from '../utils/weatherLogic';
import '../styles/weather-tool.css';
import { useAuth } from '../contexts/AuthContext';   // ← added for audit logging
import { useTeam } from '../contexts/TeamContext';   // ← added for audit logging
import { logAction } from '../utils/logAction';      // ← added for audit logging

const TABS = [
  { id: 'input',           label: 'Inputs' },
  { id: 'chart',           label: 'Chart' },
  { id: 'logbook',         label: 'Logbook' },
  { id: 'report',          label: 'Report' },
  { id: 'standard-format', label: 'Standard Format' },
];

// ── Hour-range mode definitions ───────────────────────────────────────────────
const HOUR_MODES = [
  { id: '24h', label: '24-Hour', start: 0,  end: 23 },
  { id: '12h', label: '12-Hour', start: 6,  end: 17 },  // renders G–R (indices 6–17)
];

function makeEmptyGrid() {
  return Array.from({ length: DAYS_IN_MONTH }, () =>
    Array.from({ length: HOURS_IN_DAY }, () => 0)
  );
}

// ── Format an hour number as display label (e.g. 0 → "12 AM", 13 → "1 PM") ──
// endLabel=true returns the closing hour of that slot (e.g. index 17 → "6 PM" not "5 PM")
function fmtHour(h) {
  if (h === 0)  return '12 AM';
  if (h === 12) return '12 PM';
  if (h === 24) return '12 AM';
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

export default function WeatherTool() {
  // ── Auth context (for audit logging) ────────────────────────────────────────
  const { userProfile } = useAuth();
  const { team }        = useTeam();

  const [activeTab, setActiveTab]               = useState('input');
  const [contractInfo, setContractInfo]         = useState(INITIAL_CONTRACT_INFO);
  const [isAutoGenerateOpen, setAutoGenOpen]    = useState(false);
  const [isLogsOpen, setLogsOpen]               = useState(false);
  const [weatherData, setWeatherData]           = useState(makeEmptyGrid);

  // ── Hour-range state ─────────────────────────────────────────────────────────
  const [hourMode,        setHourMode]          = useState('24h');
  const [customStart,     setCustomStart]       = useState(0);
  const [customEnd,       setCustomEnd]         = useState(23);

  // ── Derive the active start/end from current mode ────────────────────────────
  const activeStart = hourMode === 'custom'
    ? customStart
    : HOUR_MODES.find(m => m.id === hourMode).start;
  const activeEnd   = hourMode === 'custom'
    ? customEnd
    : HOUR_MODES.find(m => m.id === hourMode).end;

  // ── Slice each day's hourly array to only the selected window ────────────────
  // weatherData (full 24h) is NEVER mutated — this is a derived display value only
  const hourRange = { start: activeStart, end: activeEnd };

  const handleDataChange = (dayIdx, hourIdx, value) => {
    setWeatherData(prev => {
      const next = [...prev];
      next[dayIdx] = [...next[dayIdx]];
      next[dayIdx][hourIdx] = value;
      return next;
    });
  };

  const handleAutoGenerate = (startDay, endDay, unworkableCount) => {
    setWeatherData(prev => generateRangeData(startDay, endDay, unworkableCount, prev));

    // ── Audit log ────────────────────────────────────────────────────────────
    logAction({
      teamId:      userProfile?.teamId || team?.id,
      action:      `Auto-generated weather data (Days ${startDay}–${endDay}, ${unworkableCount} unworkable hours)`,
      category:    "weather",
      performedBy: userProfile?.displayName || userProfile?.email || "Unknown",
      targetName:  contractInfo?.projectName || null,
    });
  };

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear all weather data? This cannot be undone.')) {
      setWeatherData(makeEmptyGrid());

      // ── Audit log ──────────────────────────────────────────────────────────
      logAction({
        teamId:      userProfile?.teamId || team?.id,
        action:      "Cleared all weather data",
        category:    "weather",
        performedBy: userProfile?.displayName || userProfile?.email || "Unknown",
        targetName:  contractInfo?.projectName || null,
      });
    }
  };

  const handlePrint = () => {
    const isReport = activeTab === 'report';
    const pageSize = isReport ? 'A4 portrait' : 'A4 landscape';

    // Grab all stylesheets from the current page
    const styles = Array.from(document.styleSheets)
      .map(sheet => {
        try {
          return Array.from(sheet.cssRules).map(r => r.cssText).join('\n');
        } catch {
          // Cross-origin sheets — link them instead
          return sheet.href ? `@import url("${sheet.href}");` : '';
        }
      })
      .join('\n');

    // Grab just the printable content
    const printEl = document.getElementById('wt-print-target');
    if (!printEl) return;
    const html = printEl.innerHTML;

    const win = window.open('', '_blank');
    if (!win) {
      alert('Please allow popups for this site to enable printing.');
      return;
    }

    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            ${styles}
            @media print {
              @page { size: ${pageSize}; margin: 0; }
              body { margin: 0; background: white; }
            }
            body { margin: 0; background: white; }
          </style>
        </head>
        <body>${html}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      win.close();
    }, 500);
  };

  // ── Hour-range control bar (shown only on chart/logbook/standard-format) ─────
  const isPreviewTab = ['chart', 'logbook', 'standard-format'].includes(activeTab);
  const isLogbook    = activeTab === 'logbook';

  return (
    <div className="wt-page">

      {/* NAVBAR */}
      <header className="wt-header">
        <div className="wt-header-inner">

          <div className="wt-brand">
            <div className="wt-brand-icon">⊞</div>
            <h1 className="wt-brand-title">DPWH PCMA Weather Tool</h1>
          </div>

          <div className="wt-controls">
            {/* Tab group */}
            <div className="wt-tab-group">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  className={`wt-tab${activeTab === tab.id ? ' active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="wt-divider" />

            <button className="wt-btn wt-btn-red" onClick={handleClear}>
              🗑 Clear
            </button>
            <button className="wt-btn wt-btn-purple" onClick={() => setAutoGenOpen(true)}>
              ✦ Auto Generate
            </button>
            <button className="wt-btn wt-btn-teal" onClick={() => setLogsOpen(true)}>
              💾 Logs
            </button>
            <button className="wt-btn wt-btn-blue" onClick={handlePrint}>
              🖨 Print
            </button>
          </div>

        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="wt-main">

        {/* Header form */}
        <p className="wt-section-label">PCMA Project Metadata</p>
        <HeaderForm info={contractInfo} onChange={setContractInfo} />

        {/* ── Hour-range control bar ── */}
        {isPreviewTab && (
          <div className="wt-hour-range-bar">

            <span className="wt-hour-range-label">Hour View:</span>

            {/* Mode pill buttons */}
            <div className="wt-hour-mode-group">
              {HOUR_MODES.map(mode => (
                <button
                  key={mode.id}
                  className={`wt-hour-mode-btn${hourMode === mode.id ? ' active' : ''}`}
                  onClick={() => setHourMode(mode.id)}
                  title={`${fmtHour(mode.start + 1)} – ${fmtHour(mode.end + 1)}`}
                >
                  {mode.label}
                </button>
              ))}
              <button
                className={`wt-hour-mode-btn${hourMode === 'custom' ? ' active' : ''}`}
                onClick={() => setHourMode('custom')}
              >
                Custom
              </button>
            </div>

            {/* Custom hour selectors — only visible when mode is 'custom' */}
            {hourMode === 'custom' && (
              <div className="wt-hour-custom-selectors">
                <label className="wt-hour-custom-label">
                  From
                  <select
                    className="wt-hour-select"
                    value={customStart}
                    onChange={e => {
                      const val = Number(e.target.value);
                      setCustomStart(val);
                      if (val > customEnd) setCustomEnd(val);
                    }}
                  >
                    {Array.from({ length: 24 }, (_, h) => (
                      <option key={h} value={h}>{fmtHour(h + 1)}</option>
                    ))}
                  </select>
                </label>
                <label className="wt-hour-custom-label">
                  To
                  <select
                    className="wt-hour-select"
                    value={customEnd}
                    onChange={e => {
                      const val = Number(e.target.value);
                      setCustomEnd(val);
                      if (val < customStart) setCustomStart(val);
                    }}
                  >
                    {Array.from({ length: 24 }, (_, h) => (
                      <option key={h} value={h}>{fmtHour(h + 1)}</option>
                    ))}
                  </select>
                </label>
                <span className="wt-hour-custom-summary">
                  {activeEnd - activeStart + 1}h window
                </span>
              </div>
            )}

            {/* Active range display */}
            <span className="wt-hour-range-display">
              {fmtHour(activeStart + 1)} – {fmtHour(activeEnd + 1)}
            </span>

            {/* Logbook lock notice */}
            {isLogbook && (
              <span className="wt-hour-range-locked" title="Logbook uses a dual AM/PM ring structure that requires all 24 hours to render correctly.">
                🔒 Logbook locked to 24h
              </span>
            )}

          </div>
        )}

        {/* Input tab */}
        {activeTab === 'input' && (
          <div className="wt-input-wrapper">
            <InputTable data={weatherData} onDataChange={handleDataChange} />
          </div>
        )}

        {/* Preview area */}
        {(activeTab === 'chart' || activeTab === 'logbook' || activeTab === 'report' || activeTab === 'standard-format') && (
          <div className="wt-preview-area">
            <div id="wt-print-target">
              {activeTab === 'report' ? (
                <div className="wt-a4-portrait">
                  <ReportView data={weatherData} contractInfo={contractInfo} />
                </div>
              ) : activeTab === 'standard-format' ? (
                <StandardFormatView
                  data={weatherData}
                  contractInfo={contractInfo}
                  hourRange={hourRange}
                />
              ) : (
                <div className="wt-a4-landscape">
                  <ChartLayout
                    data={weatherData}
                    contractInfo={contractInfo}
                    variant={activeTab === 'logbook' ? 'logbook' : 'standard'}
                    hourRange={hourRange}
                  />
                </div>
              )}
            </div>
          </div>
        )}

      </main>

      {/* AUTO GENERATE MODAL */}
      <AutoGenerateModal
        isOpen={isAutoGenerateOpen}
        onClose={() => setAutoGenOpen(false)}
        onGenerate={handleAutoGenerate}
      />

      {/* LOGS MODAL */}
      <WeatherLogsModal
        isOpen={isLogsOpen}
        onClose={() => setLogsOpen(false)}
        contractInfo={contractInfo}
        weatherData={weatherData}
        onLoad={(info, data) => {
          setContractInfo(info);
          setWeatherData(data);
        }}
      />

    </div>
  );
}