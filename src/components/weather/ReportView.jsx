import React from 'react';
import { LOGBOOK_WEATHER_COLORS } from '../../constants/weatherConstants';
import { getStatusLabel, getWeatherDescription, isUnworkable } from '../../utils/weatherLogic';

export function ReportView({ data, contractInfo }) {
  const days = data.map((hourly, idx) => {
    const isEmpty = hourly.every(v => v === 0);
    return {
      date: idx + 1,
      hourly,
      isEmpty,
      status: getStatusLabel(hourly),
      weather: getWeatherDescription(hourly),
      isUnworkable: !isEmpty && isUnworkable(hourly),
    };
  });

  const totalUnworkable = days.filter(d => d.isUnworkable).length;

  return (
    <div style={{
      width: '100%',
      maxWidth: '190mm',
      margin: '0 auto',
      fontFamily: 'sans-serif',
      color: 'black',
      display: 'flex',
      flexDirection: 'column',
      background: 'white',
      height: '100%',
    }}>

      {/* HEADER */}
      <div style={{ marginBottom: '8px', textAlign: 'center' }}>
        <div style={{ fontSize: '8pt', fontWeight: 'bold', textTransform: 'uppercase' }}>
          REPUBLIC OF THE PHILIPPINES
        </div>
        <div style={{ fontSize: '10pt', fontWeight: 'bold' }}>
          DEPARTMENT OF PUBLIC WORKS AND HIGHWAYS
        </div>
        <div style={{ fontSize: '9pt', fontWeight: 'bold', textTransform: 'uppercase' }}>
          {contractInfo.officeName || 'REGIONAL OFFICE XIII'}
        </div>
        <div style={{ fontSize: '8pt' }}>{contractInfo.officeAddress}</div>
      </div>

      <div style={{
        textAlign: 'center',
        marginBottom: '8px',
        borderBottom: '1px solid black',
        paddingBottom: '4px',
      }}>
        <h1 style={{ margin: 0, fontSize: '11pt', fontWeight: 'bold', textTransform: 'uppercase' }}>
          Monthly Transmission of Status Report
        </h1>
      </div>

      {/* PROJECT INFO */}
      <div style={{ marginBottom: '8px', fontSize: '8pt', width: '100%' }}>
        <table style={{ width: '100%' }}>
          <tbody>
            {[
              { label: 'PROJECT:', value: contractInfo.projectName },
              { label: 'LOCATION:', value: contractInfo.location },
              { label: 'MONTH:', value: contractInfo.month },
            ].map(({ label, value }) => (
              <tr key={label}>
                <td style={{ fontWeight: 'bold', width: '20mm', verticalAlign: 'top', padding: '2px 0' }}>
                  {label}
                </td>
                <td style={{
                  borderBottom: '1px solid black',
                  textTransform: 'uppercase',
                  fontWeight: 'bold',
                  padding: '2px 0',
                }}>
                  {value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MAIN TABLE */}
      <div style={{ flex: 1 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid black', fontSize: '8pt' }}>
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6' }}>
              {['DATE', '8 AM', '11 AM', '2 PM', '5 PM', 'STATUS', 'REMARKS'].map((col, i) => (
                <th
                  key={col}
                  style={{
                    border: '1px solid black',
                    padding: '2px 4px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    width: i === 5 ? '20%' : i === 6 ? '40%' : '8%',
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map((day) => {
              const hours = [7, 10, 13, 16];
              return (
                <tr key={day.date} style={{ height: '4.5mm' }}>
                  <td style={{
                    border: '1px solid black',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    backgroundColor: '#f9fafb',
                    padding: '0 4px',
                  }}>
                    {day.date}
                  </td>
                  {hours.map((hIdx) => {
                    const val = day.hourly[hIdx];
                    return (
                      <td
                        key={hIdx}
                        style={{
                          border: '1px solid black',
                          textAlign: 'center',
                          fontWeight: 'bold',
                          padding: '0 4px',
                          backgroundColor: val > 0 ? LOGBOOK_WEATHER_COLORS[val] : 'transparent',
                        }}
                      >
                        {val > 0 ? val : ''}
                      </td>
                    );
                  })}
                  <td style={{
                    border: '1px solid black',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    padding: '0 4px',
                    color: day.isUnworkable ? '#dc2626' : 'black',
                  }}>
                    {day.status}
                  </td>
                  <td style={{
                    border: '1px solid black',
                    textAlign: 'left',
                    padding: '0 4px',
                    fontWeight: '500',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {day.weather}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* SUMMARY */}
      <div style={{
        marginTop: '8px',
        border: '1px solid black',
        padding: '4px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
        marginBottom: '16px',
      }}>
        <div style={{ fontWeight: 'bold', fontSize: '9pt', textTransform: 'uppercase' }}>
          Total Unworkable Days:
        </div>
        <div style={{
          fontWeight: 'bold',
          fontSize: '10pt',
          color: '#dc2626',
          border: '1px solid #dc2626',
          padding: '0 24px',
          backgroundColor: 'white',
        }}>
          {totalUnworkable}
        </div>
      </div>

      {/* SIGNATORIES */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        padding: '0 16px',
      }}>
        <div style={{ textAlign: 'center', width: '40%' }}>
          <div style={{ borderBottom: '1px solid black', marginBottom: '4px' }} />
          <div style={{ fontWeight: 'bold', fontSize: '8pt', textTransform: 'uppercase' }}>
            Contractor Project Engineer
          </div>
        </div>
        <div style={{ textAlign: 'center', width: '40%' }}>
          <div style={{
            fontWeight: 'bold',
            fontSize: '9pt',
            textTransform: 'uppercase',
            textDecoration: 'underline',
            textUnderlineOffset: '2px',
            marginBottom: '2px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          }}>
            {contractInfo.signatoryName || '________________________'}
          </div>
          <div style={{ fontWeight: 'bold', fontSize: '8pt', textTransform: 'uppercase' }}>
            {contractInfo.signatoryDesignation}
          </div>
          <div style={{ fontSize: '7pt', marginTop: '2px', fontStyle: 'italic' }}>
            Prepared By
          </div>
        </div>
      </div>

    </div>
  );
}
