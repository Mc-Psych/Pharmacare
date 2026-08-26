import React, { useRef, useState } from 'react';
import jsPDF from 'jspdf';
import { Sale, PharmacySettings } from '../../types';
import { usePharmacy } from '../../context/PharmacyContext';
import { Printer, X, CheckCircle, Download, FileText, Smartphone, Check } from 'lucide-react';
import { safeFixed } from '../../utils/formatters';

interface ReceiptModalProps {
  sale: Sale | null;
  settings?: PharmacySettings;
  isOpen?: boolean;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ sale, settings: propSettings, isOpen, onClose }) => {
  const { settings: contextSettings } = usePharmacy();
  const settings = propSettings || contextSettings;
  const receiptRef = useRef<HTMLDivElement>(null);
  const [receiptFormat, setReceiptFormat] = useState<'thermal' | 'standard'>('thermal');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [pdfDownloaded, setPdfDownloaded] = useState(false);

  if (!sale || (isOpen !== undefined && !isOpen)) return null;

  // Safe formatting helpers for print and PDF
  const currency = settings.currencySymbol || 'GH₵';
  
  // Format PDF money using standard ASCII 'GHS' to prevent PDF font encoding glitches (like 'GH µ')
  const formatPdfMoney = (amount: number | undefined | null) => {
    return `GHS ${safeFixed(amount ?? 0)}`;
  };

  const isPaidAndDispensed = sale.dispenseStatus === 'paid_awaiting_dispense' || sale.dispenseStatus === 'finally_dispensed';

  const handlePrint = () => {
    try {
      const existingFrame = document.getElementById('receipt-print-frame');
      if (existingFrame) existingFrame.remove();

      const printIframe = document.createElement('iframe');
      printIframe.id = 'receipt-print-frame';
      printIframe.style.position = 'fixed';
      printIframe.style.right = '0';
      printIframe.style.bottom = '0';
      printIframe.style.width = '0';
      printIframe.style.height = '0';
      printIframe.style.border = 'none';
      document.body.appendChild(printIframe);

      const frameDoc = printIframe.contentWindow?.document;
      if (frameDoc) {
        frameDoc.open();
        frameDoc.write(`
          <!DOCTYPE html>
          <html lang="en">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Receipt - ${sale.invoiceNumber}</title>
              <style>
                * { box-sizing: border-box; margin: 0; padding: 0; }
                @page { 
                  size: ${receiptFormat === 'thermal' ? '80mm auto' : 'auto'}; 
                  margin: ${receiptFormat === 'thermal' ? '3mm 2mm' : '8mm'}; 
                }
                body { 
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, monospace;
                  font-size: 11px; 
                  line-height: 1.35;
                  color: #0f172a; 
                  background: #fff;
                  width: 100%;
                  max-width: ${receiptFormat === 'thermal' ? '74mm' : '100%'};
                  margin: 0 auto;
                  padding: 4px;
                  word-break: break-word;
                  overflow-wrap: break-word;
                }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .bold { font-weight: 700; }
                .title { font-size: 14px; font-weight: 800; margin-bottom: 2px; text-transform: uppercase; }
                .sub { font-size: 9.5px; color: #475569; margin-bottom: 1px; }
                .divider { border-top: 1px dashed #64748b; margin: 6px 0; }
                .row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 3px; font-size: 10.5px; }
                .row .label { color: #475569; flex-shrink: 0; margin-right: 6px; }
                .row .val { text-align: right; word-break: break-word; }
                .items-table { width: 100%; border-collapse: collapse; margin: 6px 0; table-layout: fixed; }
                .items-table th { text-align: left; font-size: 9.5px; border-bottom: 1px solid #94a3b8; padding: 3px 0; font-weight: 700; }
                .items-table td { padding: 4px 0; vertical-align: top; font-size: 10px; border-bottom: 1px dotted #e2e8f0; }
                .items-table th.col-name, .items-table td.col-name { width: 54%; }
                .items-table th.col-qty, .items-table td.col-qty { width: 16%; text-align: center; }
                .items-table th.col-total, .items-table td.col-total { width: 30%; text-align: right; white-space: nowrap; }
                .status-box { 
                  margin: 6px 0; 
                  padding: 5px 6px; 
                  border: 1.5px solid #059669; 
                  background: #ecfdf5; 
                  color: #065f46;
                  text-align: center; 
                  font-size: 9px; 
                  font-weight: 700; 
                  border-radius: 4px; 
                  line-height: 1.3;
                }
                .barcode { text-align: center; font-family: monospace; font-size: 15px; font-weight: 900; letter-spacing: 3px; margin-top: 8px; }
                .footer { text-align: center; font-size: 9px; color: #475569; margin-top: 6px; line-height: 1.3; }
              </style>
            </head>
            <body>
              <div class="text-center">
                <div class="title">✚ ${settings.pharmacyName}</div>
                <div class="sub">${settings.address}</div>
                <div class="sub">Tel: ${settings.phone} | Lic: ${settings.licenseNumber}</div>
                ${settings.receiptHeader ? `<div class="sub" style="font-style: italic; margin-top: 2px;">${settings.receiptHeader}</div>` : ''}
              </div>
              
              <div class="divider"></div>
              
              <div class="row"><span class="label">INVOICE:</span><span class="val bold">${sale.invoiceNumber}</span></div>
              <div class="row"><span class="label">DATE:</span><span class="val">${new Date(sale.createdAt).toLocaleString()}</span></div>
              <div class="row"><span class="label">PATIENT:</span><span class="val bold">${sale.customerName}</span></div>
              ${sale.preparedByName ? `<div class="row"><span class="label">PREPARED BY:</span><span class="val">${sale.preparedByName}</span></div>` : ''}
              <div class="row"><span class="label">CASHIER:</span><span class="val">${sale.cashierName || 'Cashier'}</span></div>
              ${sale.pharmacistName ? `<div class="row"><span class="label">PHARMACIST:</span><span class="val">${sale.pharmacistName}</span></div>` : ''}
              ${sale.dispensedByName ? `<div class="row"><span class="label">DISPENSED BY:</span><span class="val bold">${sale.dispensedByName}</span></div>` : ''}
              ${sale.prescriptionNumber ? `<div class="row"><span class="label">PRESCRIPTION:</span><span class="val">${sale.prescriptionNumber}</span></div>` : ''}

              <div class="divider"></div>
              <div class="bold" style="font-size: 10px; margin-bottom: 2px;">ITEMS DISPENSED:</div>
              <table class="items-table">
                <thead>
                  <tr>
                    <th class="col-name">Medicine / Batch</th>
                    <th class="col-qty">Qty</th>
                    <th class="col-total">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${sale.items.map(item => `
                    <tr>
                      <td class="col-name">
                        <strong>${item.medicineName}</strong>${item.dosage ? ` (${item.dosage})` : ''}<br/>
                        <span style="color:#64748b;font-size:8.5px;">Batch: ${item.batchNumber}</span>
                      </td>
                      <td class="col-qty">${item.quantity}</td>
                      <td class="col-total bold">${currency}${safeFixed(item.total)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              
              <div class="divider"></div>
              
              <div class="row"><span class="label">Subtotal:</span><span class="val">${currency}${safeFixed(sale.subtotal)}</span></div>
              ${(sale.discountTotal || 0) > 0 ? `<div class="row"><span class="label">Discount:</span><span class="val" style="color:#059669;">-${currency}${safeFixed(sale.discountTotal)}</span></div>` : ''}
              ${settings.enableTax ? `<div class="row"><span class="label">Tax (${sale.taxRate}%):</span><span class="val">${currency}${safeFixed(sale.taxAmount)}</span></div>` : ''}
              <div class="row bold" style="font-size:12px; margin: 4px 0; border-top: 1px dashed #cbd5e1; padding-top: 3px;">
                <span>GRAND TOTAL:</span>
                <span>${currency}${safeFixed(sale.grandTotal)}</span>
              </div>
              <div class="row"><span class="label">Payment (${(sale.paymentMethod || 'CASH').toUpperCase()}):</span><span class="val">${currency}${safeFixed(sale.amountTendered)}</span></div>
              ${sale.paymentMethod === 'cash' ? `<div class="row"><span class="label">Change Given:</span><span class="val bold">${currency}${safeFixed(sale.changeGiven)}</span></div>` : ''}

              <!-- Payment & Dispense Status below Change Given -->
              <div class="status-box">
                ${
                  isPaidAndDispensed
                    ? '✓ PAYMENT CONFIRMED & PRESCRIPTION DISPENSED'
                    : '*** AWAITING CASHIER PAYMENT ***'
                }
              </div>
              
              <div class="divider"></div>
              <div class="barcode">||||| | |||| || |||| |||||</div>
              <div class="text-center" style="font-size:8.5px;color:#64748b;font-family:monospace;margin-top:1px;">${sale.invoiceNumber}</div>
              <div class="footer">${settings.receiptFooter}</div>
              <div class="text-center" style="font-size:8px;color:#94a3b8;margin-top:2px;">Offline Healthcare POS • Official Copy</div>
            </body>
          </html>
        `);
        frameDoc.close();

        setTimeout(() => {
          printIframe.contentWindow?.focus();
          printIframe.contentWindow?.print();
          setTimeout(() => {
            printIframe.remove();
          }, 1500);
        }, 300);
      }
    } catch {
      window.print();
    }
  };

  const handleDownloadPDF = () => {
    setIsGeneratingPDF(true);
    try {
      const isThermal = receiptFormat === 'thermal';
      const pageWidth = isThermal ? 80 : 210;
      const leftMargin = isThermal ? 4 : 15;
      const rightMargin = pageWidth - leftMargin;
      const printableWidth = pageWidth - leftMargin * 2;

      // Count footer lines accurately for dynamic height calculation
      const tempDoc = new jsPDF({ unit: 'mm' });
      const footerLinesCount = settings.receiptFooter
        ? tempDoc.splitTextToSize(settings.receiptFooter, printableWidth).length
        : 1;

      // Item lines height estimation
      const itemsHeight = sale.items.reduce((acc, it) => {
        const lines = tempDoc.splitTextToSize(it.medicineName, isThermal ? 36 : 100).length;
        return acc + lines * 3.5 + 7;
      }, 0);

      // Dynamic calculation to ensure no text is cropped out at the bottom
      const estimatedHeight = Math.max(
        isThermal ? 190 : 297,
        100 + itemsHeight + footerLinesCount * 4.5 + (sale.discountTotal ? 5 : 0) + (settings.enableTax ? 5 : 0) + 30
      );

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: isThermal ? [80, estimatedHeight] : 'a4',
      });

      let y = 8;

      // Pharmacy Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(isThermal ? 10.5 : 15);
      doc.setTextColor(15, 23, 42);
      
      const headerTitleLines = doc.splitTextToSize(settings.pharmacyName.toUpperCase(), printableWidth);
      headerTitleLines.forEach((line: string) => {
        doc.text(line, pageWidth / 2, y, { align: 'center' });
        y += 4.2;
      });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(isThermal ? 7 : 9);
      doc.setTextColor(71, 85, 105);

      const addressLines = doc.splitTextToSize(settings.address, printableWidth);
      addressLines.forEach((line: string) => {
        doc.text(line, pageWidth / 2, y, { align: 'center' });
        y += 3.2;
      });

      const contactLine = `Tel: ${settings.phone} | Lic: ${settings.licenseNumber}`;
      const contactLines = doc.splitTextToSize(contactLine, printableWidth);
      contactLines.forEach((line: string) => {
        doc.text(line, pageWidth / 2, y, { align: 'center' });
        y += 3.2;
      });

      if (settings.receiptHeader) {
        doc.setFont('helvetica', 'italic');
        const customHeaderLines = doc.splitTextToSize(settings.receiptHeader, printableWidth);
        customHeaderLines.forEach((line: string) => {
          doc.text(line, pageWidth / 2, y, { align: 'center' });
          y += 3.2;
        });
        doc.setFont('helvetica', 'normal');
      }

      y += 1;
      doc.setDrawColor(203, 213, 225);
      doc.line(leftMargin, y, rightMargin, y);

      // Metadata section
      y += 4;
      doc.setFontSize(isThermal ? 7 : 8.5);
      doc.setTextColor(15, 23, 42);

      const printRow = (label: string, value: string, isBold = false) => {
        doc.setFont('helvetica', 'bold');
        doc.text(label, leftMargin, y);
        doc.setFont('helvetica', isBold ? 'bold' : 'normal');
        doc.text(value, rightMargin, y, { align: 'right' });
        y += 3.6;
      };

      printRow('INVOICE:', sale.invoiceNumber, true);
      printRow('DATE:', new Date(sale.createdAt).toLocaleString());
      printRow('PATIENT:', sale.customerName, true);
      if (sale.preparedByName) printRow('PREPARED BY:', sale.preparedByName);
      printRow('CASHIER:', sale.cashierName || 'Cashier');
      if (sale.pharmacistName) printRow('PHARMACIST:', sale.pharmacistName);
      if (sale.dispensedByName) printRow('DISPENSED BY:', sale.dispensedByName, true);
      if (sale.prescriptionNumber) printRow('PRESCRIPTION:', sale.prescriptionNumber);

      // Divider
      y += 1;
      doc.line(leftMargin, y, rightMargin, y);

      // Line items table header
      y += 4;
      const qtyColX = isThermal ? 48 : 125;
      const itemColWidth = isThermal ? 36 : 95;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(isThermal ? 7 : 8.5);
      doc.text('MEDICINE / BATCH', leftMargin, y);
      doc.text('QTY', qtyColX, y, { align: 'center' });
      doc.text('TOTAL', rightMargin, y, { align: 'right' });

      y += 1.8;
      doc.line(leftMargin, y, rightMargin, y);

      // Line items
      sale.items.forEach(item => {
        y += 3.6;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(isThermal ? 6.8 : 8.5);
        
        const itemLines = doc.splitTextToSize(item.medicineName, itemColWidth);
        itemLines.forEach((line: string, lIdx: number) => {
          if (lIdx > 0) y += 3.2;
          doc.text(line, leftMargin, y);
        });

        // Align quantity and total with first line of item
        const firstLineY = y - (itemLines.length - 1) * 3.2;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(isThermal ? 7 : 8.5);
        doc.text(`${item.quantity}`, qtyColX, firstLineY, { align: 'center' });
        doc.text(formatPdfMoney(item.total), rightMargin, firstLineY, { align: 'right' });

        // Dosage & Batch number line
        y += 2.8;
        doc.setFontSize(isThermal ? 5.8 : 7.5);
        doc.setTextColor(100, 116, 139);
        const metaLine = item.dosage ? `${item.dosage} | Batch: ${item.batchNumber}` : `Batch: ${item.batchNumber}`;
        const metaLines = doc.splitTextToSize(metaLine, itemColWidth);
        metaLines.forEach((mLine: string, mIdx: number) => {
          if (mIdx > 0) y += 2.6;
          doc.text(mLine, leftMargin, y);
        });
        doc.setTextColor(15, 23, 42);
      });

      // Divider
      y += 2.5;
      doc.line(leftMargin, y, rightMargin, y);

      // Totals
      y += 3.8;
      doc.setFontSize(isThermal ? 7 : 8.5);
      doc.setFont('helvetica', 'normal');
      doc.text('Subtotal:', leftMargin, y);
      doc.text(formatPdfMoney(sale.subtotal), rightMargin, y, { align: 'right' });

      if ((sale.discountTotal || 0) > 0) {
        y += 3.5;
        doc.setTextColor(5, 150, 105);
        doc.text('Discount:', leftMargin, y);
        doc.text(`-${formatPdfMoney(sale.discountTotal)}`, rightMargin, y, { align: 'right' });
        doc.setTextColor(15, 23, 42);
      }

      if (settings.enableTax) {
        y += 3.5;
        doc.text(`Tax (${sale.taxRate}%):`, leftMargin, y);
        doc.text(formatPdfMoney(sale.taxAmount), rightMargin, y, { align: 'right' });
      }

      y += 4;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(isThermal ? 8 : 10);
      doc.text('GRAND TOTAL:', leftMargin, y);
      doc.text(formatPdfMoney(sale.grandTotal), rightMargin, y, { align: 'right' });

      y += 3.8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(isThermal ? 7 : 8.5);
      doc.text(`Paid (${(sale.paymentMethod || 'CASH').toUpperCase()}):`, leftMargin, y);
      doc.text(formatPdfMoney(sale.amountTendered), rightMargin, y, { align: 'right' });

      if (sale.paymentMethod === 'cash') {
        y += 3.5;
        doc.text('Change Given:', leftMargin, y);
        doc.text(formatPdfMoney(sale.changeGiven), rightMargin, y, { align: 'right' });
      }

      // Payment Confirmation Status Banner strictly below Change Given in PDF
      y += 4.5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(isThermal ? 6.2 : 7.8);
      
      const statusText = isPaidAndDispensed
        ? '[ PAYMENT CONFIRMED & MEDICINE DISPENSED ]'
        : '[ AWAITING CASHIER PAYMENT ]';

      const statusLines = doc.splitTextToSize(statusText, printableWidth - 4);
      const boxPadding = 2;
      const lineHeight = isThermal ? 3.2 : 3.8;
      const boxHeight = statusLines.length * lineHeight + boxPadding * 2;

      // Draw clean centered background box
      if (isPaidAndDispensed) {
        doc.setFillColor(236, 253, 245);
        doc.setDrawColor(5, 150, 105);
        doc.setTextColor(5, 150, 105);
      } else {
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(148, 163, 184);
        doc.setTextColor(71, 85, 105);
      }
      
      doc.roundedRect(leftMargin, y, printableWidth, boxHeight, 1.2, 1.2, 'FD');
      
      let textY = y + boxPadding + (isThermal ? 2.3 : 2.8);
      statusLines.forEach((sLine: string) => {
        doc.text(sLine, pageWidth / 2, textY, { align: 'center' });
        textY += lineHeight;
      });
      
      y += boxHeight + 2;
      doc.setTextColor(15, 23, 42);

      // Barcode / Footer
      y += 5;
      doc.setFont('courier', 'bold');
      doc.setFontSize(isThermal ? 9.5 : 12);
      doc.text('||||| | |||| || |||| |||||', pageWidth / 2, y, { align: 'center' });

      y += 3.2;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(isThermal ? 6 : 7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(sale.invoiceNumber, pageWidth / 2, y, { align: 'center' });

      if (settings.receiptFooter) {
        y += 3.5;
        doc.setTextColor(71, 85, 105);
        doc.setFontSize(isThermal ? 6 : 7.5);
        const footerLines = doc.splitTextToSize(settings.receiptFooter, printableWidth);
        footerLines.forEach((fLine: string) => {
          doc.text(fLine, pageWidth / 2, y, { align: 'center' });
          y += 3;
        });
      }

      y += 1;
      doc.setTextColor(148, 163, 184);
      doc.setFontSize(isThermal ? 5.5 : 7);
      const subFooterLines = doc.splitTextToSize('Offline Electronic Register • Official Pharmacy Copy', printableWidth);
      subFooterLines.forEach((sfLine: string) => {
        doc.text(sfLine, pageWidth / 2, y, { align: 'center' });
        y += 2.8;
      });

      doc.save(`${sale.invoiceNumber}.pdf`);
      setPdfDownloaded(true);
      setTimeout(() => setPdfDownloaded(false), 3000);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleDownloadText = () => {
    const lines = [
      '========================================',
      settings.pharmacyName.toUpperCase(),
      settings.address,
      `Tel: ${settings.phone} | Lic: ${settings.licenseNumber}`,
      '========================================',
      `INVOICE: ${sale.invoiceNumber}`,
      `DATE: ${new Date(sale.createdAt).toLocaleString()}`,
      `PATIENT/CUSTOMER: ${sale.customerName}`,
      `CASHIER: ${sale.cashierName || 'Cashier'}`,
      sale.preparedByName ? `PREPARED BY: ${sale.preparedByName}` : '',
      sale.pharmacistName ? `PHARMACIST: ${sale.pharmacistName}` : '',
      sale.dispensedByName ? `DISPENSED BY: ${sale.dispensedByName}` : '',
      sale.prescriptionNumber ? `PRESCRIPTION: ${sale.prescriptionNumber}` : '',
      '----------------------------------------',
      'ITEMS DISPENSED:',
      ...sale.items.map(
        i => `${i.medicineName}${i.dosage ? ` (${i.dosage})` : ''}\n  Batch: ${i.batchNumber}\n  ${i.quantity} x ${currency}${safeFixed(i.unitPrice)} = ${currency}${safeFixed(i.total)}`
      ),
      '----------------------------------------',
      `Subtotal: ${currency}${safeFixed(sale.subtotal)}`,
      (sale.discountTotal || 0) > 0 ? `Discount: -${currency}${safeFixed(sale.discountTotal)}` : '',
      settings.enableTax ? `Tax (${sale.taxRate}%): ${currency}${safeFixed(sale.taxAmount)}` : '',
      `GRAND TOTAL: ${currency}${safeFixed(sale.grandTotal)}`,
      `PAYMENT: ${(sale.paymentMethod || 'CASH').toUpperCase()}`,
      `Tendered: ${currency}${safeFixed(sale.amountTendered)}`,
      `Change Given: ${currency}${safeFixed(sale.changeGiven)}`,
      '----------------------------------------',
      isPaidAndDispensed
        ? '✓ PAYMENT CONFIRMED & MEDICINE DISPENSED'
        : '*** AWAITING CASHIER PAYMENT ***',
      '========================================',
      settings.receiptFooter,
      '========================================',
    ].filter(Boolean).join('\n');

    const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${sale.invoiceNumber}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 overflow-y-auto print:p-0 print:bg-white">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 print:border-none print:shadow-none print:m-0 print:w-full">
        {/* Modal Controls Header (Hidden during browser print) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 print:hidden">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-800">Transaction Receipt</h3>
              <p className="text-xs text-slate-500">Invoice {sale.invoiceNumber}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Format toggle */}
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setReceiptFormat('thermal')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                  receiptFormat === 'thermal' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5 inline mr-1" />
                80mm Thermal
              </button>
              <button
                type="button"
                onClick={() => setReceiptFormat('standard')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                  receiptFormat === 'standard' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5 inline mr-1" />
                A4 Standard
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div className="p-6 overflow-y-auto max-h-[70vh] print:max-h-none print:overflow-visible">
          <div
            ref={receiptRef}
            className={`mx-auto bg-white p-6 transition-all ${
              receiptFormat === 'thermal'
                ? 'max-w-[360px] border border-dashed border-slate-300 rounded-xl font-mono text-xs shadow-xs print:border-none print:shadow-none'
                : 'max-w-full border border-slate-200 rounded-xl text-sm print:border-none'
            }`}
          >
            {/* Pharmacy Brand & Header */}
            <div className="text-center pb-4 border-b border-slate-200">
              <div className="inline-block p-2 bg-emerald-600 text-white font-bold rounded-lg mb-2 text-sm">
                ✚ PHARMACARE
              </div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">{settings.pharmacyName}</h2>
              <p className="text-slate-500 text-[11px] mt-0.5">{settings.address}</p>
              <p className="text-slate-500 text-[11px]">Tel: {settings.phone} | Lic: {settings.licenseNumber}</p>
              {settings.receiptHeader && (
                <p className="text-slate-600 italic text-[11px] mt-1.5">{settings.receiptHeader}</p>
              )}
            </div>

            {/* Meta Details */}
            <div className="py-3 border-b border-slate-200 text-[11px] space-y-1 text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500">Invoice:</span>
                <span className="font-semibold text-slate-900">{sale.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date/Time:</span>
                <span>{new Date(sale.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <span className="font-medium text-slate-900">{sale.customerName}</span>
              </div>
              {sale.preparedByName && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Prepared By:</span>
                  <span>{sale.preparedByName}</span>
                </div>
              )}
              {sale.prescriptionNumber && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Prescription:</span>
                  <span className="font-semibold text-indigo-700">{sale.prescriptionNumber}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Cashier:</span>
                <span>{sale.cashierName || 'Cashier'}</span>
              </div>
              {sale.pharmacistName && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Pharmacist:</span>
                  <span>{sale.pharmacistName}</span>
                </div>
              )}
              {sale.dispensedByName && (
                <div className="flex justify-between font-medium text-slate-900">
                  <span className="text-slate-500 font-normal">Dispensed By:</span>
                  <span>{sale.dispensedByName}</span>
                </div>
              )}
            </div>

            {/* Line Items */}
            <div className="py-3 border-b border-slate-200">
              <div className="font-semibold text-slate-900 mb-2 flex justify-between text-[11px]">
                <span>MEDICINE / BATCH</span>
                <span>AMOUNT</span>
              </div>
              <div className="space-y-2.5">
                {sale.items.map((item, idx) => (
                  <div key={idx} className="text-[11px]">
                    <div className="flex justify-between font-medium text-slate-900">
                      <span className="pr-2">{item.medicineName}</span>
                      <span className="shrink-0">{currency}{safeFixed(item.total)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500 text-[10px] mt-0.5">
                      <span>
                        {item.quantity} x {currency}{safeFixed(item.unitPrice)}{item.dosage ? ` (${item.dosage})` : ''}
                      </span>
                      <span>
                        Batch: {item.batchNumber}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals & Calculations */}
            <div className="py-3 border-b border-slate-200 space-y-1 text-[11px] text-slate-700">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{currency}{safeFixed(sale.subtotal)}</span>
              </div>
              {(sale.discountTotal || 0) > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount</span>
                  <span>-{currency}{safeFixed(sale.discountTotal)}</span>
                </div>
              )}
              {settings.enableTax && (
                <div className="flex justify-between">
                  <span>Tax (${sale.taxRate}%)</span>
                  <span>{currency}{safeFixed(sale.taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm text-slate-900 pt-1 border-t border-slate-100">
                <span>TOTAL DUE</span>
                <span className="text-indigo-600">{currency}{safeFixed(sale.grandTotal)}</span>
              </div>
              <div className="flex justify-between pt-1 text-slate-600">
                <span>Payment ({sale.paymentMethod?.toUpperCase() || 'CASH'})</span>
                <span>{currency}{safeFixed(sale.amountTendered)}</span>
              </div>
              {sale.paymentMethod === 'cash' && (
                <div className="flex justify-between font-semibold text-slate-900">
                  <span>Change Given</span>
                  <span>{currency}{safeFixed(sale.changeGiven)}</span>
                </div>
              )}

              {/* Status Banner below Change Given */}
              <div className={`mt-2.5 p-2 rounded-lg text-center text-xs font-bold border ${
                isPaidAndDispensed
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-amber-50 text-amber-800 border-amber-300'
              }`}>
                {isPaidAndDispensed && '✓ PAYMENT CONFIRMED & MEDICINE DISPENSED'}
                {sale.dispenseStatus === 'awaiting_payment' && '⏳ AWAITING CASHIER PAYMENT'}
              </div>
            </div>

            {/* Barcode & Footer */}
            <div className="pt-4 text-center space-y-2">
              <div className="flex flex-col items-center justify-center">
                <div className="tracking-[4px] font-mono text-[14px] text-slate-800 font-bold">
                  ||||| | |||| || |||| |||||
                </div>
                <span className="text-[9px] text-slate-400 font-mono tracking-wider">{sale.invoiceNumber}</span>
              </div>
              <p className="text-[10px] text-slate-500 leading-tight px-2">{settings.receiptFooter}</p>
              <p className="text-[9px] text-slate-400">Offline Electronic Register • System Validated</p>
            </div>
          </div>
        </div>

        {/* Modal Action Buttons Footer (Hidden in print) */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50 print:hidden">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
              className="inline-flex items-center px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {pdfDownloaded ? (
                <>
                  <Check className="w-4 h-4 mr-1.5 text-white" />
                  PDF Saved!
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-1.5" />
                  {isGeneratingPDF ? 'Generating...' : 'Download PDF'}
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownloadText}
              className="hidden sm:inline-flex items-center px-3 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              title="Download Plain Text Format"
            >
              <FileText className="w-3.5 h-3.5 mr-1 text-slate-400" />
              TXT
            </button>
          </div>

          <div className="flex space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Done
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 mr-1.5" />
              Print Receipt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
