import React, { useState, useEffect } from 'react';
import type { ColDef } from 'ag-grid-community';
import { themeQuartz } from 'ag-grid-community';
import { MarketsGrid } from '@grid-customizer/markets-grid';
import { Sun, Moon } from 'lucide-react';

import { generateOrders, type Order } from './data';

// ─── AG-Grid Themes ─────────────────────────────────────────────────────────

const sharedParams = {
  fontFamily: "'JetBrains Mono', Menlo, monospace",
  fontSize: 11,
  headerFontSize: 10,
  cellHorizontalPaddingScale: 0.6,
  wrapperBorder: false,
  columnBorder: true,
  spacing: 6,
  borderRadius: 0,
  wrapperBorderRadius: 0,
};

const darkTheme = themeQuartz.withParams({
  ...sharedParams,
  backgroundColor: '#161a1e',
  foregroundColor: '#eaecef',
  headerBackgroundColor: '#1e2329',
  oddRowBackgroundColor: '#161a1e',
  rowHoverColor: '#1e2329',
  selectedRowBackgroundColor: '#f0b90b14',
  borderColor: '#313944',
});

const lightTheme = themeQuartz.withParams({
  ...sharedParams,
  backgroundColor: '#ffffff',
  foregroundColor: '#3b3b3b',
  headerBackgroundColor: '#f3f3f3',
  oddRowBackgroundColor: '#ffffff',
  rowHoverColor: '#f3f3f3',
  selectedRowBackgroundColor: '#d9770614',
  borderColor: '#e5e5e5',
});

// ─── Column Definitions (plain — no renderers, no formatters, no styles) ─────

const columnDefs: ColDef<Order>[] = [
  { field: 'id', headerName: 'Order ID', initialWidth: 120, pinned: 'left', filter: 'agTextColumnFilter' },
  { field: 'time', headerName: 'Time', initialWidth: 100, filter: 'agTextColumnFilter' },
  { field: 'security', headerName: 'Security', initialWidth: 180, filter: 'agTextColumnFilter' },
  { field: 'side', headerName: 'Side', initialWidth: 70, filter: 'agSetColumnFilter' },
  { field: 'quantity', headerName: 'Qty', initialWidth: 100, filter: 'agNumberColumnFilter' },
  { field: 'price', headerName: 'Price', initialWidth: 100, filter: 'agNumberColumnFilter' },
  { field: 'yield', headerName: 'Yield', initialWidth: 90, filter: 'agNumberColumnFilter' },
  { field: 'spread', headerName: 'Spread', initialWidth: 90, filter: 'agNumberColumnFilter' },
  { field: 'filled', headerName: 'Filled', initialWidth: 90, filter: 'agNumberColumnFilter' },
  { field: 'status', headerName: 'Status', initialWidth: 100, filter: 'agSetColumnFilter' },
  { field: 'venue', headerName: 'Venue', initialWidth: 120, filter: 'agSetColumnFilter' },
  { field: 'counterparty', headerName: 'Counterparty', initialWidth: 140, filter: 'agSetColumnFilter' },
  { field: 'account', headerName: 'Account', initialWidth: 110, filter: 'agSetColumnFilter' },
  { field: 'desk', headerName: 'Desk', initialWidth: 90, filter: 'agSetColumnFilter' },
  { field: 'trader', headerName: 'Trader', initialWidth: 110, filter: 'agSetColumnFilter' },
  { field: 'notional', headerName: 'Notional', initialWidth: 120, filter: 'agNumberColumnFilter' },
  { field: 'currency', headerName: 'CCY', initialWidth: 70 },
  { field: 'settlementDate', headerName: 'Settle Date', initialWidth: 110 },
];

// ─── App ─────────────────────────────────────────────────────────────────────

export function App() {
  const [rowData] = useState(() => generateOrders(500));
  const [isDark, setIsDark] = useState(() => {
    try { return localStorage.getItem('gc-theme') !== 'light'; }
    catch { return true; }
  });

  // Apply data-theme attribute to root and persist preference
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    try { localStorage.setItem('gc-theme', isDark ? 'dark' : 'light'); }
    catch { /* */ }
  }, [isDark]);

  const theme = isDark ? darkTheme : lightTheme;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--background)' }}>
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 16px', borderBottom: '1px solid var(--border)', background: 'var(--card)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600, fontFamily: "'Geist', sans-serif" }}>
            <span style={{ color: isDark ? '#2dd4bf' : '#0d9488' }}>Markets</span>
            <span style={{ color: 'var(--foreground)' }}>Grid</span>
          </div>
          <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: isDark ? 'rgba(45,212,191,0.10)' : 'rgba(13,148,136,0.10)', color: isDark ? '#2dd4bf' : '#0d9488', fontFamily: '"JetBrains Mono", monospace', fontWeight: 500 }}>
            v0.1.0
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 9, color: 'var(--muted-foreground)' }}>{rowData.length} orders</span>
          <button
            onClick={() => setIsDark(!isDark)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 28, height: 28, borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'var(--secondary)',
              color: 'var(--foreground)',
              cursor: 'pointer',
              transition: 'all 150ms',
            }}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Sun size={14} strokeWidth={1.75} /> : <Moon size={14} strokeWidth={1.75} />}
          </button>
        </div>
      </header>

      <div style={{ flex: 1 }}>
        <MarketsGrid
          gridId="demo-blotter"
          rowData={rowData}
          columnDefs={columnDefs}
          theme={theme}
          rowIdField="id"
          sideBar={{ toolPanels: ['columns', 'filters'] }}
          statusBar={{
            statusPanels: [
              { statusPanel: 'agTotalAndFilteredRowCountComponent', align: 'left' },
              { statusPanel: 'agSelectedRowCountComponent', align: 'left' },
            ],
          }}
        />
      </div>
    </div>
  );
}
