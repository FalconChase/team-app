import React, { useState } from 'react';
import { InputTable } from '../components/weather/InputTable';
import { ChartLayout } from '../components/weather/ChartLayout';
import { ReportView } from '../components/weather/ReportView';
import { HeaderForm } from '../components/weather/HeaderForm';
import { AutoGenerateModal } from '../components/weather/AutoGenerateModal';
import { StandardFormatView } from '../components/weather/StandardFormatView';
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

  const handlePrint = () => window.print();

  const isReport = activeTab === 'report';

  const printStyles = `
    @media print {
      @page {
        size: ${isReport ? 'A4 portrait' : 'A4 landscape'};
        margin: ${isReport ? '5mm' : '0'};
      }
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  `;

  return (
    <div className="wt-page">
      <style>{printStyles}</style>

      {/* NAVBAR */}
      <header className="wt-header wt-no-print">
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
            <button className="wt-btn wt-btn-blue" onClick={handlePrint}>
              🖨 Print
            </button>
          </div>

        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="wt-main">

        {/* Header form — hidden on print */}
        <div className="wt-no-print">
          <p className="wt-section-label">PCMA Project Metadata</p>
          <HeaderForm info={contractInfo} onChange={setContractInfo} />
        </div>

        {/* Input tab */}
        {activeTab === 'input' && (
          <div className="wt-input-wrapper">
            <InputTable data={weatherData} onDataChange={handleDataChange} />
          </div>
        )}

        {/* Preview area for chart/logbook/report/standard-format */}
        {(activeTab === 'chart' || activeTab === 'logbook' || activeTab === 'report' || activeTab === 'standard-format') && (
          <div className="wt-preview-area">
            {activeTab === 'report' ? (
              <div className="wt-a4-portrait">
                <ReportView data={weatherData} contractInfo={contractInfo} />
              </div>
            ) : activeTab === 'standard-format' ? (
              <div className="wt-a4-landscape">
                <StandardFormatView data={weatherData} contractInfo={contractInfo} />
              </div>
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
        )}

      </main>

      {/* AUTO GENERATE MODAL */}
      <AutoGenerateModal
        isOpen={isAutoGenerateOpen}
        onClose={() => setAutoGenOpen(false)}
        onGenerate={handleAutoGenerate}
      />

      {/* PRINT OVERLAY — controlled by CSS */}
      <div className="wt-printable">
        {activeTab === 'report' ? (
          <ReportView data={weatherData} contractInfo={contractInfo} />
        ) : activeTab === 'standard-format' ? (
          <StandardFormatView data={weatherData} contractInfo={contractInfo} />
        ) : (
          <ChartLayout
            data={weatherData}
            contractInfo={contractInfo}
            variant={activeTab === 'logbook' ? 'logbook' : 'standard'}
          />
        )}
      </div>

    </div>
  );
}
