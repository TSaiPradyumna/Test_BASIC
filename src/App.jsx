import { useEffect, useState } from 'react';

function App() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/excel')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch data from server');
        return res.json();
      })
      .then((res) => {
        if (res.success) {
          setItems(res.data);
        } else {
          throw new Error(res.error || 'Unknown error fetching data');
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching sheet data:", err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // --- Derived Metrics Calculations ---
  const totalItems = items.length;
  
  const totalQuantity = items.reduce((sum, item) => {
    const qty = parseInt(item["Quantity"] || item["QTY"] || 0, 10);
    return sum + (isNaN(qty) ? 0 : qty);
  }, 0);

  const totalValue = items.reduce((sum, item) => {
    const qty = parseInt(item["Quantity"] || item["QTY"] || 0, 10);
    const priceStr = String(item["Price"] || item["RATE"] || "0").replace(/[^0-9.]/g, '');
    const price = parseFloat(priceStr);
    return sum + (isNaN(qty) || isNaN(price) ? 0 : qty * price);
  }, 0);

  // --- Styled Components / Design Tokens ---
  const styles = {
    container: {
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '40px 20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      backgroundColor: '#f8fafc',
      minHeight: '100vh',
      color: '#1e293b'
    },
    header: {
      marginBottom: '32px',
      borderBottom: '1px solid #e2e8f0',
      paddingBottom: '20px'
    },
    title: {
      fontSize: '2.25rem',
      fontWeight: '700',
      color: '#0f172a',
      margin: '0 0 8px 0',
      letterSpacing: '-0.025em'
    },
    subtitle: {
      fontSize: '1rem',
      color: '#64748b',
      margin: 0
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
      gap: '20px',
      marginBottom: '32px'
    },
    card: {
      backgroundColor: '#ffffff',
      padding: '24px',
      borderRadius: '12px',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
      border: '1px solid #e2e8f0'
    },
    cardLabel: {
      fontSize: '0.875rem',
      fontWeight: '600',
      color: '#64748b',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      marginBottom: '8px'
    },
    cardValue: {
      fontSize: '1.875rem',
      fontWeight: '700',
      color: '#0f172a'
    },
    tableContainer: {
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.05)',
      border: '1px solid #e2e8f0',
      overflow: 'hidden'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      textAlign: 'left'
    },
    th: {
      backgroundColor: '#f1f5f9',
      padding: '16px 24px',
      fontSize: '0.875rem',
      fontWeight: '600',
      color: '#475569',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      borderBottom: '1px solid #e2e8f0'
    },
    tr: {
      borderBottom: '1px solid #f1f5f9',
      transition: 'background-color 0.2s ease'
    },
    td: {
      padding: '16px 24px',
      fontSize: '1rem',
      color: '#334155'
    },
    badge: (qty) => ({
      padding: '4px 8px',
      borderRadius: '6px',
      fontSize: '0.8125rem',
      fontWeight: '600',
      backgroundColor: qty > 5 ? '#e2fbe8' : qty > 0 ? '#fff3cd' : '#ffe3e3',
      color: qty > 5 ? '#15803d' : qty > 0 ? '#856404' : '#b91c1c'
    }),
    centerState: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '400px',
      fontFamily: 'sans-serif',
      color: '#64748b'
    },
    errorText: {
      color: '#dc2626',
      backgroundColor: '#fef2f2',
      padding: '16px 24px',
      borderRadius: '8px',
      border: '1px solid #fee2e2',
      fontWeight: '500'
    }
  };

  // --- Conditional Rendering for States ---
  if (loading) {
    return (
      <div style={styles.centerState}>
        <div className="spinner" style={{ marginBottom: '16px', fontSize: '1.25rem', fontWeight: '500' }}>
          Loading live dashboard data...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.centerState}>
        <div style={styles.errorText}>⚠️ Error: {error}</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header Block */}
      <header style={styles.header}>
        <h1 style={styles.title}>Live Inventory Dashboard</h1>
        <p style={styles.subtitle}>Real-time updates pulled straight from Google Sheets</p>
      </header>

      {/* Metrics Summary Grid */}
      <section style={styles.statsGrid}>
        <div style={styles.card}>
          <div style={styles.cardLabel}>Unique Products</div>
          <div style={styles.cardValue}>{totalItems}</div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardLabel}>Total Stock Vol.</div>
          <div style={styles.cardValue}>{totalQuantity} units</div>
        </div>
        <div style={styles.card}>
          <div
