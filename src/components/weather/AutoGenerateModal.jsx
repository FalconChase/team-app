import React, { useState } from 'react';

export function AutoGenerateModal({ isOpen, onClose, onGenerate }) {
  const [startDay, setStartDay] = useState(1);
  const [endDay, setEndDay] = useState(31);
  const [unworkableCount, setUnworkableCount] = useState(0);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (startDay < 1 || startDay > 31) {
      setError('Start day must be between 1 and 31');
      return;
    }
    if (endDay < 1 || endDay > 31) {
      setError('End day must be between 1 and 31');
      return;
    }
    if (startDay > endDay) {
      setError('Start day cannot be after End day');
      return;
    }

    const rangeSize = endDay - startDay + 1;
    if (unworkableCount < 0 || unworkableCount > rangeSize) {
      setError(`Unworkable days must be between 0 and ${rangeSize} for the selected range`);
      return;
    }

    onGenerate(startDay, endDay, unworkableCount);
    onClose();
  };

  return (
    <div className="wt-modal-overlay">
      <div className="wt-modal">

        <div className="wt-modal-head">
          <h3>✦ Auto Generate Weather</h3>
          <button className="wt-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="wt-modal-body">
          <p>
            Automatically fill weather data for a range of dates. The system will
            generate patterns ensuring non-chaotic distribution.
          </p>

          {error && <div className="wt-modal-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="wt-modal-grid">
              <div className="wt-modal-field">
                <label>Start Day</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={startDay}
                  onChange={(e) => setStartDay(parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="wt-modal-field">
                <label>End Day</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={endDay}
                  onChange={(e) => setEndDay(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="wt-modal-field-full">
              <label>Target Unworkable Days</label>
              <div className="wt-unworkable-row">
                <input
                  type="number"
                  min="0"
                  max="31"
                  value={unworkableCount}
                  onChange={(e) => setUnworkableCount(parseInt(e.target.value) || 0)}
                />
                <span>(Max: {Math.max(0, endDay - startDay + 1)})</span>
              </div>
              <p className="wt-hint">Days with total score ≥ 64 will be marked as Unworkable.</p>
            </div>

            <div className="wt-modal-actions">
              <button type="button" className="wt-modal-cancel" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="wt-modal-submit">
                Generate
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
