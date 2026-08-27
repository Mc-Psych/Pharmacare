import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
  signatureUrl?: string;
  superintendentSignatureUrl?: string;
  preparedBySignatureUrl?: string;
}

export function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Builds the complete standalone HTML string for the report.
 */
export function generateReportHtml(options: PrintReportOptions): string {
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
    const superintendentSig = options.signatureUrl || options.superintendentSignatureUrl || pharmacySettings.signatureURL || pharmacySettings.signatureUrl;
    const preparedSig = options.preparedBySignatureUrl;

    signOffHtml = `
      <div class="sign-off-section">
        <div class="sign-block">
          ${superintendentSig ? `
            <div style="height: 38px; display: flex; align-items: flex-end; margin-bottom: 2px;">
              <img src="${superintendentSig}" style="max-height: 36px; max-width: 140px; object-fit: contain;" alt="Authorized Signature" />
            </div>
          ` : ''}
          <div class="sign-line" style="${superintendentSig ? 'height: 4px;' : ''}"></div>
          <div class="sign-label">${escapeHtml(signOffTitle)}</div>
          <div style="font-size: 9px; color: #64748b; margin-top: 2px;">${escapeHtml(signOffRole)}</div>
          <div style="font-size: 9px; color: #64748b;">Date: ${new Date().toLocaleDateString('en-GB')}</div>
        </div>

        <div class="stamp-box">
          Official Pharmacy Stamp
        </div>

        <div class="sign-block" style="text-align: right;">
          ${preparedSig ? `
            <div style="height: 38px; display: flex; align-items: flex-end; justify-content: flex-end; margin-bottom: 2px;">
              <img src="${preparedSig}" style="max-height: 36px; max-width: 140px; object-fit: contain;" alt="Preparer Signature" />
            </div>
          ` : ''}
          <div class="sign-line" style="${preparedSig ? 'height: 4px;' : ''}"></div>
          <div class="sign-label">Report Generated By</div>
          <div style="font-size: 9px; color: #64748b; margin-top: 2px;">${escapeHtml(generatedBy)}</div>
          <div style="font-size: 9px; color: #64748b;">Signature & Date</div>
        </div>
      </div>
    `;
  }

  return `
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
            padding: 24px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          @media print {
            body {
              padding: 0;
            }
            .no-print {
              display: none !important;
            }
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

          /* Standalone Print Toolbar */
          .standalone-toolbar {
            position: sticky;
            top: 0;
            left: 0;
            right: 0;
            background: #0f172a;
            color: #ffffff;
            padding: 10px 16px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 9999;
            margin: -16px -16px 20px -16px;
          }
          .toolbar-btn {
            background: #065f46;
            color: #ffffff;
            border: none;
            padding: 6px 14px;
            border-radius: 6px;
            font-weight: bold;
            font-size: 12px;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 6px;
          }
          .toolbar-btn:hover {
            background: #047857;
          }
          .toolbar-close-btn {
            background: #334155;
            color: #ffffff;
            border: none;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 12px;
            cursor: pointer;
          }

          @media print {
            .no-print, .standalone-toolbar {
              display: none !important;
            }
            body {
              padding: 0 !important;
              margin: 0 !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="standalone-toolbar no-print">
          <div style="font-size: 13px; font-weight: bold; display: flex; align-items: center; gap: 8px;">
            <span>📄 ${escapeHtml(title)}</span>
            <span style="font-size: 10px; background: rgba(255,255,255,0.15); padding: 2px 6px; border-radius: 4px;">Print Ready</span>
          </div>
          <div style="display: flex; gap: 8px;">
            <button type="button" class="toolbar-btn" onclick="window.focus(); window.print();">
              🖨️ Print Document
            </button>
            <button type="button" class="toolbar-close-btn" onclick="window.close();">
              ✕ Close
            </button>
          </div>
        </div>

        <div class="header-container">
          <div class="brand-box">
            ${pharmacySettings.systemLogo || pharmacySettings.logoUrl ? `
              <div style="max-height: 52px; max-width: 120px; display: flex; align-items: center; justify-content: center; background: #ffffff; padding: 2px 6px; border-radius: 8px; border: 1px solid #e2e8f0; margin-right: 12px; shrink-0;">
                <img src="${pharmacySettings.systemLogo || pharmacySettings.logoUrl}" style="max-height: 48px; max-width: 110px; object-fit: contain;" alt="Brand Logo" />
              </div>
            ` : `
              <div class="logo-rx">Rx</div>
            `}
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
      </body>
    </html>
  `;
}

/**
 * Generates an official PDF using jsPDF + autoTable and triggers direct download.
 */
