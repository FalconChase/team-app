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

const TABS = [
  { id: 'input',           label: 'Inputs' },
  { id: 'chart',           label: 'Chart' },
  { id: 'logbook',         label: 'Logbook' },
  { id: 'report',          label: 'Report' },
  { id: 'standard-format', label: 'Standard Format' },
];

function makeEmptyGrid() {
  return Array.from({ length: DAYS_IN_MONTH }, () =>
    Array.from({ length: HOURS_IN_DAY }, () => 0)
  );
}

export default function WeatherTool() {
  const [activeTab, setActiveTab]               = useState('input');
  const [contractInfo, setContractInfo]         = useState(INITIAL_CONTRACT_INFO);
  const [isAutoGenerateOpen, setAutoGenOpen]    = useState(false);
  const [isLogsOpen, setLogsOpen]               = useState(false);
  const [weatherData, setWeatherData]           = useState(makeEmptyGrid);

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
  };

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear all weather data? This cannot be undone.')) {
      setWeatherData(makeEmptyGrid());
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
                <StandardFormatView data={weatherData} contractInfo={contractInfo} />
              ) : (
                <div className="wt-a4-landscape">
                  <ChartLayout
                    data={weatherData}
                    contractInfo={contractInfo}
                    variant={activeTab === 'logbook' ? 'logbook' : 'standard'}
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