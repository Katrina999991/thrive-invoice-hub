import jsPDF from 'jspdf';

export interface SignatureData {
  type: 'typed' | 'drawn' | 'uploaded';
  value: string;
  signerName?: string;
  signerTitle?: string;
  companyName?: string;
  signedDate?: string;
  signedDateLabel?: string;
  legalNote?: string;
}

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
  signature?: SignatureData | null;
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
  const getSignatureBlockIndices = (): { closingIndex: number; companyIndex: number } | null => {
    let companyIndex = paragraphs.length - 1;
    while (companyIndex >= 0 && paragraphs[companyIndex].trim() === '') companyIndex--;
    if (companyIndex < 0) return null;

    let closingIndex = companyIndex - 1;
    while (closingIndex >= 0 && paragraphs[closingIndex].trim() === '') closingIndex--;
    if (closingIndex < 0) return null;

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

  // Calculate signature image/text block height
  const getSignatureExtraHeight = (): number => {
    if (!data.signature) return 0;
    let h = 0;
    // Signature image or typed text
    if (data.signature.type === 'typed') {
      h += 12; // typed signature text height
    } else {
      h += 18; // image height
    }
    // Signer name is part of the signature itself, not rendered separately
    // Signer title
    if (data.signature.signerTitle) h += 5;
    // Company name
    if (data.signature.companyName) h += 5;
    // Signed date
    if (data.signature.signedDate) h += 5;
    // Legal note
    if (data.signature.legalNote) h += 5;
    return h;
  };

  for (let pi = 0; pi < paragraphs.length; pi++) {
    const paragraph = paragraphs[pi];

    // Render signature block as one indivisible unit
    if (signatureBlock && pi === signatureBlock.closingIndex) {
      const closing = getParagraphMetrics(paragraphs[signatureBlock.closingIndex]);
      const company = getParagraphMetrics(paragraphs[signatureBlock.companyIndex]);
      const sigExtraHeight = getSignatureExtraHeight();

      const getBlockHeight = (signatureLines: number) => closing.height + signatureLines * 5 + (data.signature ? sigExtraHeight : company.height);
      const remainingSpace = pageHeight - margin - y;

      let signatureLines = [3, 2, 1].find((lines) => getBlockHeight(lines) <= remainingSpace);

      if (!signatureLines) {
        doc.addPage();
        y = margin;
        const remainingAfterPageBreak = pageHeight - margin - y;
        signatureLines = [3, 2, 1].find((lines) => getBlockHeight(lines) <= remainingAfterPageBreak) ?? 1;
      }

      // Closing text
      doc.text(closing.lines, margin, y);
      y += closing.height;

      // Spacing for signature area
      y += signatureLines * 5;

      if (data.signature) {
        // Render actual signature
        renderSignatureBlock(doc, data.signature, margin, y, contentWidth);
        y += sigExtraHeight;
      } else {
        // Company name only (original behavior)
        doc.text(company.lines, margin, y);
        y += company.height;
      }

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

  if (action === 'blob') {
    return doc.output('blob');
  } else {
    const now = new Date();
    const downloadDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    doc.save(`mise-en-demeure-${downloadDate}.pdf`);
  }
};

function renderSignatureBlock(doc: jsPDF, sig: SignatureData, x: number, y: number, _contentWidth: number) {
  let currentY = y;

  // Render signature (typed text or image)
  if (sig.type === 'typed') {
    doc.setFontSize(16);
    doc.setFont('times', 'italic');
    doc.setTextColor(30, 30, 30);
    doc.text(sig.value, x, currentY);
    currentY += 10;
  } else {
    // Drawn or uploaded: render as image
    try {
      const imgFormat = sig.value.includes('png') ? 'PNG' : 'JPEG';
      doc.addImage(sig.value, imgFormat, x, currentY - 8, 50, 15);
      currentY += 10;
    } catch (e) {
      console.warn('Could not render signature image in PDF:', e);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.text('[Signature]', x, currentY);
      currentY += 6;
    }
  }

  // Signer name is NOT rendered here because the signature itself
  // (typed text, drawn image, or uploaded image) already represents the signer.

  // Signer title
  if (sig.signerTitle) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(sig.signerTitle, x, currentY);
    currentY += 5;
  }

  // Company name
  if (sig.companyName) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(sig.companyName, x, currentY);
    currentY += 5;
  }

  // Signed date
  if (sig.signedDate && sig.signedDateLabel) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text(`${sig.signedDateLabel} ${sig.signedDate}`, x, currentY);
    currentY += 5;
  }

  // Legal note
  if (sig.legalNote) {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(140, 140, 140);
    doc.text(sig.legalNote, x, currentY);
  }
}
