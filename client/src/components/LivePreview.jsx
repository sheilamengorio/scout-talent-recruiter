import { useState, useRef, useCallback } from 'react';
import { exportTLP } from '../services/api';

// Backend URL for TLP preview (without /api suffix)
const BACKEND_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '')
  : '';

function LivePreview({ tlpId, brandData, refreshKey }) {
  const [viewMode, setViewMode] = useState('desktop');
  const [exporting, setExporting] = useState(false);
  const iframeRef = useRef(null);

  const handleExport = async () => {
    if (!tlpId) return;

    setExporting(true);
    try {
      await exportTLP(tlpId);
    } catch (error) {
      console.error('Error exporting TLP:', error);
      alert('Failed to export TLP. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleCopyLink = () => {
    const link = BACKEND_URL ? `${BACKEND_URL}/tlp/${tlpId}` : `${window.location.origin}/tlp/${tlpId}`;
    navigator.clipboard.writeText(link);
    alert('Link copied to clipboard!');
  };

  const handleRefresh = useCallback(() => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
  }, []);

  if (!tlpId) {
    return (
      <div className="preview-empty">
        <p>Initializing preview...</p>
      </div>
    );
  }

  // Add cache-busting parameter to force reload
  const previewUrl = `${BACKEND_URL}/tlp/${tlpId}?t=${refreshKey || Date.now()}`;

  const hasBrandColors = brandData?.colors?.primary;

  return (
    <div className="live-preview">
      <div className="preview-toolbar">
        <div className="view-toggle">
          <button
            className={viewMode === 'desktop' ? 'active' : ''}
            onClick={() => setViewMode('desktop')}
          >
            Desktop
          </button>
          <button
            className={viewMode === 'mobile' ? 'active' : ''}
            onClick={() => setViewMode('mobile')}
          >
            Mobile
          </button>
        </div>

        {/* Brand color swatches */}
        {hasBrandColors && (
          <div className="brand-swatches" title="Brand colors detected">
            <div
              className="color-swatch"
              style={{ backgroundColor: brandData.colors.primary }}
              title={`Primary: ${brandData.colors.primary}`}
            />
            {brandData.colors.secondary && (
              <div
                className="color-swatch"
                style={{ backgroundColor: brandData.colors.secondary }}
                title={`Secondary: ${brandData.colors.secondary}`}
              />
            )}
            <span className="swatch-label">Brand</span>
          </div>
        )}

        <div className="preview-actions">
          <button onClick={handleRefresh} className="btn-secondary" title="Refresh preview">
            Refresh
          </button>
          <button onClick={handleCopyLink} className="btn-secondary">
            Copy Link
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="btn-primary"
          >
            {exporting ? 'Exporting...' : 'Export HTML'}
          </button>
        </div>
      </div>

      <div className={`preview-frame-container ${viewMode}`}>
        <iframe
          ref={iframeRef}
          src={previewUrl}
          title="TLP Preview"
          className="preview-iframe"
          sandbox="allow-same-origin"
        />
      </div>
    </div>
  );
}

export default LivePreview;