export function downloadReportPdf(options: PrintReportOptions, filename?: string): void {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pharmacySettings = options.pharmacySettings;
    const pharmacyName = pharmacySettings.pharmacyName || 'PharmaCare Community Pharmacy';
    const address = pharmacySettings.address || 'Accra, Ghana';
    const licenseNumber = pharmacySettings.licenseNumber || 'GPC/COMM/2026/0482';
    const phone = pharmacySettings.phone || '+233 24 123 4567';
    const generatedBy = options.generatedBy || 'Authorized Staff';

    const pageWidth = doc.internal.pageSize.getWidth();
    let currentY = 14;

    // Brand Header
    const logoUrl = pharmacySettings.systemLogo || pharmacySettings.logoUrl;
    let hasDrawnLogo = false;

    if (logoUrl && (logoUrl.startsWith('data:image/png') || logoUrl.startsWith('data:image/jpeg') || logoUrl.startsWith('data:image/webp') || logoUrl.startsWith('http'))) {
      try {
        doc.addImage(logoUrl, 'PNG', 14, currentY, 13, 13);
        hasDrawnLogo = true;
      } catch (err) {
        hasDrawnLogo = false;
      }
    }

    if (!hasDrawnLogo) {
      doc.setFillColor(6, 95, 70); // Emerald 800
      doc.rect(14, currentY, 12, 12, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('Rx', 20, currentY + 8, { align: 'center' });
    }

    doc.setTextColor(15, 23, 42); // Slate 900
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text(pharmacyName, 29, currentY + 5);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105); // Slate 600
    doc.text(`${address}  •  Tel: ${phone}  •  Lic: ${licenseNumber}`, 29, currentY + 10);

    // Right Side Metadata
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(6, 95, 70);
    doc.text(options.title.toUpperCase(), pageWidth - 14, currentY + 4, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`Period: ${options.dateRangeLabel || 'All'}  |  Date: ${new Date().toLocaleDateString('en-GB')}`, pageWidth - 14, currentY + 9, { align: 'right' });

    currentY += 16;
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.5);
    doc.line(14, currentY, pageWidth - 14, currentY);
    currentY += 6;

    // KPI Cards
    if (options.kpiCards && options.kpiCards.length > 0) {
      const kpis = options.kpiCards.slice(0, 4);
      const cardWidth = (pageWidth - 28 - (kpis.length - 1) * 3) / kpis.length;

      kpis.forEach((kpi, idx) => {
        const x = 14 + idx * (cardWidth + 3);
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(203, 213, 225);
        doc.roundedRect(x, currentY, cardWidth, 16, 1.5, 1.5, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text(kpi.label.toUpperCase(), x + 2.5, currentY + 4.5);

        doc.setFontSize(9.5);
        doc.setTextColor(15, 23, 42);
        // Replace GHS symbol in ascii
        const safeVal = String(kpi.value).replace(/GH₵/g, 'GHS');
        doc.text(safeVal, x + 2.5, currentY + 10.5);

        if (kpi.subtext) {
          doc.setFontSize(6.5);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(100, 116, 139);
          doc.text(kpi.subtext, x + 2.5, currentY + 14.5);
        }
      });

      currentY += 20;
    }

    // Tables
    if (options.tables && options.tables.length > 0) {
      options.tables.forEach(table => {
        if (table.title) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9.5);
          doc.setTextColor(15, 23, 42);
          doc.text(table.title, 14, currentY + 4);
          currentY += 6;
        }

        const formattedRows = table.rows.map(row =>
          row.map(cell => String(cell).replace(/GH₵/g, 'GHS'))
        );

        let formattedFoot: any[][] | undefined = undefined;
        if (table.summaryRow && table.summaryRow.length > 0) {
          formattedFoot = [table.summaryRow.map(c => String(c).replace(/GH₵/g, 'GHS'))];
        }

        const columnStyles: Record<number, any> = {};
        if (table.alignments) {
          table.alignments.forEach((align, i) => {
            columnStyles[i] = { halign: align };
          });
        }

        autoTable(doc, {
          startY: currentY,
          head: [table.headers],
          body: formattedRows,
          foot: formattedFoot,
          theme: 'grid',
          margin: { left: 14, right: 14 },
          styles: {
            fontSize: 7.5,
            cellPadding: 2,
            textColor: [30, 41, 59],
            lineColor: [226, 232, 240],
            lineWidth: 0.2
          },
          headStyles: {
            fillColor: [241, 245, 249],
            textColor: [15, 23, 42],
            fontStyle: 'bold',
            fontSize: 7.5
          },
          footStyles: {
            fillColor: [241, 245, 249],
            textColor: [15, 23, 42],
            fontStyle: 'bold'
          },
          alternateRowStyles: {
            fillColor: [248, 250, 252]
          },
          columnStyles
        });

        currentY = (doc as any).lastAutoTable.finalY + 8;
      });
    }

    // Sign off section
    if (options.showSignOff !== false) {
      if (currentY > 240) {
        doc.addPage();
        currentY = 20;
      }

      currentY += 4;
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);
      doc.line(14, currentY, pageWidth - 14, currentY);
      currentY += 6;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);

      // Sign-off Images
      const superintendentSig = options.signatureUrl || options.superintendentSignatureUrl || pharmacySettings.signatureURL || pharmacySettings.signatureUrl;
      const preparedSig = options.preparedBySignatureUrl;

      if (superintendentSig && (superintendentSig.startsWith('data:image/png') || superintendentSig.startsWith('data:image/jpeg') || superintendentSig.startsWith('data:image/webp') || superintendentSig.startsWith('http'))) {
        try {
          doc.addImage(superintendentSig, 'PNG', 14, currentY, 32, 10);
        } catch (e) {
          // fallback to standard line
        }
      }

      if (preparedSig && (preparedSig.startsWith('data:image/png') || preparedSig.startsWith('data:image/jpeg') || preparedSig.startsWith('data:image/webp') || preparedSig.startsWith('http'))) {
        try {
          doc.addImage(preparedSig, 'PNG', pageWidth - 70, currentY, 32, 10);
        } catch (e) {
          // fallback to standard line
        }
      }

      // Left sign
      doc.line(14, currentY + 12, 70, currentY + 12);
      doc.text(options.signOffTitle || 'Superintendent Pharmacist Sign-off', 14, currentY + 16);
      doc.text(`Role: ${options.signOffRole || 'Pharmacist-in-Charge'}`, 14, currentY + 20);

      // Right sign
      doc.line(pageWidth - 70, currentY + 12, pageWidth - 14, currentY + 12);
      doc.text('Prepared / Generated By', pageWidth - 70, currentY + 16);
      doc.text(generatedBy, pageWidth - 70, currentY + 20);

      currentY += 24;
    }

    // Footer
    const pageCount = (doc.internal as any).getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `PharmaCare Official Audit Document • Ghana Pharmacy Council Regulatory Standard (Cap 571) • Page ${i} of ${pageCount}`,
        pageWidth / 2,
        288,
        { align: 'center' }
      );
    }

    const cleanName = (filename || `${options.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`)
      .replace(/[^a-zA-Z0-9_-]/g, '') + '.pdf';
    doc.save(cleanName);
  } catch (error) {
    console.error('Failed to generate PDF via jsPDF:', error);
    // Fallback: Open in new window
    openReportInNewTab(options);
  }
}

