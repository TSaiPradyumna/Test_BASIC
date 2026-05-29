import React, { useState, useEffect, useRef } from 'react';
import { 
  FileSpreadsheet, 
  RefreshCw, 
  Activity, 
  Cpu, 
  Wifi, 
  Clock, 
  Users, 
  TrendingUp, 
  Layers,
  AlertTriangle,
  Server,
  HelpCircle
} from 'lucide-react';

export default function App() {
  const [records, setRecords] = useState([]);
  const [systemHealth, setSystemHealth] = useState({ cpuUsage: 0, networkLoad: 0, dbLatencyMs: 0 });
  const [lastUpdated, setLastUpdated] = useState(null);
  const [fetchInterval, setFetchInterval] = useState(3000); 
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [updatedRowIds, setUpdatedRowIds] = useState(new Set());
  
  // NEW: Advanced Error Diagnostics States
  const [errorDetails, setErrorDetails] = useState({
    message: null,
    status: null,
    type: null, // '404', '500', or 'NETWORK'
  });

  const prevRecordsRef = useRef({});

  const fetchData = async () => {
    setIsLoading(true);
    // Reset error states on new attempt
    setErrorDetails({ message: null, status: null, type: null });
    
    try {
      const response = await fetch('/api/excel');
      
      // If response is not ok (e.g., 404 or 500), capture details explicitly
      if (!response.ok) {
        let errorText = `HTTP Error ${response.status}`;
        try {
          const errData = await response.json();
          if (errData.error) errorText = errData.error;
        } catch(e) {
          // If it's a 404, it won't return JSON, it returns HTML
          if (response.status === 404) errorText = "The backend endpoint '/api/excel' does not exist.";
        }
        
        throw { 
          message: errorText, 
          status: response.status, 
          type: response.status === 404 ? '404' : '500' 
        };
      }
      
      const data = await response.json();
      
      if (data.success) {
        setIsConnected(true);
        setSystemHealth(data.systemHealth || { cpuUsage: 12, networkLoad: 45, dbLatencyMs: 14 });
        setLastUpdated(new Date(data.timestamp || Date.now()));

        const newUpdatedRowIds = new Set();
        if (data.records) {
          data.records.forEach(record => {
            const prevRecord = prevRecordsRef.current[record.id];
            if (prevRecord) {
              if (
                prevRecord.progress !== record.progress ||
                prevRecord.efficiency !== record.efficiency ||
                prevRecord.activeTeam !== record.activeTeam
              ) {
                newUpdatedRowIds.add(record.id);
              }
            }
          });

          const nextPrevRecords = {};
          data.records.forEach(r => { nextPrevRecords[r.id] = r; });
          prevRecordsRef.current = nextPrevRecords;

          setRecords(data.records);
          setUpdatedRowIds(newUpdatedRowIds);
        }
      } else {
        // Handle case where backend runs but returns success: false
        throw { message: data.error || "Backend internal failure", status: 200, type: '500' };
      }
    } catch (err) {
      console.error("Diagnostic Fetch Error:", err);
      setIsConnected(false);
      
      if (err.status) {
        // Caught response failures (404/500)
        setErrorDetails({
          message: err.message,
          status: err.status,
          type: err.type
        });
      } else {
        // Complete network dropping / DNS failures
        setErrorDetails({
          message: "Failed to establish any connection to the domain endpoint. Network request was blocked or dropped completely.",
          status: "FETCH_FAIL",
          type: "NETWORK"
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    if (fetchInterval === 0) return;
    const intervalId = setInterval(() => { fetchData(); }, fetchInterval);
    return () => clearInterval(intervalId);
  }, [fetchInterval]);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val || 0);
  };

  const renderSparkline = (history) => {
    const dataPoints = Array.isArray(history) ? history : (typeof history === 'string' ? history.split(',').map(Number) : [50, 60, 70]);
    if (dataPoints.length <= 1) return <span style={{ color: '#94a3b8', fontSize: '12px' }}>Stable</span>;
    const minVal = Math.min(...dataPoints);
    const maxVal = Math.max(...dataPoints);
    const valRange = maxVal - minVal || 1;
    const width = 100;
    const height = 28;
    const points = dataPoints.map((val, idx) => {
      const x = (idx / (dataPoints.length - 1)) * width;
      const y = (height - 3) - ((val - minVal) / valRange) * (height - 6);
      return `${x},${y}`;
    }).join(' ');
    const lastVal = dataPoints[dataPoints.length - 1];
    let color = '#10b981';
    if (lastVal < 85) color = '#f59e0b';
    if (lastVal < 70) color = '#ef4444';

    return (
      <svg width={width} height={height} style={{ overflow: 'visible' }}>
        <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points} />
        <circle cx={width} cy={(height - 3) - ((lastVal - minVal) / valRange) * (height - 6)} r="3" fill={color} />
      </svg>
    );
  };

  return (
    <div className="dashboard-wrapper">
      <style>{`
        :root {
          --bg-main: #0b0f19;
          --panel-bg: rgba(22, 30, 49, 0.7);
          --panel-border: rgba(255, 255, 255, 0.08);
          --text-primary: #f8fafc;
          --text-secondary: #94a3b8;
          --accent-cyan: #06b6d4;
          --accent-emerald: #10b981;
          --accent-amber: #f59e0b;
          --accent-rose: #ef4444;
        }
        .dashboard-wrapper { min-height: 100vh; background-color: var(--bg-main); background-image: radial-gradient(at 0% 0%, rgba(6, 182, 212, 0.15) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(16, 185, 129, 0.1) 0px, transparent 50%); color: var(--text-primary); font-family: ui-sans-serif, system-ui, sans-serif; padding: 2rem; box-sizing: border-box; }
        header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1.5rem; margin-bottom: 2.5rem; background: var(--panel-bg); backdrop-filter: blur(12px); border: 1px solid var(--panel-border); padding: 1.5rem 2rem; border-radius: 16px; }
        .header-title-area h1 { display: flex; align-items: center; gap: 0.75rem; font-size: 1.75rem; font-weight: 800; margin: 0 0 0.25rem 0; background: linear-gradient(to right, #ffffff, #94a3b8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .header-title-area p { color: var(--text-secondary); margin: 0; font-size: 0.925rem; }
        .header-controls { display: flex; align-items: center; gap: 1rem; }
        .speed-control { display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; color: var(--text-secondary); background: rgba(0, 0, 0, 0.2); padding: 0.5rem 0.75rem; border-radius: 8px; border: 1px solid var(--panel-border); }
        .speed-select { background: transparent; color: var(--text-primary); border: none; font-weight: 600; outline: none; cursor: pointer; }
        .speed-select option { background: #111827; color: var(--text-primary); }
        .btn-primary { display: inline-flex; align-items: center; gap: 0.5rem; background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); color: white; border: none; padding: 0.625rem 1.25rem; border-radius: 8px; font-weight: 600; font-size: 0.875rem; cursor: pointer; }
        .health-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; margin-bottom: 2.5rem; }
        .glass-panel { background: var(--panel-bg); backdrop-filter: blur(12px); border: 1px solid var(--panel-border); border-radius: 16px; }
        .health-card { display: flex; align-items: center; gap: 1.25rem; padding: 1.5rem; }
        .card-icon { display: flex; align-items: center; justify-content: center; width: 48px; height: 48px; border-radius: 12px; background: rgba(255, 255, 255, 0.04); }
        .cpu .card-icon { color: var(--accent-cyan); background: rgba(6, 182, 212, 0.1); }
        .network .card-icon { color: var(--accent-emerald); background: rgba(16, 185, 129, 0.1); }
        .latency .card-icon { color: var(--accent-amber); background: rgba(245, 150, 11, 0.1); }
        .card-info { display: flex; flex-direction: column; }
        .card-info .label { font-size: 0.8125rem; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 0.25rem; }
        .card-info .value { font-size: 1.5rem; font-weight: 700; }
        .main-grid { margin-bottom: 2.5rem; }
        .table-panel { padding: 1.5rem; }
        .table-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
        .table-title { display: flex; align-items: center; gap: 0.5rem; font-size: 1.25rem; font-weight: 700; margin: 0; }
        .connection-pill { display: inline-flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; font-weight: 700; padding: 0.375rem 0.75rem; border-radius: 9999px; background: rgba(239, 68, 68, 0.1); color: var(--accent-rose); border: 1px solid rgba(239, 68, 68, 0.2); }
        .connection-pill.connected { background: rgba(16, 185, 129, 0.1); color: var(--accent-emerald); border: 1px solid rgba(16, 185, 129, 0.2); }
        .table-wrapper { overflow-x: auto; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.05); }
        .excel-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.925rem; }
        .excel-table th { background: rgba(0, 0, 0, 0.2); padding: 1rem 1.25rem; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; font-size: 0.75rem; border-bottom: 1px solid var(--panel-border); }
        .excel-table tr { border-bottom: 1px solid rgba(255, 255, 255, 0.03); }
        .excel-table td { padding: 1rem 1.25rem; vertical-align: middle; }
        .id-cell { font-family: monospace; color: var(--accent-cyan); font-weight: 600; }
        .category-tag { display: inline-block; padding: 0.25rem 0.625rem; border-radius: 6px; font-size: 0.8rem; font-weight: 600; background: rgba(255, 255, 255, 0.05); color: #e2e8f0; }
        .category-tag.cloud-ops { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }
        .category-tag.security { background: rgba(168, 85, 247, 0.15); color: #c084fc; }
        .progress-container { display: flex; align-items: center; gap: 0.75rem; min-width: 130px; }
        .progress-bar-bg { flex: 1; height: 6px; background: rgba(255, 255, 255, 0.08); border-radius: 9999px; overflow: hidden; }
        .progress-bar-fill { height: 100%; background: linear-gradient(90deg, #06b6d4, #0ea5e9); border-radius: 9999px; }
        .progress-text { font-size: 0.8125rem; font-family: monospace; }
        .metric-badge { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.25rem 0.5rem; border-radius: 6px; font-size: 0.8125rem; font-weight: 700; font-family: monospace; }
        .metric-badge.green { background: rgba(16, 185, 129, 0.12); color: #34d399; }
        .metric-badge.yellow { background: rgba(245, 158, 11, 0.12); color: #fbbf24; }
        .metric-badge.red { background: rgba(239, 68, 68, 0.12); color: #f87171; }
        .flash-update { animation: rowFlash 1.2s cubic-bezier(0.25, 1, 0.5, 1); }
        @keyframes rowFlash { 0% { background-color: rgba(6, 182, 212, 0.25); } 100% { background-color: transparent; } }
        footer { display: flex; justify-content: space-between; font-size: 0.8125rem; color: var(--text-secondary); border-top: 1px solid var(--panel-border); padding-top: 1.5rem; }
        
        /* Error Diagnostic Styles */
        .diagnostic-card { margin-top: 0.75rem; padding: 1rem; background: rgba(0,0,0,0.25); border-radius: 8px; border: 1px solid rgba(239, 68, 68, 0.15); }
        .diagnostic-title { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; font-weight: 700; color: #f8fafc; text-transform: uppercase; margin-bottom: 0.5rem;}
        .diagnostic-steps { margin: 0; padding-left: 1.25rem; font-size: 0.85rem; color: #cbd5e1; display: flex; flex-direction: column; gap: 0.35rem;}
      `}</style>

      {/* Header section */}
      <header>
        <div className="header-title-area">
          <h1>
            <FileSpreadsheet size={28} style={{ color: '#06b6d4' }} />
            LiveStream Sheets
          </h1>
          <p>Real-time serverless sync Engine powered by Cloudflare Pages Functions & Google Sheets.</p>
        </div>

        <div className="header-controls">
          <div className="speed-control">
            <span>Stream frequency:</span>
            <select value={fetchInterval} onChange={(e) => setFetchInterval(Number(e.target.value))} className="speed-select">
              <option value={1000}>Fast (1s)</option>
              <option value={3000}>Normal (3s)</option>
              <option value={5000}>Slow (5s)</option>
              <option value={0}>Paused</option>
            </select>
          </div>

          <button onClick={fetchData} className="btn btn-primary" disabled={isLoading}>
            <RefreshCw size={14} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
            Sync Now
          </button>
        </div>
      </header>

      {/* System Health Metric Cards */}
      <section className="health-grid" aria-label="System Health Metrics">
        <div className="glass-panel health-card cpu">
          <div className="card-icon"><Cpu size={20} /></div>
          <div className="card-info">
            <span className="label">V8 Worker CPU</span>
            <span className="value">{systemHealth.cpuUsage}%</span>
          </div>
        </div>

        <div className="glass-panel health-card network">
          <div className="card-icon"><Wifi size={20} /></div>
          <div className="card-info">
            <span className="label">Ingress Load</span>
            <span className="value">{systemHealth.networkLoad} Mbps</span>
          </div>
        </div>

        <div className="glass-panel health-card latency">
          <div className="card-icon"><Clock size={20} /></div>
          <div className="card-info">
            <span className="label">Sheets API Latency</span>
            <span className="value">{systemHealth.dbLatencyMs} ms</span>
          </div>
        </div>
      </section>

      {/* ADVANCED DIAGNOSTIC ERROR DISPLAY */}
      {errorDetails.message && (
        <div className="glass-panel" style={{
          padding: '1.5rem',
          borderLeft: '4px solid var(--accent-rose)',
          background: 'rgba(239, 68, 68, 0.05)',
          marginBottom: '2.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <AlertTriangle size={24} style={{ color: 'var(--accent-rose)', flexShrink: 0, marginTop: '0.15rem' }} />
            <div style={{ flex: 1 }}>
              <h4 style={{ fontWeight: 700, margin: '0 0 0.35rem 0', fontSize: '1rem', color: '#ffffff' }}>
                Edge Pipeline Offline (Status Code: <span style={{ fontFamily: 'monospace', color: 'var(--accent-rose)' }}>{errorDetails.status}</span>)
              </h4>
              <p style={{ fontSize: '0.9rem', color: '#e2e8f0', margin: '0 0 1rem 0', lineHeight: '1.4' }}>
                <strong>Server Message:</strong> {errorDetails.message}
              </p>
              
              {/* Intelligent dynamic guide based on response type */}
              <div className="diagnostic-card">
                <div className="diagnostic-title">
                  <HelpCircle size={14} style={{ color: 'var(--accent-cyan)' }} /> 
                  Resolution Blueprint:
                </div>
                
                {errorDetails.type === '404' && (
                  <ol className="diagnostic-steps">
                    <li>Your functions folder was likely missed during build. Make sure the folder is named <strong><code>functions</code></strong> (lowercase) and is at the absolute root of your repository (next to <code>package.json</code>).</li>
                    <li>Verify your GitHub repo contains <code>functions/api/excel.js</code>.</li>
                  </ol>
                )}

                {errorDetails.type === '500' && (
                  <ol className="diagnostic-steps">
                    <li>The code is deploying correctly, but executing poorly. Go to your Google Sheet, click <strong>Share</strong>, and set it to <strong>"Anyone with the link can view"</strong>.</li>
                    <li>If you changed the spreadsheet headers, verify they match your formatting loops exactly.</li>
                  </ol>
                )}

                {errorDetails.type === 'NETWORK' && (
                  <ol className="diagnostic-steps">
                    <li>Check if your custom domain DNS is fully active.</li>
                    <li>Open your browser inspector (F12), click the <strong>Network</strong> tab, press <em>Sync Now</em>, and inspect the response headers.</li>
                  </ol>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Main spreadsheet data panel */}
      <main className="main-grid">
        <div className="glass-panel table-panel">
          <div className="table-header">
            <h2 className="table-title">
              <Layers size={18} style={{ color: 'var(--accent-cyan)' }} />
              Active Project Records
            </h2>
            <div className={`connection-pill ${isConnected ? 'connected' : ''}`}>
              <Activity size={12} />
              {isConnected ? 'STREAMING LIVE' : 'DISCONNECTED'}
            </div>
          </div>

          <div className="table-wrapper">
            <table className="excel-table">
              <thead>
                <tr>
                  <th>ROW ID</th>
                  <th>PROJECT NAME</th>
                  <th>CATEGORY</th>
                  <th>BUDGET</th>
                  <th>PROGRESS</th>
                  <th>TEAM</th>
                  <th>EFFICIENCY</th>
                  <th>PERFORMANCE TREND</th>
                </tr>
              </thead>
              <tbody>
                {records.length > 0 ? (
                  records.map((record) => {
                    const isRowUpdated = updatedRowIds.has(record.id);
                    let effColorClass = 'green';
                    if (record.efficiency < 85) effColorClass = 'yellow';
                    if (record.efficiency < 70) effColorClass = 'red';

                    const cleanCategoryClass = record.category ? record.category.toLowerCase().replace(/ & /g, '_').replace(/ /g, '-') : 'default';

                    return (
                      <tr key={record.id} className={isRowUpdated ? 'flash-update' : ''}>
                        <td className="id-cell">{record.id}</td>
                        <td style={{ fontWeight: 600, color: '#ffffff' }}>{record.name}</td>
                        <td><span className={`category-tag ${cleanCategoryClass}`}>{record.category}</span></td>
                        <td style={{ fontFamily: 'monospace', fontWeight: 500 }}>{formatCurrency(record.budget)}</td>
                        <td>
                          <div className="progress-container">
                            <div className="progress-bar-bg"><div className="progress-bar-fill" style={{ width: `${record.progress}%` }} /></div>
                            <span className="progress-text">{record.progress}%</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)' }}>
                            <Users size={14} /><span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{record.activeTeam}</span>
                          </div>
                        </td>
                        <td><span className={`metric-badge ${effColorClass}`}><TrendingUp size={12} />{record.efficiency}%</span></td>
                        <td><div style={{ display: 'flex', alignItems: 'center', minHeight: '28px' }}>{renderSparkline(record.history)}</div></td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>
                      {isLoading ? 'Decrypting edge packet layers...' : 'No workspace data synchronized.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <footer>
        <div><Clock size={14} style={{ color: 'var(--accent-cyan)' }} /><span>Last Pipeline Sync: {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Never'}</span></div>
        <div><Server size={14} style={{ color: 'var(--accent-emerald)' }} /><span>Architecture: React + Workers Engine</span></div>
      </footer>
    </div>
  );
}
