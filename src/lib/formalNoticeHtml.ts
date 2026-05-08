import type { FormalNoticePdfData } from './formalNoticePdf';

/**
 * Generate a print-ready HTML version of the formal notice.
 * Used for browser printing (no PDF blob, no new tab).
 */
export const generateFormalNoticeHtml = (data: FormalNoticePdfData): string => {
  const escHtml = (str: string) =>
    str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const urlPattern = /^https?:\/\/\S+$/;

  const bodyHtml = data.body
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (trimmed === '') return '<div style="height:8px;"></div>';
      if (urlPattern.test(trimmed)) {
        return `<p style="margin:0 0 4px 0;"><a href="${escHtml(trimmed)}" style="color:#003cb4;text-decoration:underline;">${escHtml(trimmed)}</a></p>`;
      }
      return `<p style="margin:0 0 4px 0;">${escHtml(trimmed)}</p>`;
    })
    .join('\n');

  const senderBlock = escHtml(data.senderName) +
    (data.senderAddress ? '<br>' + escHtml(data.senderAddress).replace(/\n/g, '<br>') : '');

  const recipientCompany = data.recipientCompany?.trim();
  const recipientBlock =
    (recipientCompany ? `<strong>${escHtml(recipientCompany)}</strong><br>` : '') +
    escHtml(data.recipientName) +
    (data.recipientAddress ? '<br>' + escHtml(data.recipientAddress).replace(/\n/g, '<br>') : '');

  const titleText = escHtml(data.title.toUpperCase());

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escHtml(data.title)}</title>
  <style>
    @page {
      size: letter;
      margin: 25mm;
    }
    * { box-sizing: border-box; }
    body {
      font-family: Helvetica, Arial, sans-serif;
      font-size: 10.5pt;
      color: #1e1e1e;
      margin: 0;
      padding: 25mm;
      line-height: 1.5;
    }
    .sender {
      font-size: 10pt;
      color: #505050;
      margin-bottom: 20px;
    }
    .date {
      text-align: right;
      font-size: 10pt;
      color: #3c3c3c;
      margin-bottom: 24px;
    }
    .recipient {
      font-size: 10pt;
      color: #000;
      margin-bottom: 40px;
    }
    .title {
      text-align: center;
      font-size: 15pt;
      font-weight: bold;
      color: #a01919;
      text-transform: uppercase;
      margin-bottom: 6px;
    }
    .title-line {
      border: none;
      border-top: 1px solid #a01919;
      width: auto;
      max-width: 400px;
      margin: 0 auto 24px auto;
    }
    .subject {
      font-weight: bold;
      font-size: 10.5pt;
      color: #000;
      margin-bottom: 16px;
    }
    .body-content {
      font-size: 10.5pt;
      color: #1e1e1e;
    }
    .body-content p {
      margin: 0 0 4px 0;
    }
    .body-content a {
      color: #003cb4;
    }
    @media print {
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="sender">${senderBlock}</div>
  <div class="date">${escHtml(data.date)}</div>
  <div class="recipient">${recipientBlock}</div>
  <div class="title">${titleText}</div>
  <hr class="title-line">
  <div class="subject">Objet : ${escHtml(data.subject)}</div>
  <div class="body-content">
    ${bodyHtml}
  </div>
</body>
</html>`;
};
