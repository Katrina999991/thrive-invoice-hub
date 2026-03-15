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

  // Sender info - top left
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  const senderLines = doc.splitTextToSize(data.senderName + (data.senderAddress ? '\n' + data.senderAddress : ''), contentWidth / 2);
  doc.text(senderLines, margin, y);
  y += senderLines.length * 5 + 5;

  // Date - top right
  doc.setTextColor(60, 60, 60);
  doc.text(data.date, pageWidth - margin, y, { align: 'right' });
  y += 15;

  // Recipient
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  const recipientBlock = data.recipientName + (data.recipientAddress ? '\n' + data.recipientAddress : '');
  const recipientLines = doc.splitTextToSize(recipientBlock, contentWidth / 2);
  doc.text(recipientLines, margin, y);
  y += recipientLines.length * 5 + 15;

  // Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(180, 30, 30);
  doc.text(data.title, pageWidth / 2, y, { align: 'center' });
  y += 12;

  // Line
  doc.setDrawColor(180, 30, 30);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // Subject
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  const subjectLines = doc.splitTextToSize(`Objet : ${data.subject}`, contentWidth);
  doc.text(subjectLines, margin, y);
  y += subjectLines.length * 6 + 8;

  // Body
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);
  
  // URL pattern for making links clickable
  const urlPattern = /^https?:\/\/\S+$/;
  
  // Split body into paragraphs preserving newlines
  const paragraphs = data.body.split('\n');
  for (const paragraph of paragraphs) {
    if (paragraph.trim() === '') {
      y += 4;
      continue;
    }
    const lines = doc.splitTextToSize(paragraph, contentWidth);
    
    // Check page break
    if (y + lines.length * 5 > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      y = margin;
    }
    
    // Check if this paragraph is a URL — render as clickable text link
    if (urlPattern.test(paragraph.trim())) {
      doc.setTextColor(0, 60, 180);
      doc.text(lines, margin, y);
      // Add clickable link annotation
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
