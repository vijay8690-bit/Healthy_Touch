import fs from 'fs';
import path from 'path';
import { generateLabCode } from './labCode.js';
import Settings from '../models/Settings.js';

const getLogoPath = () => path.resolve(process.cwd(), '..', 'frontend', 'public', 'healthy-touch-logo.png');

const escapePdfText = (value) => String(value ?? '')
  .replace(/\\/g, '\\\\')
  .replace(/\(/g, '\\(')
  .replace(/\)/g, '\\)');

const writeFallbackPdf = async (filePath, lines) => {
  const width = 595;
  const height = 842;
  const content = [
    'BT',
    '/F1 20 Tf',
    '50 790 Td',
    `(${escapePdfText('Healthy Touch Lab Report')}) Tj`,
    '/F1 10 Tf',
    '0 -28 Td',
    ...lines.flatMap((line) => [
      `(${escapePdfText(line).slice(0, 100)}) Tj`,
      '0 -16 Td',
    ]),
    'ET',
  ].join('\n');

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  await fs.promises.writeFile(filePath, pdf);
};

export const generateLabReportPdf = async ({ filePath, report, booking, provider, patient }) => {
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });

  const tests = (booking.selectedTests?.length ? booking.selectedTests : booking.tests || [])
    .map((test) => test.testName)
    .filter(Boolean)
    .join(', ');
  const providerName = provider.labName || provider.userId?.name || provider.contactPersonName || 'Healthy Touch Lab';
  const platformSettings = await Settings.getSettings().catch(() => null);
  const supportPhone = platformSettings?.contactPhone || '+91 9887894498';
  const labCode = provider.labCode || generateLabCode(provider);
  const patientName = booking.patientName || patient?.name || 'Patient';
  const generatedOn = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const lines = [
    `Report ID: ${report.reportId}`,
    `Generated: ${generatedOn}`,
    `Patient: ${patientName}`,
    `Mobile: ${booking.patientMobile || patient?.mobile || 'N/A'}`,
    `City: ${booking.city || 'N/A'}`,
    `Lab: ${providerName}`,
    `Lab Code: ${labCode}`,
    `Test: ${report.testName || tests || 'Lab Test'}`,
    '',
    'Parameters',
    ...report.parameters.map((item) => (
      `${item.name}: ${item.resultValue || '-'} ${item.unit || ''} | Range: ${item.normalRange || '-'} | ${item.flag || ''}`
    )),
    '',
    'Authorized Signatory',
    providerName,
  ];

  try {
    const { default: PDFDocument } = await import('pdfkit');
    await new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 32, bufferPages: true });
      const stream = fs.createWriteStream(filePath);
      stream.on('finish', resolve);
      stream.on('error', reject);
      doc.pipe(stream);

      const drawHeader = () => {
        doc.rect(0, 0, 595, 104).fill('#0f766e');
        doc.rect(0, 99, 595, 5).fill('#86bc25');
        doc.roundedRect(32, 20, 116, 52, 8).fill('#ffffff');
        const logoPath = getLogoPath();
        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, 42, 26, { fit: [95, 40], align: 'center', valign: 'center' });
        } else {
          doc.fillColor('#0f766e').fontSize(17).font('Helvetica-Bold').text('HealthyTouch', 44, 35);
        }
        doc.fillColor('#ffffff').fontSize(10).font('Helvetica').text('Professional Pathology Report', 32, 78);
        doc.fillColor('#ffffff').fontSize(9).text(`Report ID: ${report.reportId}`, 395, 28, { align: 'right', width: 160 });
        doc.text(`Generated: ${generatedOn}`, 360, 45, { align: 'right', width: 195 });
      };

      const drawInfoBox = (x, y, title, rows) => {
        doc.roundedRect(x, y, 255, 116, 8).stroke('#cbd5e1');
        doc.fillColor('#0f766e').fontSize(10).font('Helvetica-Bold').text(title, x + 12, y + 12);
        let rowY = y + 32;
        rows.forEach(([label, value]) => {
          doc.fillColor('#64748b').fontSize(7).font('Helvetica-Bold').text(String(label).toUpperCase(), x + 12, rowY, { width: 85 });
          doc.fillColor('#0f172a').fontSize(8).font('Helvetica').text(value || 'N/A', x + 98, rowY, { width: 140 });
          rowY += 15;
        });
      };

      const drawTableHeader = (y) => {
        const cols = [32, 238, 323, 386];
        doc.rect(32, y, 531, 28).fill('#0f766e');
        doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
        doc.text('Test Name / Methodology', cols[0] + 8, y + 9, { width: 190 });
        doc.text('Result', cols[1] + 8, y + 9, { width: 70 });
        doc.text('Unit', cols[2] + 8, y + 9, { width: 48 });
        doc.text('Biological Reference Interval', cols[3] + 8, y + 9, { width: 155 });
        return y + 28;
      };

      drawHeader();
      drawInfoBox(32, 128, 'Patient Details', [
        ['Patient Name', patientName],
        ['Age / Gender', booking.patientAge || booking.ageGender || 'N/A'],
        ['Contact Number', booking.patientMobile || patient?.mobile || 'N/A'],
        ['Address', booking.address || 'N/A'],
        ['Collection Type', booking.collectionType || 'N/A'],
      ]);
      drawInfoBox(308, 128, 'Lab Details', [
        ['Lab Name', providerName],
        ['Lab Code', labCode],
        ['City', booking.city || 'N/A'],
        ['Report Date', generatedOn],
        ['Sample Date', booking.sampleCollectedAt ? new Date(booking.sampleCollectedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A'],
      ]);

      doc.moveTo(32, 268).lineTo(563, 268).dash(3, { space: 3 }).stroke('#cbd5e1').undash();
      doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold').text(report.testName || tests || 'Lab Report', 32, 286, { width: 360 });
      doc.fillColor('#64748b').fontSize(8).font('Helvetica').text('Specimen: Whole blood / Serum / Plasma', 32, 304);

      let y = drawTableHeader(326);
      const cols = [32, 238, 323, 386];
      report.parameters.forEach((item, index) => {
        if (y > 702) {
          doc.addPage();
          drawHeader();
          y = drawTableHeader(128);
        }
        const rowHeight = 34;
        doc.rect(32, y, 531, rowHeight).fill(index % 2 === 0 ? '#ffffff' : '#f8fafc');
        doc.rect(32, y, 531, rowHeight).stroke('#e2e8f0');
        doc.fillColor('#0f172a').fontSize(8).font('Helvetica-Bold');
        doc.text(item.name || item.testName || '-', cols[0] + 8, y + 7, { width: 185 });
        doc.fillColor('#64748b').fontSize(7).font('Helvetica');
        doc.text(item.methodology || item.testName || 'Standard laboratory method', cols[0] + 8, y + 19, { width: 185 });
        doc.fillColor(['low', 'high', 'critical'].includes(item.flag) ? '#dc2626' : '#0f172a')
          .fontSize(10)
          .font('Helvetica-Bold')
          .text(item.resultValue || '-', cols[1] + 8, y + 11, { width: 70 });
        doc.fillColor('#334155').fontSize(8).font('Helvetica').text(item.unit || '-', cols[2] + 8, y + 12, { width: 48 });
        doc.text(item.normalRange || '-', cols[3] + 8, y + 12, { width: 155 });
        y += rowHeight;
      });

      if (y > 650) {
        doc.addPage();
        drawHeader();
        y = 128;
      }
      doc.roundedRect(32, y + 18, 531, 42, 8).fill('#fffbeb').stroke('#fde68a');
      doc.fillColor('#92400e').fontSize(8).font('Helvetica-Bold').text('Clinical Note:', 44, y + 31);
      doc.fillColor('#92400e').fontSize(8).font('Helvetica').text('Abnormal values are highlighted in bold red. Results should be clinically correlated by the treating physician.', 102, y + 31, { width: 420 });

      const footerY = 728;
      doc.rect(0, footerY - 10, 595, 124).fill('#f8fafc');
      doc.roundedRect(32, footerY, 66, 66, 6).stroke('#cbd5e1');
      doc.fillColor('#0f172a').fontSize(22).font('Helvetica-Bold').text('QR', 49, footerY + 19);
      doc.fillColor('#64748b').fontSize(7).font('Helvetica').text('Scan to verify report', 32, footerY + 72, { width: 90 });
      doc.fillColor('#334155').fontSize(8).text(`Contact: ${provider.labContactNumber || provider.userId?.mobile || supportPhone}`, 118, footerY + 4);
      doc.text('Website: www.healthytouch.in', 118, footerY + 20);
      doc.text(`Address: ${provider.address || 'HealthyTouch Diagnostics, Jaipur, Rajasthan'}`, 118, footerY + 36, { width: 250 });
      doc.roundedRect(118, footerY + 58, 172, 20, 10).stroke('#86bc25');
      doc.fillColor('#3f6212').fontSize(7).font('Helvetica-Bold').text('ISO 9001:2015 CERTIFIED', 132, footerY + 65);
      doc.moveTo(405, footerY + 48).lineTo(548, footerY + 48).stroke('#94a3b8');
      doc.fillColor('#0f172a').fontSize(9).font('Helvetica-Bold').text('Authorized Signatory', 420, footerY + 56);
      doc.fillColor('#64748b').fontSize(7).font('Helvetica').text('Digitally generated by HealthyTouch', 420, footerY + 71);

      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i += 1) {
        doc.switchToPage(i);
        doc.fillColor('#ffffff').fontSize(8).font('Helvetica').text(`Page ${i + 1} of ${range.count}`, 462, 62, { align: 'right', width: 92 });
      }
      doc.end();
    });
  } catch {
    await writeFallbackPdf(filePath, lines);
  }
};