/**
 * Opens report in a standalone new browser window or tab and triggers native print.
 * This completely bypasses iframe sandbox restrictions!
 */
export function openReportInNewTab(options: PrintReportOptions): void {
  try {
    const html = generateReportHtml(options);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);

    const printWindow = window.open(blobUrl, '_blank');
    if (printWindow) {
      printWindow.focus();
    } else {
      // Fallback: if popup is blocked, open directly via anchor click
      const a = document.createElement('a');
      a.href = blobUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => a.remove(), 1000);
    }
  } catch (e) {
    console.error('Failed to open report in new window:', e);
  }
}

/**
 * Direct print trigger using current window print with multi-tier iframe fallback.
 */
export function printStructuredReport(options: PrintReportOptions): void {
  try {
    // Strategy 1: Direct native window print if modal is open
    const modalPrintArea = document.getElementById('report-printable-area');
    if (modalPrintArea) {
      window.focus();
      window.print();
      return;
    }

    // Strategy 2: Offscreen iframe print
    const html = generateReportHtml(options);
    const existingFrame = document.getElementById('pharmacy-report-print-frame');
    if (existingFrame) existingFrame.remove();

    const printIframe = document.createElement('iframe');
    printIframe.id = 'pharmacy-report-print-frame';
    printIframe.style.position = 'fixed';
    printIframe.style.top = '-9999px';
    printIframe.style.left = '-9999px';
    printIframe.style.width = '850px';
    printIframe.style.height = '1100px';
    printIframe.style.border = 'none';
    printIframe.style.opacity = '0.01';
    printIframe.style.pointerEvents = 'none';
    document.body.appendChild(printIframe);

    const frameDoc = printIframe.contentWindow?.document;
    if (!frameDoc) {
      downloadReportPdf(options);
      return;
    }

    frameDoc.open();
    frameDoc.write(html);
    frameDoc.close();

    setTimeout(() => {
      try {
        printIframe.contentWindow?.focus();
        printIframe.contentWindow?.print();
      } catch (err) {
        console.warn('Iframe print blocked by sandbox, downloading PDF fallback:', err);
        downloadReportPdf(options);
      } finally {
        setTimeout(() => {
          if (printIframe && printIframe.parentNode) {
            printIframe.parentNode.removeChild(printIframe);
          }
        }, 3000);
      }
    }, 350);
  } catch (e) {
    console.error('Print utility failed, downloading PDF directly:', e);
    downloadReportPdf(options);
  }
}
