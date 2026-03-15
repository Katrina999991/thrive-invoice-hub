import jsPDF from 'jspdf';
import { printPdfBlob } from './printDocument';

export interface FormalNoticePdfData {
  title: string;
  date: string;
  recipientName: string;
  recipientAddress: string;
  senderName: string;
  senderAddress: string;
  subject: string;
  body: string;
  dueDate: string;
}

export const generateFormalNoticePdf = (data: FormalNoticePdfData, action: 'download' | 'print' | 'blob' = 'download'): Blob | void => {
  const doc = new jsPDF({ unit: 'mm', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 25;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // --- SENDER INFO (top left) ---
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  const senderLines = doc.splitTextToSize(
    data.senderName + (data.senderAddress ? '\n' + data.senderAddress : ''),
    contentWidth / 2
  );
  doc.text(senderLines, margin, y);
  y += senderLines.length * 5 + 10;

  // --- DATE (aligned right) ---
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.text(data.date, pageWidth - margin, y, { align: 'right' });
  y += 12;

  // --- RECIPIENT (left, below date) ---
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  const recipientBlock = data.recipientName + (data.recipientAddress ? '\n' + data.recipientAddress : '');
  const recipientLines = doc.splitTextToSize(recipientBlock, contentWidth / 2);
  doc.text(recipientLines, margin, y);
  y += recipientLines.length * 5 + 20;

  // --- TITLE (centered, with more spacing) ---
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(160, 25, 25);
  doc.text(data.title.toUpperCase(), pageWidth / 2, y, { align: 'center' });
  y += 8;

  // Decorative line under title
  doc.setDrawColor(160, 25, 25);
  doc.setLineWidth(0.4);
  const titleWidth = doc.getTextWidth(data.title.toUpperCase());
  const lineStart = (pageWidth - titleWidth) / 2 - 5;
  const lineEnd = (pageWidth + titleWidth) / 2 + 5;
  doc.line(lineStart, y, lineEnd, y);
  y += 12;

  // --- SUBJECT ---
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  const subjectLines = doc.splitTextToSize(`Objet : ${data.subject}`, contentWidth);
  doc.text(subjectLines, margin, y);
  y += subjectLines.length * 5 + 8;

  // --- BODY ---
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);

  const urlPattern = /^https?:\/\/\S+$/;
  const paragraphs = data.body.split('\n');
  const pageHeight = doc.internal.pageSize.getHeight();

  // --- SIGNATURE BLOCK DETECTION ---
  // Signature block = closing formula + (empty lines) + company name (last non-empty paragraph)
  const getSignatureBlockIndices = (): { closingIndex: number; companyIndex: number } | null => {
    let companyIndex = paragraphs.length - 1;
    while (companyIndex >= 0 && paragraphs[companyIndex].trim() === '') companyIndex--;
    if (companyIndex < 0) return null;

    let closingIndex = companyIndex - 1;
    while (closingIndex >= 0 && paragraphs[closingIndex].trim() === '') closingIndex--;
    if (closingIndex < 0) return null;

    // Ensure only empty lines between closing formula and company name
    for (let i = closingIndex + 1; i < companyIndex; i++) {
      if (paragraphs[i].trim() !== '') return null;
    }

    return { closingIndex, companyIndex };
  };

  const signatureBlock = getSignatureBlockIndices();

  const getParagraphMetrics = (text: string) => {
    const lines = doc.splitTextToSize(text, contentWidth);
    const height = lines.length * 5 + 2;
    return { lines, height };
  };

  for (let pi = 0; pi < paragraphs.length; pi++) {
    const paragraph = paragraphs[pi];

    // Render signature block as one indivisible unit with adaptive signature spacing (3 -> 2 -> 1 lines)
    if (signatureBlock && pi === signatureBlock.closingIndex) {
      const closing = getParagraphMetrics(paragraphs[signatureBlock.closingIndex]);
      const company = getParagraphMetrics(paragraphs[signatureBlock.companyIndex]);

      const getBlockHeight = (signatureLines: number) => closing.height + signatureLines * 5 + company.height;
      const remainingSpace = pageHeight - margin - y;

      let signatureLines = [3, 2, 1].find((lines) => getBlockHeight(lines) <= remainingSpace);

      // Move to next page only if even 1 signature line cannot fit
      if (!signatureLines) {
        doc.addPage();
        y = margin;
        const remainingAfterPageBreak = pageHeight - margin - y;
        signatureLines = [3, 2, 1].find((lines) => getBlockHeight(lines) <= remainingAfterPageBreak) ?? 1;
      }

      doc.text(closing.lines, margin, y);
      y += closing.height;

      y += signatureLines * 5;

      doc.text(company.lines, margin, y);
      y += company.height;

      // Signature block is at the end of the letter content
      break;
    }

    if (paragraph.trim() === '') {
      y += 4;
      continue;
    }

    const { lines, height } = getParagraphMetrics(paragraph);

    if (y + height > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }

    if (urlPattern.test(paragraph.trim())) {
      doc.setTextColor(0, 60, 180);
      doc.text(lines, margin, y);
      const textWidth = doc.getTextWidth(paragraph.trim());
      doc.link(margin, y - 4, Math.min(textWidth, contentWidth), 6, { url: paragraph.trim() });
      doc.setTextColor(30, 30, 30);
    } else {
      doc.text(lines, margin, y);
    }

    y += height;
  }

  // No extra signature block — company name is already in the body template via {{company_name}}

  if (action === 'blob') {
    return doc.output('blob');
  } else if (action === 'print') {
    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.top = '-10000px';
    iframe.style.left = '-10000px';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.src = blobUrl;
    document.body.appendChild(iframe);
    iframe.onload = () => {
      try {
        iframe.contentWindow?.print();
      } catch {
        // Fallback: open in new tab if iframe print fails (cross-origin)
        window.open(blobUrl, '_blank');
      }
      setTimeout(() => {
        document.body.removeChild(iframe);
        URL.revokeObjectURL(blobUrl);
      }, 60000);
    };
  } else {
    doc.save(`mise-en-demeure-${data.date}.pdf`);
  }
};
