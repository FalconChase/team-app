import React, { useState, useRef, useEffect } from 'react';
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

// A4 landscape in px at 96dpi
const A4_W_PX = (297 / 25.4) * 96; // ~1122px
const A4_H_PX = (210 / 25.4) * 96; // ~794px

function ScaleToFit({ children }) {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(([entry]) => {
      const availW = entry.contentRect.width - 64;
      const scaleW = availW / A4_W_PX;
      setScale(Math.min(scaleW, 1)); // scale to width only, never upscale
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const scaledHeight = A4_H_PX * scale;

  return (
    <div ref={containerRef} className="wt-scale-outer">
      <div style={{ height: scaledHeight + 32 }}>
        <div
          className="wt-scale-inner"
          style={{
            width: A4_W_PX,
            height: A4_H_PX,
            transform: `scale(${scale})`,
            transformOrigin: 'top center',
          }}
        >
          {children}
        </div>
      </div>
    </div>
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

        {/* Preview area */}
        {(activeTab === 'chart' || activeTab === 'logbook' || activeTab === 'report' || activeTab === 'standard-format') && (
          <div className="wt-preview-area">
            {activeTab === 'report' ? (
              <div className="wt-a4-portrait">
                <ReportView data={weatherData} contractInfo={contractInfo} />
              </div>
            ) : activeTab === 'standard-format' ? (
              <ScaleToFit>
                <StandardFormatView data={weatherData} contractInfo={contractInfo} />
              </ScaleToFit>
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

      {/* PRINT OVERLAY — hidden on screen, visible only when printing */}
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