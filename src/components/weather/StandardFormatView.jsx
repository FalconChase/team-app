import React from 'react';
import { DAYS_IN_MONTH, LOGBOOK_WEATHER_COLORS, LOGBOOK_WEATHER_LABELS } from '../../constants/weatherConstants';
import { WeatherType } from '../../constants/weatherTypes';
import { StandardPie } from './StandardPie';

const DEFAULT_LOGO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Department_of_Public_Works_and_Highways_%28DPWH%29.svg/1280px-Department_of_Public_Works_and_Highways_%28DPWH%29.svg.png?20260123161510';

export function StandardFormatView({ data, contractInfo, hourRange }) {
  const days = Array.from({ length: DAYS_IN_MONTH }, (_, i) => i + 1);

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 0; }
          body { margin: 0; }
          .weather-chart-root { box-shadow: none !important; }
        }
      `}</style>

      {/* ROOT — full A4 landscape canvas: 297mm × 210mm */}
      <div
        className="weather-chart-root"
        style={{
          width: '297mm',
          height: '210mm',
          margin: '0 auto',
          position: 'relative',
          fontFamily: 'Arial, sans-serif',
          color: 'black',
          backgroundColor: 'white',
          boxSizing: 'border-box',
          boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
        }}
      >

        {/* FOOTNOTE */}
        <span style={{
          position: 'absolute',
          bottom: '1.5mm',
          right: '5mm',
          fontSize: '5px',
          fontWeight: 'bold',
          whiteSpace: 'nowrap',
          fontFamily: 'Arial, sans-serif',
        }}>
          PIF-04-PSR-04
        </span>

        {/* OUTER BORDER FRAME — AutoCAD (5,8.5) to (292,201.5) → 287mm × 193mm */}
        <div style={{
          position: 'absolute',
          top: '8.5mm',
          left: '5mm',
          width: '287mm',
          height: '193mm',
          border: '1px solid black',
          padding: '1.5px',
          boxSizing: 'border-box',
        }}>

          {/* INNER BORDER */}
          <div style={{
            width: '100%',
            height: '100%',
            border: '0.8px solid black',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}>

            {/* HEADER — height 26.5mm */}
            <div style={{
              height: '26.5mm',
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              boxSizing: 'border-box',
              padding: '0 1mm',
            }}>
              {/* Logo */}
              <div style={{
                width: '21mm',
                height: '21mm',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <img
                  src={contractInfo.logoUrl || DEFAULT_LOGO}
                  alt="DPWH Logo"
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                />
              </div>

              {/* Center text */}
              <div style={{
                flexGrow: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                lineHeight: 1.3,
              }}>
                <div style={{ fontSize: '7px', fontWeight: 'bold', letterSpacing: '0.06em' }}>
                  REPUBLIC OF THE PHILIPPINES
                </div>
                <div style={{ fontSize: '11px', fontWeight: 'bold' }}>
                  DEPARTMENT OF PUBLIC WORKS AND HIGHWAYS
                </div>
                <div style={{ fontSize: '9.5px', fontWeight: 'bold', color: '#1e3a8a' }}>
                  {contractInfo.officeName || 'REGIONAL OFFICE XIII'}
                </div>
                <div style={{ fontSize: '7.5px' }}>
                  {contractInfo.officeAddress || 'J. Rosales Avenue, Butuan City'}
                </div>
              </div>

              {/* Right spacer */}
              <div style={{ width: '21mm', flexShrink: 0 }} />
            </div>

            {/* WEATHER CHART LABEL — height 4.5mm */}
            <div style={{
              height: '4.5mm',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxSizing: 'border-box',
            }}>
              <span style={{ fontSize: '9px', fontWeight: 'bold', letterSpacing: '0.05em' }}>
                WEATHER CHART
              </span>
            </div>

            {/* PROJECT DETAILS — height 22mm */}
            <div style={{
              height: '22mm',
              flexShrink: 0,
              borderBottom: '1px solid black',
              display: 'grid',
              gridTemplateColumns: '7fr 3fr',
              boxSizing: 'border-box',
              padding: '1mm 3mm',
            }}>
              {/* Left column */}
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontSize: '9px' }}>
                {[
                  { label: 'CONTRACT ID  :', value: contractInfo.contractId,   noUnderline: true },
                  { label: 'CONTRACT NAME:', value: contractInfo.projectName,  noUnderline: false },
                  { label: 'LOCATION     :', value: contractInfo.location,     noUnderline: false },
                  { label: 'CONTRACTOR   :', value: contractInfo.contractor,   noUnderline: false },
                ].map(({ label, value, noUnderline }) => (
                  <div key={label} style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: '2px',
                    paddingBottom: '1px',
                  }}>
                    <span style={{ fontWeight: 'bold', whiteSpace: 'pre', flexShrink: 0 }}>
                      {label}
                    </span>
                    <span style={{
                      flexGrow: 1,
                      borderBottom: noUnderline ? 'none' : '0.8px solid black',
                      minHeight: '10px',
                      paddingLeft: '2px',
                    }}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Right column — MONTH + YEAR */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                fontSize: '9px',
                paddingLeft: '3mm',
              }}>
                <div style={{ flex: 1 }} />
                {[
                  { label: 'MONTH:', value: contractInfo.month },
                  { label: 'YEAR :', value: contractInfo.year },
                ].map(({ label, value }) => (
                  <div key={label} style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: '2px',
                    paddingBottom: '1px',
                  }}>
                    <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap', flexShrink: 0 }}>{label}</span>
                    <span style={{
                      flexGrow: 1,
                      borderBottom: '0.8px solid black',
                      minHeight: '10px',
                      paddingLeft: '2px',
                    }}>
                      {value}
                    </span>
                  </div>
                ))}
                <div style={{ flex: 1 }} />
              </div>
            </div>

            {/* MAIN GRID — 7 cols × 5 rows */}
            <div style={{
              flex: 1,
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gridTemplateRows: 'repeat(5, 1fr)',
              borderTop: '1px solid black',
              borderLeft: '1px solid black',
              overflow: 'hidden',
              minHeight: 0,
            }}>
              {/* Days 1–31 */}
              {days.map((day) => (
                <div key={day} style={{
                  borderRight: '1px solid black',
                  borderBottom: '1px solid black',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  minWidth: 0,
                  minHeight: 0,
                }}>
                  <StandardPie dayNumber={day} hourlyData={data[day - 1]} hourRange={hourRange} />
                </div>
              ))}

              {/* SPECIAL WIDE CELL — Row 5, cols 4–7 */}
              <div style={{
                gridColumn: 'span 4',
                borderRight: '1px solid black',
                borderBottom: '1px solid black',
                display: 'flex',
                flexDirection: 'row',
                overflow: 'hidden',
                minWidth: 0,
                minHeight: 0,
              }}>

                {/* Explanation pie — left 30% */}
                <div style={{
                  width: '30%',
                  height: '100%',
                  flexShrink: 0,
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  overflow: 'hidden',
                  padding: '1px',
                  boxSizing: 'border-box',
                }}>
                  <div style={{ width: '60%', height: '100%', flexShrink: 0 }}>
                    <StandardPie isExplanation={true} />
                  </div>
                  <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    gap: '3px',
                    paddingLeft: '2px',
                  }}>
                    {['DATE', 'Night Time', 'Day Time'].map((label) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '1px' }}>
                        <svg width="14" height="6" viewBox="0 0 14 6" style={{ flexShrink: 0 }}>
                          <defs>
                            <marker
                              id={`arr-${label.replace(' ', '')}`}
                              markerWidth="4"
                              markerHeight="4"
                              refX="3"
                              refY="2"
                              orient="auto"
                            >
                              <polyline points="4,0 0,2 4,4" fill="none" stroke="black" strokeWidth="0.8" />
                            </marker>
                          </defs>
                          <line
                            x1="14" y1="3" x2="3" y2="3"
                            stroke="black"
                            strokeWidth="0.8"
                            markerEnd={`url(#arr-${label.replace(' ', '')})`}
                          />
                        </svg>
                        <span style={{ fontSize: '4.5px', fontWeight: 'bold', whiteSpace: 'nowrap', lineHeight: 1 }}>
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Legend text — mid 30% */}
                <div style={{
                  width: '30%',
                  height: '100%',
                  flexShrink: 0,
                  borderRight: '1px solid black',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  justifyContent: 'flex-start',
                  padding: '3px 4px',
                  overflow: 'hidden',
                  boxSizing: 'border-box',
                }}>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: 'bold',
                    borderBottom: '0.8px solid black',
                    width: '100%',
                    paddingBottom: '1px',
                    marginBottom: '2px',
                    whiteSpace: 'nowrap',
                  }}>
                    LEGEND:
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                    {Object.entries(WeatherType)
                      .filter(([, val]) => typeof val === 'number' && val !== 0)
                      .map(([key, val]) => (
                        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <div style={{
                            width: '20px',
                            height: '10px',
                            border: '0.8px solid black',
                            backgroundColor: LOGBOOK_WEATHER_COLORS[val],
                            flexShrink: 0,
                          }} />
                          <span style={{
                            fontSize: '12px',
                            fontWeight: 'bold',
                            textTransform: 'uppercase',
                            lineHeight: 1,
                            whiteSpace: 'nowrap',
                          }}>
                            {LOGBOOK_WEATHER_LABELS[val]}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Signature — right flex-1 */}
                <div style={{
                  flex: 1,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '4px 6px',
                  overflow: 'hidden',
                  boxSizing: 'border-box',
                }}>
                  <div style={{ fontSize: '9px', fontWeight: 'bold' }}>Prepared by:</div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    <div style={{
                      fontWeight: 'bold',
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      borderBottom: '1px solid black',
                      paddingBottom: '2px',
                      width: '90%',
                      marginBottom: '2px',
                    }}>
                      {contractInfo.signatoryName || 'NAME & SIGNATURE'}
                    </div>
                    <div style={{ fontSize: '9px', fontWeight: 'bold' }}>
                      {contractInfo.signatoryDesignation || 'Project Engineer'}
                    </div>
                  </div>
                </div>

              </div>
            </div>{/* end main grid */}

          </div>{/* end inner border */}
        </div>{/* end outer border */}

      </div>{/* end root */}
    </>
  );
}
