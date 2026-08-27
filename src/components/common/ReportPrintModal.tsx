import React, { useState, useEffect } from 'react';
import {
  X,
  Printer,
  Download,
  Check,
  FileText,
  Building2,
  ShieldCheck,
  Loader2
} from 'lucide-react';
import {
  PrintReportOptions,
  downloadReportPdf,
  printStructuredReport
} from '../../utils/printReport';

interface ReportPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  options: PrintReportOptions | null;
}

export const ReportPrintModal: React.FC<ReportPrintModalProps> = ({
  isOpen,
  onClose,
  options
}) => {
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [isPdfDownloaded, setIsPdfDownloaded] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !options) return null;

  const { pharmacySettings } = options;
  const currency = pharmacySettings.currencySymbol || 'GH₵';

  const handlePrint = () => {
    try {
      // Direct window.print targets @media print stylesheet defined below
      window.focus();
      window.print();
    } catch (err) {
      console.warn('Direct window.print error, using fallback:', err);
      printStructuredReport(options);
    }
  };

  const handleDownloadPdf = () => {
    setIsPdfGenerating(true);
    try {
      downloadReportPdf(options);
      setIsPdfDownloaded(true);
      setTimeout(() => setIsPdfDownloaded(false), 3000);
    } catch (e) {
      console.error('PDF export failed:', e);
    } finally {
      setIsPdfGenerating(false);
    }
  };

  const documentId = `RPT-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

  return (
    <>
      {/* Dedicated Print Media Stylesheet to guarantee exact printout from this preview */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 12mm 12mm 12mm;
          }
          body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Hide everything on page except modal container */
          body > * {
            visibility: hidden !important;
          }
          #report-print-preview-modal,
          #report-print-preview-modal * {
            visibility: visible !important;
          }
          #report-print-preview-modal {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            min-height: 100% !important;
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
            z-index: 999999 !important;
          }
          #report-modal-header,
          #report-modal-footer,
          .no-print {
            display: none !important;
          }
          #report-preview-scroll-container {
            padding: 0 !important;
            background: transparent !important;
            overflow: visible !important;
          }
          #report-printable-area {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
            border-radius: 0 !important;
          }
        }
      `}</style>

      <div
        id="report-print-preview-modal"
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto"
      >
        <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh]">
          {/* Header Bar - Removed 'Open in New Tab' and 'Print Document' buttons */}
          <div
            id="report-modal-header"
            className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 flex-shrink-0"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-xs">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-slate-900 line-clamp-1">
                    {options.title}
                  </h3>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-full uppercase tracking-wider whitespace-nowrap">
                    Official PDF & Print Preview
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Audit Period: <strong className="text-slate-700">{options.dateRangeLabel || 'All Records'}</strong> • Generated by {options.generatedBy || 'Authorized Staff'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              aria-label="Close report preview"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Live Document Preview - Pixel-matched with downloaded PDF */}
          <div
            id="report-preview-scroll-container"
            className="flex-1 p-4 sm:p-6 overflow-y-auto bg-slate-100/80"
          >
            <div
              id="report-printable-area"
              className="max-w-[850px] mx-auto bg-white rounded-xl shadow-lg border border-slate-300 p-8 sm:p-10 font-sans text-slate-900 space-y-6"
            >
              {/* Top Letterhead - Matches PDF Header Banner */}
              <div className="border-b-2 border-slate-900 pb-5 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex items-start space-x-3.5">
                  {pharmacySettings.systemLogo || pharmacySettings.logoUrl ? (
                    <div className="max-h-14 max-w-36 bg-white p-1 rounded-xl border border-slate-200 flex items-center justify-center flex-shrink-0 shadow-xs overflow-hidden">
                      <img
                        src={pharmacySettings.systemLogo || pharmacySettings.logoUrl}
                        alt={pharmacySettings.pharmacyName || 'Pharmacy Logo'}
                        className="max-h-12 max-w-32 object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-13 h-13 bg-emerald-800 text-white rounded-xl flex items-center justify-center font-black text-2xl tracking-tighter flex-shrink-0 shadow-xs">
                      Rx
                    </div>
                  )}
                  <div>
                    <h1 className="text-xl font-black text-slate-900 tracking-tight leading-tight">
                      {pharmacySettings.pharmacyName || 'PharmaCare Pharmacy Ltd'}
                    </h1>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {pharmacySettings.address || 'Accra, Ghana'}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      Tel: {pharmacySettings.phone || '+233 24 000 0000'} | License: <strong className="text-slate-800">{pharmacySettings.licenseNumber || 'GPC/ACC/2026/001'}</strong>
                    </p>
                    {pharmacySettings.email && (
                      <p className="text-[11px] text-slate-500 font-mono">
                        Email: {pharmacySettings.email}
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-left md:text-right text-xs text-slate-500 flex-shrink-0">
                  <div className="inline-block px-2.5 py-1 bg-emerald-50 text-emerald-800 font-extrabold text-xs uppercase tracking-wider rounded-md border border-emerald-200 mb-1">
                    {options.title}
                  </div>
                  {options.subtitle && (
                    <p className="text-[11px] text-slate-500 max-w-xs md:ml-auto">
                      {options.subtitle}
                    </p>
                  )}
                  <div className="mt-1 text-slate-700">
                    Period: <strong className="text-slate-900 uppercase">{options.dateRangeLabel || 'All Records'}</strong>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Generated: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="text-[11px] text-emerald-800 font-bold">
                    Official Currency: Ghana Cedi ({currency})
                  </div>
                </div>
              </div>

              {/* KPI Cards Grid - Matches PDF 4-Card Summary Block */}
              {options.kpiCards && options.kpiCards.length > 0 && (
                <div
                  className={`grid gap-3 ${
                    options.kpiCards.length === 2
                      ? 'grid-cols-2'
                      : options.kpiCards.length === 3
                      ? 'grid-cols-3'
                      : 'grid-cols-2 sm:grid-cols-4'
                  }`}
                >
                  {options.kpiCards.map((kpi, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-50 p-3 rounded-lg border border-slate-200 shadow-2xs flex flex-col justify-between"
                    >
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                        {kpi.label}
                      </span>
                      <div className="text-lg font-black text-slate-900 my-1 leading-tight">
                        {kpi.value}
                      </div>
                      {kpi.subtext && (
                        <span className="text-[10px] text-slate-500 leading-none">
                          {kpi.subtext}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Custom HTML Body Section (if provided) */}
              {options.customHtml && (
                <div
                  className="report-custom-content text-xs space-y-4"
                  dangerouslySetInnerHTML={{
                    __html: options.customHtml
                  }}
                />
              )}

              {/* Structured Tables - Matches AutoTable layout in PDF */}
              {options.tables && options.tables.length > 0 && (
                <div className="space-y-6">
                  {options.tables.map((table, tIdx) => (
                    <div key={tIdx} className="space-y-2">
                      {table.title && (
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider pl-2 border-l-3 border-emerald-700">
                          {table.title}
                        </h4>
                      )}

                      <div className="overflow-x-auto rounded-lg border border-slate-200">
                        <table className="w-full text-[11px] text-left border-collapse">
                          <thead className="bg-slate-100 text-slate-900 font-bold uppercase text-[10px] border-b border-slate-300">
                            <tr>
                              {table.headers.map((header, hIdx) => {
                                const align = table.alignments?.[hIdx] || 'left';
                                return (
                                  <th
                                    key={hIdx}
                                    className={`py-2 px-2.5 font-extrabold border-r border-slate-200 last:border-r-0 ${
                                      align === 'center'
                                        ? 'text-center'
                                        : align === 'right'
                                        ? 'text-right'
                                        : 'text-left'
                                    }`}
                                  >
                                    {header}
                                  </th>
                                );
                              })}
                            </tr>
                          </thead>
                          <tbody>
                            {table.rows.map((row, rIdx) => (
                              <tr
                                key={rIdx}
                                className={`border-b border-slate-100 transition-colors ${
                                  rIdx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'
                                }`}
                              >
                                {row.map((cell, cIdx) => {
                                  const align = table.alignments?.[cIdx] || 'left';
                                  return (
                                    <td
                                      key={cIdx}
                                      className={`py-2 px-2.5 text-slate-700 border-r border-slate-100 last:border-r-0 ${
                                        align === 'center'
                                          ? 'text-center'
                                          : align === 'right'
                                          ? 'text-right font-medium text-slate-900'
                                          : 'text-left'
                                      }`}
                                    >
                                      {cell}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                          {table.summaryRow && (
                            <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-400">
                              <tr>
                                {table.summaryRow.map((cell, sIdx) => {
                                  const align = table.alignments?.[sIdx] || 'left';
                                  return (
                                    <td
                                      key={sIdx}
                                      className={`py-2.5 px-2.5 font-black border-r border-slate-300 last:border-r-0 ${
                                        align === 'center'
                                          ? 'text-center'
                                          : align === 'right'
                                          ? 'text-right'
                                          : 'text-left'
                                      }`}
                                    >
                                      {cell}
                                    </td>
                                  );
                                })}
                              </tr>
                            </tfoot>
                          )}
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Sign-off Section - Matches PDF bottom verification boxes */}
              {options.showSignOff && (
                <div className="border-t border-dashed border-slate-300 pt-6 mt-8">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-end">
                    {/* Left: Superintendent / Auditor Signature */}
                    <div className="space-y-4">
                      <div className="border-b border-slate-900 pb-1 min-h-[44px] flex items-end justify-start">
                        {(options.signatureUrl || options.superintendentSignatureUrl || pharmacySettings.signatureURL || pharmacySettings.signatureUrl) ? (
                          <img
                            src={options.signatureUrl || options.superintendentSignatureUrl || pharmacySettings.signatureURL || pharmacySettings.signatureUrl}
                            alt="Authorized Signature"
                            className="max-h-12 max-w-[140px] object-contain mb-0.5"
                          />
                        ) : (
                          <span className="text-[10px] text-slate-400 font-mono italic">
                            Authorized Signature
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-700 space-y-0.5">
                        <p className="font-bold text-slate-900">
                          {options.signOffTitle || 'Superintendent Pharmacist'}
                        </p>
                        <p className="text-slate-500 text-[10px]">
                          Role: {options.signOffRole || 'Pharmacist-in-Charge'}
                        </p>
                        <p className="text-slate-500 text-[10px]">
                          Date: {new Date().toLocaleDateString('en-GB')}
                        </p>
                      </div>
                    </div>

                    {/* Center: Official Pharmacy Stamp Box */}
                    <div className="flex justify-center">
                      <div className="w-40 h-20 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-center p-2 text-slate-400 bg-slate-50/50">
                        <ShieldCheck className="w-5 h-5 mb-1 text-slate-300" />
                        <span className="text-[9px] font-black uppercase tracking-wider">
                          Official Pharmacy
                        </span>
                        <span className="text-[8px] tracking-widest font-mono">
                          AUDIT STAMP
                        </span>
                      </div>
                    </div>

                    {/* Right: Prepared By Signature */}
                    <div className="space-y-4">
                      <div className="border-b border-slate-900 pb-1 min-h-[44px] flex items-end justify-start sm:justify-end">
                        {options.preparedBySignatureUrl ? (
                          <img
                            src={options.preparedBySignatureUrl}
                            alt="Prepared By Signature"
                            className="max-h-12 max-w-[140px] object-contain mb-0.5"
                          />
                        ) : (
                          <span className="text-[10px] text-slate-400 font-mono italic">
                            Audit Officer Signature
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-700 space-y-0.5 sm:text-right">
                        <p className="font-bold text-slate-900">
                          Prepared By: {options.generatedBy || 'Authorized Officer'}
                        </p>
                        <p className="text-slate-500 text-[10px]">
                          PharmaCare Dispense & Ledger System
                        </p>
                        <p className="text-slate-500 text-[10px]">
                          Date: {new Date().toLocaleDateString('en-GB')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Regulatory Footer - Matches PDF page footer */}
              <div className="border-t border-slate-200 pt-3 text-[10px] text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-1">
                <span>
                  PharmaCare Official Audit Document • Ghana Pharmacy Council Regulatory Standard (Cap 571)
                </span>
                <span className="font-mono text-slate-500">
                  Document ID: {documentId}
                </span>
              </div>
            </div>
          </div>

          {/* Footer bar - Download PDF moved here, working Print Now button */}
          <div
            id="report-modal-footer"
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 py-3.5 border-t border-slate-200 bg-slate-50 text-xs text-slate-500 flex-shrink-0"
          >
            <div className="flex items-center gap-1.5 text-emerald-800 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Official Regulatory Audit Document formatted according to Ghana Pharmacy Council standards
            </div>

            <div className="flex items-center gap-2.5 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>

              {/* Download PDF Button brought to the bottom */}
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isPdfGenerating}
                className="inline-flex items-center px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                title="Download formatted A4 PDF audit document"
              >
                {isPdfGenerating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Generating PDF...
                  </>
                ) : isPdfDownloaded ? (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                    PDF Saved!
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    Download PDF
                  </>
                )}
              </button>

              {/* Print Now Button */}
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-colors cursor-pointer shadow-xs"
                title="Print this official report now"
              >
                <Printer className="w-3.5 h-3.5 mr-1.5" />
                Print Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
