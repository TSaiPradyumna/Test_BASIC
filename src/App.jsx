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
  AlertTriangle
} from 'lucide-react';

export default function App() {
  const [records, setRecords] = useState([]);
  const [systemHealth, setSystemHealth] = useState({ cpuUsage: 0, networkLoad: 0, dbLatencyMs: 0 });
  const [lastUpdated, setLastUpdated] = useState(null);
  const [fetchInterval, setFetchInterval] = useState(3000); // 3 seconds default
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [updatedRowIds, setUpdatedRowIds] = useState(new Set());
  const [errorMsg, setErrorMsg] = useState(null);

  // Store previous record values to detect changes
  const prevRecordsRef = useRef({});

  const fetchData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      // Cloudflare Pages Function runs at the same origin (/api/excel)
      const response = await fetch('/api/excel');
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      
      if (data.success) {
        setIsConnected(true);
        setSystemHealth(data.systemHealth);
        setLastUpdated(new Date(data.timestamp));

        // Detect which rows have changes in progress, efficiency, or team count
        const newUpdatedRowIds = new Set();
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

        // Save reference for next comparison
        const nextPrevRecords = {};
        data.records.forEach(r => { nextPrevRecords[r.id] = r; });
        prevRecordsRef.current = nextPrevRecords;

        setRecords(data.records);
        setUpdatedRowIds(newUpdatedRowIds);

        // Clear row highlight flashes after 1.2s
        setTimeout(() => {
          setUpdatedRowIds(prev => {
            const next = new Set(prev);
            newUpdatedRowIds.forEach(id => next.delete(id));
            return next;
          });
        }, 1200);
      }
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setIsConnected(false);
      setErrorMsg(`Connection Failed: Unable to fetch api data. Make sure Cloudflare Pages Function Wrangler dev server is active.`);
    } finally {
      setIsLoading(false);
    }
  };

  // Setup interval polling
  useEffect(() => {
    fetchData(); // initial fetch

    if (fetchInterval === 0) return; // paused

    const intervalId = setInterval(() => {
      fetchData();
    }, fetchInterval);

    return () => clearInterval(intervalId);
  }, [fetchInterval]);

  // Format currency
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Render SVG Sparkline
  const renderSparkline = (history) => {
    if (!history || history.length === 0) return null;
    const minVal = Math.min(...history);
    const maxVal = Math.max(...history);
    const valRange = maxVal - minVal || 1;
    
    const width = 80;
    const height = 20;
    const points = history.map((val, idx) => {
      const x = (idx / (history.length - 1)) * width;
      // Invert y, leave a 2px padding top/bottom
      const y = (height - 2) - ((val - minVal) / valRange) * (height - 4);
      return `${x},${y}`;
    }).join(' ');

    const lastVal = history[history.length - 1];
    let color = '#10b981'; // emerald
    if (lastVal < 80) color = '#f59e0b'; // amber
    if (lastVal < 50) color = '#f43f5e'; // rose

    return (
      <svg className="sparkline-svg" width={width} height={height}>
        <polyline points={points} stroke={color} />
      </svg>
    );
  };

  return (
    <div className="dashboard-container">
      {/* Header section */}
      <header>
        <div className="header-title-area">
          <h1>
            <FileSpreadsheet size={32} style={{ color: '#06b6d4' }} />
            LiveStream Sheets
          </h1>
          <p>Real-time fullstack simulation showing Cloudflare Pages Functions connecting to React frontend.</p>
        </div>

        <div className="header-controls">
          <div className="speed-control">
            <span>Update Stream:</span>
            <select 
              value={fetchInterval} 
              onChange={(e) => setFetchInterval(Number(e.target.value))}
              className="speed-select"
            >
              <option value={1000}>Fast (1s)</option>
              <option value={3000}>Normal (3s)</option>
              <option value={5000}>Slow (5s)</option>
              <option value={0}>Paused</option>
            </select>
          </div>

          <button 
            onClick={fetchData} 
            className="btn btn-primary"
            disabled={isLoading}
          >
            <RefreshCw size={16} className={isLoading ? 'spin-icon' : ''} style={{
              animation: isLoading ? 'spin 1s linear infinite' : 'none'
            }} />
            Sync Now
          </button>
        </div>
      </header>

      {/* Styled Inline Keyframes for loading spinner */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* System Health Metric Cards */}
      <section className="health-grid" aria-label="System Health Metrics">
        <div className="glass-panel health-card cpu">
          <div className="card-icon">
            <Cpu size={24} />
          </div>
          <div className="card-info">
            <span className="label">API Cluster CPU</span>
            <span className="value">{systemHealth.cpuUsage}%</span>
          </div>
        </div>

        <div className="glass-panel health-card network">
          <div className="card-icon">
            <Wifi size={24} />
          </div>
          <div className="card-info">
            <span className="label">Ingress Load</span>
            <span className="value">{systemHealth.networkLoad} Mbps</span>
          </div>
        </div>

        <div className="glass-panel health-card latency">
          <div className="card-icon">
            <Clock size={24} />
          </div>
          <div className="card-info">
            <span className="label">DB Latency</span>
            <span className="value">{systemHealth.dbLatencyMs} ms</span>
          </div>
        </div>
      </section>

      {/* Error Alert Display */}
      {errorMsg && (
        <div className="glass-panel" style={{
          padding: '1rem 1.5rem',
          borderLeft: '4px solid var(--accent-rose)',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          background: 'rgba(244, 63, 94, 0.08)'
        }}>
          <AlertTriangle size={24} style={{ color: 'var(--accent-rose)' }} />
          <div>
            <h4 style={{ fontWeight: 600 }}>Backend Connection Offline</h4>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>{errorMsg}</p>
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
              {isConnected ? 'STREAMING REAL-TIME' : 'DISCONNECTED'}
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
                    
                    // Efficiency color coding class
                    let effColorClass = 'green';
                    if (record.efficiency < 85) effColorClass = 'yellow';
                    if (record.efficiency < 70) effColorClass = 'red';

                    return (
                      <tr 
                        key={record.id} 
                        className={isRowUpdated ? 'flash-update' : ''}
                      >
                        <td className="id-cell">{record.id}</td>
                        <td style={{ fontWeight: 500 }}>{record.name}</td>
                        <td>
                          <span className={`category-tag ${record.category.toLowerCase().replace(/ & /g, '_').replace(/ /g, '-')}`}>
                            {record.category}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                          {formatCurrency(record.budget)}
                        </td>
                        <td>
                          <div className="progress-container">
                            <div className="progress-bar-bg">
                              <div 
                                className="progress-bar-fill" 
                                style={{ width: `${record.progress}%` }}
                              />
                            </div>
                            <span className="progress-text">{record.progress}%</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Users size={14} style={{ color: 'var(--text-muted)' }} />
                            <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{record.activeTeam}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`metric-badge ${effColorClass}`}>
                            <TrendingUp size={14} />
                            {record.efficiency}%
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', minHeight: '24px' }}>
                            {renderSparkline(record.history)}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
                      {isLoading ? 'Fetching project records...' : 'No data available.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Footer statistics */}
      <footer>
        <div>
          <span>Last Sync: {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Never'}</span>
        </div>
        <div>
          <span>Powered by React + Cloudflare Pages Functions</span>
        </div>
      </footer>
    </div>
  );
}
