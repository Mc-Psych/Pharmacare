import { PharmacySettings } from '../types';

export interface PrintKpiCard {
  label: string;
  value: string;
  subtext?: string;
}

export interface PrintTableSection {
  title?: string;
  subtitle?: string;
  headers: string[];
  rows: (string | number)[][];
  alignments?: ('left' | 'center' | 'right')[];
  summaryRow?: (string | number)[];
}

export interface PrintKeyValueSection {
  title?: string;
  items: { label: string; value: string }[];
}

export interface PrintReportOptions {
  title: string;
  subtitle?: string;
  pharmacySettings: Partial<PharmacySettings>;
  generatedBy?: string;
  dateRangeLabel?: string;
  kpiCards?: PrintKpiCard[];
  tables?: PrintTableSection[];
  keyValues?: PrintKeyValueSection[];
  customHtml?: string;
  showSignOff?: boolean;
  signOffTitle?: string;
  signOffRole?: string;
}

/**
 * Robust, cross-browser printable document renderer.
 * Creates an isolated, zero-margin, styled iframe and triggers native print.
 */
export function printHtmlContent(title: string, bodyHtml: string): void {
  try {
    const existingFrame = document.getElementById('pharmacy-report-print-frame');
    if (existingFrame) {
      existingFrame.remove();
    }

    const printIframe = document.createElement('iframe');
    printIframe.id = 'pharmacy-report-print-frame';
    printIframe.style.position = 'fixed';
    printIframe.style.right = '0';
    printIframe.style.bottom = '0';
    printIframe.style.width = '0';
    printIframe.style.height = '0';
    printIframe.style.border = 'none';
    printIframe.style.zIndex = '-9999';
    document.body.appendChild(printIframe);

    const frameDoc = printIframe.contentWindow?.document;
    if (!frameDoc) {
      // Fallback
      window.print();
      return;
    }

    const fullHtml = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${escapeHtml(title)}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 12mm 15mm;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              font-size: 11px;
              line-height: 1.45;
              color: #0f172a;
              background: #ffffff;
              width: 100%;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .header-container {
              border-bottom: 2px solid #0f172a;
              padding-bottom: 12px;
              margin-bottom: 16px;
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
            }
            .brand-box {
              display: flex;
              align-items: center;
              gap: 12px;
            }
            .logo-rx {
              background-color: #065f46;
              color: #ffffff;
              width: 42px;
              height: 42px;
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 900;
              font-size: 20px;
            }
            .pharmacy-name {
              font-size: 18px;
              font-weight: 800;
              color: #0f172a;
              letter-spacing: -0.02em;
            }
            .pharmacy-sub {
              font-size: 10px;
              color: #475569;
              margin-top: 1px;
            }
            .report-meta {
              text-align: right;
              font-size: 10px;
              color: #475569;
            }
            .report-title-badge {
              font-size: 13px;
              font-weight: 800;
              text-transform: uppercase;
              color: #065f46;
              letter-spacing: 0.05em;
              margin-bottom: 2px;
            }
            .report-period {
              font-weight: 700;
              color: #0f172a;
            }

            .kpi-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 10px;
              margin-bottom: 16px;
            }
            .kpi-card {
              border: 1px solid #cbd5e1;
              background-color: #f8fafc;
              border-radius: 6px;
              padding: 8px 10px;
            }
            .kpi-label {
              font-size: 9px;
              text-transform: uppercase;
              font-weight: 700;
              color: #64748b;
              letter-spacing: 0.04em;
            }
            .kpi-value {
              font-size: 14px;
              font-weight: 800;
              color: #0f172a;
              margin-top: 2px;
            }
            .kpi-subtext {
              font-size: 9px;
              color: #64748b;
              margin-top: 1px;
            }

            .section-title {
              font-size: 12px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.04em;
              color: #0f172a;
              border-left: 3px solid #065f46;
              padding-left: 6px;
              margin-top: 14px;
              margin-bottom: 8px;
            }

            table.report-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 16px;
              font-size: 10px;
            }
            table.report-table thead {
              display: table-header-group;
            }
            table.report-table th {
              background-color: #f1f5f9;
              color: #1e293b;
              font-weight: 700;
              text-transform: uppercase;
              font-size: 9px;
              letter-spacing: 0.03em;
              border: 1px solid #cbd5e1;
              padding: 6px 8px;
            }
            table.report-table td {
              border: 1px solid #e2e8f0;
              padding: 5px 8px;
              color: #1e293b;
            }
            table.report-table tbody tr:nth-child(even) {
              background-color: #f8fafc;
            }
            table.report-table tr.summary-row td {
              background-color: #f1f5f9;
              font-weight: 800;
              border-top: 2px solid #94a3b8;
              color: #0f172a;
            }

            .text-left { text-align: left; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: 700; }
            .text-emerald { color: #065f46; }
            .text-rose { color: #b91c1c; }

            .sign-off-section {
              margin-top: 24px;
              padding-top: 16px;
              border-top: 1px dashed #94a3b8;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              page-break-inside: avoid;
            }
            .sign-block {
              width: 220px;
            }
            .sign-line {
              border-bottom: 1px solid #0f172a;
              height: 36px;
              margin-bottom: 4px;
            }
            .sign-label {
              font-size: 9px;
              font-weight: 700;
              color: #475569;
              text-transform: uppercase;
            }
            .stamp-box {
              width: 130px;
              height: 60px;
              border: 1px dashed #94a3b8;
              border-radius: 4px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 9px;
              color: #94a3b8;
              font-weight: 700;
              text-transform: uppercase;
            }
            .footer-notes {
              margin-top: 16px;
              font-size: 9px;
              color: #94a3b8;
              text-align: center;
              border-top: 1px solid #e2e8f0;
              padding-top: 8px;
            }
          </style>
        </head>
        <body>
          ${bodyHtml}
        </body>
      </html>
    `;

    frameDoc.open();
    frameDoc.write(fullHtml);
    frameDoc.close();

    setTimeout(() => {
      try {
        printIframe.contentWindow?.focus();
        printIframe.contentWindow?.print();
      } catch (err) {
        console.error('Error invoking print from iframe:', err);
        window.print();
      } finally {
        setTimeout(() => {
          if (printIframe && printIframe.parentNode) {
            printIframe.parentNode.removeChild(printIframe);
          }
        }, 3000);
      }
    }, 250);
  } catch (e) {
    console.error('Print utility failed:', e);
    window.print();
  }
}

/**
 * Builds structured pharmacy report HTML and triggers printing.
 */
export function printStructuredReport(options: PrintReportOptions): void {
  const {
    title,
    subtitle,
    pharmacySettings,
    generatedBy = 'Authorized User',
    dateRangeLabel = 'All Dates',
    kpiCards = [],
    tables = [],
    customHtml = '',
    showSignOff = true,
    signOffTitle = 'Superintendent Pharmacist / Auditor Sign-off',
    signOffRole = 'Pharmacist-in-Charge'
  } = options;

  const pharmacyName = pharmacySettings.pharmacyName || 'PharmaCare Community Pharmacy';
  const address = pharmacySettings.address || 'Accra, Ghana';
  const licenseNumber = pharmacySettings.licenseNumber || 'GPC/COMM/2026/0482';
  const phone = pharmacySettings.phone || '+233 24 123 4567';
  const email = pharmacySettings.email || 'info@pharmacare.com.gh';
  const currencySymbol = pharmacySettings.currencySymbol || 'GH₵';

  const generatedDateStr = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  let kpiHtml = '';
  if (kpiCards.length > 0) {
    kpiHtml = `
      <div class="kpi-grid" style="grid-template-columns: repeat(${Math.min(4, kpiCards.length)}, 1fr);">
        ${kpiCards.map(c => `
          <div class="kpi-card">
            <div class="kpi-label">${escapeHtml(c.label)}</div>
            <div class="kpi-value">${escapeHtml(c.value)}</div>
            ${c.subtext ? `<div class="kpi-subtext">${escapeHtml(c.subtext)}</div>` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  let tablesHtml = '';
  if (tables.length > 0) {
    tablesHtml = tables.map(t => {
      const alignments = t.alignments || t.headers.map(() => 'left');
      
      const headHtml = `
        <thead>
          <tr>
            ${t.headers.map((h, i) => `
              <th class="text-${alignments[i] || 'left'}">${escapeHtml(h)}</th>
            `).join('')}
          </tr>
        </thead>
      `;

      const rowsHtml = t.rows.map(row => `
        <tr>
          ${row.map((cell, i) => `
            <td class="text-${alignments[i] || 'left'}">${escapeHtml(String(cell))}</td>
          `).join('')}
        </tr>
      `).join('');

      let summaryHtml = '';
      if (t.summaryRow && t.summaryRow.length > 0) {
        summaryHtml = `
          <tfoot>
            <tr class="summary-row">
              ${t.summaryRow.map((cell, i) => `
                <td class="text-${alignments[i] || 'left'}">${escapeHtml(String(cell))}</td>
              `).join('')}
            </tr>
          </tfoot>
        `;
      }

      return `
        ${t.title ? `<div class="section-title">${escapeHtml(t.title)}</div>` : ''}
        ${t.subtitle ? `<div style="font-size: 10px; color: #64748b; margin-bottom: 6px;">${escapeHtml(t.subtitle)}</div>` : ''}
        <table class="report-table">
          ${headHtml}
          <tbody>
            ${rowsHtml}
          </tbody>
          ${summaryHtml}
        </table>
      `;
    }).join('');
  }

  let signOffHtml = '';
  if (showSignOff) {
    signOffHtml = `
      <div class="sign-off-section">
        <div class="sign-block">
          <div class="sign-line"></div>
          <div class="sign-label">${escapeHtml(signOffTitle)}</div>
          <div style="font-size: 9px; color: #64748b; margin-top: 2px;">Name: ______________________ (${escapeHtml(signOffRole)})</div>
          <div style="font-size: 9px; color: #64748b;">Date: ______________________</div>
        </div>

        <div class="stamp-box">
          Official Pharmacy Stamp
        </div>

        <div class="sign-block" style="text-align: right;">
          <div class="sign-line"></div>
          <div class="sign-label">Report Generated By</div>
          <div style="font-size: 9px; color: #64748b; margin-top: 2px;">${escapeHtml(generatedBy)}</div>
          <div style="font-size: 9px; color: #64748b;">Signature & Date</div>
        </div>
      </div>
    `;
  }

  const bodyHtml = `
    <div class="header-container">
      <div class="brand-box">
        <div class="logo-rx">Rx</div>
        <div>
          <div class="pharmacy-name">${escapeHtml(pharmacyName)}</div>
          <div class="pharmacy-sub">${escapeHtml(address)} • Tel: ${escapeHtml(phone)}</div>
          <div class="pharmacy-sub">License: <strong>${escapeHtml(licenseNumber)}</strong> • Email: ${escapeHtml(email)}</div>
        </div>
      </div>

      <div class="report-meta">
        <div class="report-title-badge">${escapeHtml(title)}</div>
        ${subtitle ? `<div style="font-size: 10px; color: #64748b; margin-bottom: 2px;">${escapeHtml(subtitle)}</div>` : ''}
        <div>Audit Period: <span class="report-period">${escapeHtml(dateRangeLabel)}</span></div>
        <div>Generated: <strong>${escapeHtml(generatedDateStr)}</strong></div>
        <div style="color: #065f46; font-weight: 700;">Currency: ${escapeHtml(currencySymbol)} (GHS)</div>
      </div>
    </div>

    ${kpiHtml}
    ${customHtml}
    ${tablesHtml}
    ${signOffHtml}

    <div class="footer-notes">
      Official Pharmacy Operational & Financial Audit Document • Ghana Pharmacy Council Regulatory Standard (Cap 571) • System Document ID: RPT-${Date.now().toString(36).toUpperCase()}
    </div>
  `;

  printHtmlContent(title, bodyHtml);
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
