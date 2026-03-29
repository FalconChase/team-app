import React, { useState, useEffect } from 'react';
import {
  collection, addDoc, getDocs, deleteDoc,
  doc, query, orderBy, serverTimestamp
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';

export function WeatherLogsModal({ isOpen, onClose, contractInfo, weatherData, onLoad }) {
  const { userProfile } = useAuth();
  const [activeTab, setActiveTab]   = useState('load');
  const [logs, setLogs]             = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError]           = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Auto-generate label from contractInfo
  const autoLabel = [
    contractInfo.contractId || 'NO-ID',
    contractInfo.month      || 'NO-MONTH',
    contractInfo.year       || 'NO-YEAR',
    'weather-chart'
  ].join('-');

  const [label, setLabel] = useState(autoLabel);

  // Sync label when contractInfo changes or modal opens on save tab
  useEffect(() => {
    setLabel(autoLabel);
  }, [contractInfo.contractId, contractInfo.month, contractInfo.year, activeTab]);

  // Fetch logs when modal opens or tab switches to load
  useEffect(() => {
    if (!isOpen || !userProfile?.teamId) return;
    if (activeTab === 'load') fetchLogs();
  }, [isOpen, activeTab, userProfile?.teamId]);

  // Reset messages on tab change
  useEffect(() => {
    setError('');
    setSuccessMsg('');
    setConfirmDeleteId(null);
  }, [activeTab]);

  async function fetchLogs() {
    setLoadingLogs(true);
    setError('');
    try {
      const ref = collection(db, 'teams', userProfile.teamId, 'weatherLogs');
      const q   = query(ref, orderBy('savedAt', 'desc'));
      const snap = await getDocs(q);
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      setError('Failed to load snapshots. Please try again.');
    } finally {
      setLoadingLogs(false);
    }
  }

  async function handleSave() {
    if (!label.trim()) { setError('Please enter a name for this snapshot.'); return; }
    setSaving(true);
    setError('');
    setSuccessMsg('');
    try {
      const snapshot = {
        label: label.trim(),
        contractInfo: {
          contractId:  contractInfo.contractId  || '',
          projectName: contractInfo.projectName || '',
          location:    contractInfo.location    || '',
          contractor:  contractInfo.contractor  || '',
          month:       contractInfo.month       || '',
          year:        contractInfo.year        || '',
        },
        weatherData,
        savedAt: serverTimestamp(),
        savedBy: userProfile.displayName || userProfile.username || 'Unknown',
      };
      await addDoc(
        collection(db, 'teams', userProfile.teamId, 'weatherLogs'),
        snapshot
      );
      setSuccessMsg(`Snapshot "${label.trim()}" saved successfully.`);
    } catch (err) {
      setError('Failed to save snapshot. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(logId) {
    setDeletingId(logId);
    setError('');
    try {
      await deleteDoc(doc(db, 'teams', userProfile.teamId, 'weatherLogs', logId));
      setLogs(prev => prev.filter(l => l.id !== logId));
      setConfirmDeleteId(null);
    } catch (err) {
      setError('Failed to delete snapshot.');
    } finally {
      setDeletingId(null);
    }
  }

  function handleLoad(log) {
    onLoad({
      weatherData: log.weatherData,
      contractInfo: log.contractInfo,
    });
    onClose();
  }

  function formatDate(ts) {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-PH', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  if (!isOpen) return null;

  return (
    <div className="wt-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="wt-modal wt-logs-modal">

        {/* HEADER */}
        <div className="wt-modal-head">
          <h3>💾 Weather Log Snapshots</h3>
          <button className="wt-modal-close" onClick={onClose}>✕</button>
        </div>

        {/* TABS */}
        <div className="wt-logs-tabs">
          <button
            className={`wt-logs-tab${activeTab === 'load' ? ' active' : ''}`}
            onClick={() => setActiveTab('load')}
          >
            📂 Load Snapshot
          </button>
          <button
            className={`wt-logs-tab${activeTab === 'save' ? ' active' : ''}`}
            onClick={() => setActiveTab('save')}
          >
            💾 Save Snapshot
          </button>
        </div>

        {/* BODY */}
        <div className="wt-modal-body">

          {error      && <div className="wt-modal-error">{error}</div>}
          {successMsg && <div className="wt-modal-success">{successMsg}</div>}

          {/* ── SAVE TAB ── */}
          {activeTab === 'save' && (
            <div className="wt-logs-save">
              <p className="wt-logs-hint">
                This saves the current weather grid and project details as a reloadable snapshot.
                Signatory and office details are <strong>not</strong> included.
              </p>

              <div className="wt-logs-preview-fields">
                <div className="wt-logs-preview-row">
                  <span>Contract ID</span>
                  <strong>{contractInfo.contractId || <em>empty</em>}</strong>
                </div>
                <div className="wt-logs-preview-row">
                  <span>Project</span>
                  <strong>{contractInfo.projectName || <em>empty</em>}</strong>
                </div>
                <div className="wt-logs-preview-row">
                  <span>Period</span>
                  <strong>{contractInfo.month || '—'} {contractInfo.year || ''}</strong>
                </div>
              </div>

              <div className="wt-modal-field-full" style={{ marginTop: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                  Snapshot Name
                </label>
                <input
                  type="text"
                  className="wt-logs-label-input"
                  value={label}
                  onChange={e => setLabel(e.target.value)}
                  placeholder="e.g. 1122222111-March-2025-weather-chart"
                />
                <p className="wt-hint">Auto-filled from project details. You can rename it.</p>
              </div>

              <div className="wt-modal-actions">
                <button className="wt-modal-cancel" onClick={onClose}>Cancel</button>
                <button
                  className="wt-modal-submit"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? 'Saving…' : '💾 Save Snapshot'}
                </button>
              </div>
            </div>
          )}

          {/* ── LOAD TAB ── */}
          {activeTab === 'load' && (
            <div className="wt-logs-load">
              {loadingLogs ? (
                <div className="wt-logs-empty">Loading snapshots…</div>
              ) : logs.length === 0 ? (
                <div className="wt-logs-empty">
                  No snapshots saved yet. Switch to the <strong>Save</strong> tab to create one.
                </div>
              ) : (
                <div className="wt-logs-list">
                  {logs.map(log => (
                    <div key={log.id} className="wt-log-card">
                      <div className="wt-log-card-main">
                        <div className="wt-log-card-label">{log.label}</div>
                        <div className="wt-log-card-meta">
                          <span>📅 {log.contractInfo?.month} {log.contractInfo?.year}</span>
                          <span>🪪 {log.contractInfo?.contractId || '—'}</span>
                          <span>👤 {log.savedBy}</span>
                          <span>🕒 {formatDate(log.savedAt)}</span>
                        </div>
                      </div>
                      <div className="wt-log-card-actions">
                        {confirmDeleteId === log.id ? (
                          <>
                            <span className="wt-log-confirm-text">Delete?</span>
                            <button
                              className="wt-log-btn wt-log-btn-danger"
                              onClick={() => handleDelete(log.id)}
                              disabled={deletingId === log.id}
                            >
                              {deletingId === log.id ? '…' : 'Yes'}
                            </button>
                            <button
                              className="wt-log-btn wt-log-btn-cancel"
                              onClick={() => setConfirmDeleteId(null)}
                            >
                              No
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="wt-log-btn wt-log-btn-load"
                              onClick={() => handleLoad(log)}
                            >
                              ↩ Load
                            </button>
                            <button
                              className="wt-log-btn wt-log-btn-danger"
                              onClick={() => setConfirmDeleteId(log.id)}
                            >
                              🗑
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
