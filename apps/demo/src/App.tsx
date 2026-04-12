import React, { useState } from 'react';
import type { ColDef } from 'ag-grid-community';
import { themeQuartz } from 'ag-grid-community';
import { MarketsGrid } from '@grid-customizer/markets-grid';

import { generateOrders, type Order } from './data';

// ─── Theme ───────────────────────────────────────────────────────────────────

const darkTheme = themeQuartz.withParams({
  backgroundColor: '#161a1e',
  foregroundColor: '#eaecef',
  headerBackgroundColor: '#1e2329',
  oddRowBackgroundColor: '#161a1e',
  rowHoverColor: '#1e2329',
  selectedRowBackgroundColor: '#f0b90b14',
  borderColor: '#313944',
  fontFamily: "'JetBrains Mono', Menlo, monospace",
  fontSize: 11,
  headerFontSize: 10,
  cellHorizontalPaddingScale: 0.6,
  wrapperBorder: false,
  columnBorder: true,
  spacing: 6,
  borderRadius: 0,
  wrapperBorderRadius: 0,
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

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0b0e11' }}>
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 16px', borderBottom: '1px solid #313944', background: '#161a1e',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600, fontFamily: "'Geist', sans-serif" }}>
            <span style={{ color: '#2dd4bf' }}>Markets</span>
            <span style={{ color: '#eaecef' }}>Grid</span>
          </div>
          <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'rgba(45,212,191,0.10)', color: '#2dd4bf', fontFamily: '"JetBrains Mono", monospace', fontWeight: 500 }}>v0.1.0</span>
        </div>
        <span style={{ fontSize: 9, color: '#7a8494' }}>{rowData.length} orders</span>
      </header>

      <div style={{ flex: 1 }}>
        <MarketsGrid
          gridId="demo-blotter"
          rowData={rowData}
          columnDefs={columnDefs}
          theme={darkTheme}
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
