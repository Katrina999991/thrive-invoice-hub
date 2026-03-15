import jsPDF from 'jspdf';

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
  // Identify the start of the signature block: closing formula + empty lines (signature space) + company name
  const getSignatureBlockStart = (): number => {
    let lastNonEmpty = paragraphs.length - 1;
    while (lastNonEmpty >= 0 && paragraphs[lastNonEmpty].trim() === '') lastNonEmpty--;
    if (lastNonEmpty < 0) return paragraphs.length;

    // Walk backwards past empty lines (signature space — max 3 counted)
    let idx = lastNonEmpty - 1;
    let emptyCount = 0;
    while (idx >= 0 && paragraphs[idx].trim() === '' && emptyCount < 3) {
      idx--;
      emptyCount++;
    }

    // Include the closing formula paragraph
    if (idx >= 0) return idx;
    return lastNonEmpty;
  };

  const signatureBlockStart = getSignatureBlockStart();

  // Calculate block height with a cap of 3 empty lines for signature space
  const calcBlockHeight = (startIdx: number): number => {
    let h = 0;
    let consecutiveEmpty = 0;
    for (let i = startIdx; i < paragraphs.length; i++) {
      if (paragraphs[i].trim() === '') {
        consecutiveEmpty++;
        // Cap signature space at 3 empty lines (~15mm)
        if (consecutiveEmpty <= 3) {
          h += 5;
        }
      } else {
        consecutiveEmpty = 0;
        const l = doc.splitTextToSize(paragraphs[i], contentWidth);
        h += l.length * 5 + 2;
      }
    }
    return h;
  };

  let signatureBlockMoved = false;

  for (let pi = 0; pi < paragraphs.length; pi++) {
    const paragraph = paragraphs[pi];

    // When we reach the signature block, check if the whole block fits
    if (pi === signatureBlockStart && !signatureBlockMoved) {
      const blockHeight = calcBlockHeight(signatureBlockStart);
      if (y + blockHeight > pageHeight - margin) {
        doc.addPage();
        y = margin;
        signatureBlockMoved = true;
      }
    }

    if (paragraph.trim() === '') {
      y += 4;
      continue;
    }
    const lines = doc.splitTextToSize(paragraph, contentWidth);
    
    // Check page break (skip if inside signature block already checked)
    if (pi < signatureBlockStart && y + lines.length * 5 > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
    
    // Check if this paragraph is a URL — render as clickable text link
    if (urlPattern.test(paragraph.trim())) {
      doc.setTextColor(0, 60, 180);
      doc.text(lines, margin, y);
      const textWidth = doc.getTextWidth(paragraph.trim());
      doc.link(margin, y - 4, Math.min(textWidth, contentWidth), 6, { url: paragraph.trim() });
      doc.setTextColor(30, 30, 30);
    } else {
      doc.text(lines, margin, y);
    }
    y += lines.length * 5 + 2;
  }

  // No extra signature block — company name is already in the body template via {{company_name}}

  if (action === 'blob') {
    return doc.output('blob');
  } else if (action === 'print') {
    doc.autoPrint();
    window.open(doc.output('bloburl') as unknown as string, '_blank');
  } else {
    doc.save(`mise-en-demeure-${data.date}.pdf`);
  }
};
