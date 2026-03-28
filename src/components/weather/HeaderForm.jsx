import React from 'react';

export function HeaderForm({ info, onChange }) {
  const handleChange = (e) => {
    const { name, value } = e.target;
    onChange({ ...info, [name]: value });
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onChange({ ...info, logoUrl: reader.result });
      };
      reader.readAsDataURL(file);
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
        <input
          type="text"
          name="contractId"
          value={info.contractId}
          onChange={handleChange}
          placeholder="e.g. 23N00001"
        />
      </div>

      <div className="wt-field wt-form-col-2">
        <label>Project Name</label>
        <input
          type="text"
          name="projectName"
          value={info.projectName}
          onChange={handleChange}
          placeholder="e.g. Construction of..."
        />
      </div>

      <div className="wt-field">
        <label>Contractor</label>
        <input
          type="text"
          name="contractor"
          value={info.contractor}
          onChange={handleChange}
          placeholder="e.g. ABC CONSTRUCTION"
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
          onChange={handleChange}
          placeholder="e.g. Butuan City"
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

      <div className="wt-field">
        <label>Logo</label>
        <div className="wt-logo-row">
          {info.logoUrl && (
            <div className="wt-logo-preview">
              <img src={info.logoUrl} alt="Logo Preview" />
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={handleLogoUpload}
            className="wt-file-input"
          />
        </div>
      </div>

    </div>
  );
}
