import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiX, FiCheck, FiDownload, FiTrendingUp, FiTarget, FiUsers, FiCheckCircle, FiDollarSign, FiExternalLink, FiAlertCircle, FiLink, FiMessageSquare, FiCopy, FiClock, FiSave, FiUserCheck, FiChevronsUp, FiChevronsDown } from 'react-icons/fi';
import '../components/ValidatePage.css';

const MVPResults = (props) => {
    const analysis = props.analysis;
    const ensureArray = props.ensureArray;
    return (  
    <div className="results-section mvp-features">
        <div className="mvp-features-header">
          <span className="mvp-features-icon-bg"><FiExternalLink className="mvp-features-icon" /></span>
          <h3>MVP Feature Set</h3>
        </div>
        <div className="mvp-design-section">
          <div className="mvp-design-title">Suggested MVP Design</div>
          <div className="mvp-design-card">{analysis.mvpDesign || 'No MVP design available'}</div>
        </div>
        <ul className="mvp-features-list">
          {analysis.mvpFeatures.length > 0 ? (
            analysis.mvpFeatures.map((feat, idx) => (
              <li className="mvp-feature-row" key={idx}>
                <div className="mvp-feature-left">
                  <FiCheckCircle className="mvp-feature-check" />
                  <span className="feature-name">{feat.feature || 'Unknown feature'}</span>
                </div>
                <div className="mvp-feature-badges">
                  <span className={`priority-badge ${(feat.priority || 'Low').toLowerCase().replace(' ', '-')}`}>{feat.priority || 'Low'} Priority</span>
                  <span className={`effort-badge ${(feat.effort || 'Low').toLowerCase().replace(' ', '-')}`}>{feat.effort || 'Low'} Effort</span>
                </div>
              </li>
            ))
          ) : (
            <li className="mvp-feature-row">No MVP features available</li>
          )}
        </ul>
      </div>
    );
}
 
export default MVPResults;