import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { fetchLogoUrl, uploadLogo } from '../../services/logoService'; // 🔺 SURGICAL INSERT

export function HeaderForm({ info, onChange }) {
  const { userProfile, currentUser } = useAuth(); // 🔺 SURGICAL: added currentUser
  const teamId = userProfile?.teamId;
  const isAdmin = userProfile?.role === 'admin'; // 🔺 SURGICAL INSERT

  const [projects, setProjects] = useState([]);
  const [logoLoading, setLogoLoading] = useState(false); // 🔺 SURGICAL INSERT

  useEffect(() => {
    if (!teamId) return;
    async function fetchProjects() {
      try {
        const q = query(
          collection(db, 'teams', teamId, 'projects'),
          orderBy('createdAt', 'desc')
        );
        const snap = await getDocs(q);
        setProjects(snap.docs.map((d) => ({ docId: d.id, ...d.data() })));
      } catch (err) {
        console.error('HeaderForm: failed to fetch projects', err);
      }
    }
    fetchProjects();
  }, [teamId]);

  // 🔺 SURGICAL INSERT — load global logo from Firestore on mount
  useEffect(() => {
    async function loadLogo() {
      if (!info.logoUrl) {
        const url = await fetchLogoUrl();
        if (url) onChange({ ...info, logoUrl: url });
      }
    }
    loadLogo();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    onChange({ ...info, [name]: value });
  };

  const handleContractSelect = (e) => {
    const selectedId = e.target.value;
    const project = projects.find((p) => p.projectId === selectedId);
    if (project) {
      onChange({
        ...info,
        contractId:  project.projectId   || '',
        projectName: project.projectName || '',
        contractor:  project.contractor  || '',
        location:    project.location    || '',
      });
    } else {
      onChange({
        ...info,
        contractId:  '',
        projectName: '',
        contractor:  '',
        location:    '',
      });
    }
  };

  // 🔺 SURGICAL REPLACEMENT — now uploads to Firebase Storage instead of Base64
  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !isAdmin) return;
    try {
      setLogoLoading(true);
      const url = await uploadLogo(file, currentUser.uid);
      onChange({ ...info, logoUrl: url });
    } catch (err) {
      console.error('HeaderForm: failed to upload logo', err);
    } finally {
      setLogoLoading(false);
    }
  };

  return (
    <div className="wt-form">

      {/* OFFICE INFO */}
      <div className="wt-form-section-header">
        <h3>Office Details</h3>
      </div>

      <div className="wt-field">
        <label>Office Name</label>
        <input
          type="text"
          name="officeName"
          value={info.officeName}
          onChange={handleChange}
          placeholder="e.g. REGIONAL OFFICE XIII"
        />
      </div>

      <div className="wt-field wt-form-col-2">
        <label>Office Address</label>
        <input
          type="text"
          name="officeAddress"
          value={info.officeAddress}
          onChange={handleChange}
          placeholder="e.g. J. Rosales Avenue, Butuan City"
        />
      </div>

      {/* PROJECT INFO */}
      <div className="wt-form-section-header">
        <h3>Project Details</h3>
      </div>

      <div className="wt-field">
        <label>Contract ID</label>
        <select
          name="contractId"
          value={info.contractId}
          onChange={handleContractSelect}
        >
          <option value="">— Select a project —</option>
          {projects.map((p) => (
            <option key={p.docId} value={p.projectId}>
              {p.projectId}
            </option>
          ))}
        </select>
      </div>

      <div className="wt-field wt-form-col-2">
        <label>Project Name</label>
        <input
          type="text"
          name="projectName"
          value={info.projectName}
          readOnly
          placeholder="Auto-filled from selected project"
          style={{ background: 'var(--bg-input-disabled, #f3f4f6)', cursor: 'not-allowed' }}
        />
      </div>

      <div className="wt-field">
        <label>Contractor</label>
        <input
          type="text"
          name="contractor"
          value={info.contractor}
          readOnly
          placeholder="Auto-filled from selected project"
          style={{ background: 'var(--bg-input-disabled, #f3f4f6)', cursor: 'not-allowed' }}
        />
      </div>

      <div className="wt-field">
        <label>Month</label>
        <input
          type="text"
          name="month"
          value={info.month}
          onChange={handleChange}
          placeholder="e.g. October"
        />
      </div>

      <div className="wt-field">
        <label>Year</label>
        <input
          type="text"
          name="year"
          value={info.year}
          onChange={handleChange}
          placeholder="e.g. 2024"
        />
      </div>

      <div className="wt-field wt-form-col-full">
        <label>Project Location</label>
        <input
          type="text"
          name="location"
          value={info.location}
          readOnly
          placeholder="Auto-filled from selected project"
          style={{ background: 'var(--bg-input-disabled, #f3f4f6)', cursor: 'not-allowed' }}
        />
      </div>

      {/* SIGNATORY INFO */}
      <div className="wt-form-section-header">
        <h3>Signatory Details</h3>
      </div>

      <div className="wt-field">
        <label>Signatory Name (Prepared by)</label>
        <input
          type="text"
          name="signatoryName"
          value={info.signatoryName}
          onChange={handleChange}
          placeholder="e.g. ARTEMIO L. AVENIDO"
        />
      </div>

      <div className="wt-field">
        <label>Signatory Designation</label>
        <input
          type="text"
          name="signatoryDesignation"
          value={info.signatoryDesignation}
          onChange={handleChange}
          placeholder="e.g. Project Engineer I"
        />
      </div>

      {/* 🔺 SURGICAL MODIFY — logo field now shows for all but upload is admin-only */}
      <div className="wt-field">
        <label>Logo</label>
        <div className="wt-logo-row">
          {info.logoUrl && (
            <div className="wt-logo-preview">
              <img src={info.logoUrl} alt="Logo Preview" />
            </div>
          )}
          {isAdmin && (
            <>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="wt-file-input"
                disabled={logoLoading}
              />
              {logoLoading && <span style={{ fontSize: '12px', color: '#888' }}>Uploading...</span>}
            </>
          )}
        </div>
      </div>

    </div>
  );
}