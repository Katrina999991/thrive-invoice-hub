// Professional HTML email template for invoice-related emails
// Renders a branded, responsive (table-based, inline-styled) email

type EmailType = 'new' | 'overdue' | 'payment_confirmation';
type Lang = 'fr' | 'en';

interface RenderArgs {
  company: {
    name: string;
    logo_url?: string | null;
    street_address?: string | null;
    city?: string | null;
    province_state?: string | null;
    postal_code?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  client: { name: string };
  invoice: {
    invoice_number: string;
    issue_date: string;
    due_date?: string | null;
    total: number;
    currency?: string;
  };
  bodyMessageHtml: string;
  paymentLinkUrl?: string | null;
  emailType: EmailType;
  language: Lang;
  accentColor: string; // hex
  hideBranding?: boolean;
}

const COLOR_MAP: Record<string, string> = {
  blue: '#2563eb',
  green: '#16a34a',
  purple: '#7c3aed',
  red: '#dc2626',
  orange: '#ea580c',
  teal: '#0d9488',
  pink: '#db2777',
  gray: '#475569',
  black: '#111827',
  indigo: '#4f46e5',
};

export function resolveAccentColor(invoiceColor?: string): string {
  if (!invoiceColor) return COLOR_MAP.blue;
  if (invoiceColor.startsWith('#')) return invoiceColor;
  return COLOR_MAP[invoiceColor.toLowerCase()] || COLOR_MAP.blue;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(d: string | null | undefined, lang: Lang): string {
  if (!d) return '—';
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return d;
    return date.toLocaleDateString(lang === 'fr' ? 'fr-CA' : 'en-CA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return d;
  }
}

function formatCurrency(amount: number, lang: Lang, currency = 'CAD'): string {
  try {
    return new Intl.NumberFormat(lang === 'fr' ? 'fr-CA' : 'en-CA', {
      style: 'currency',
      currency,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

const T = {
  en: {
    new: { eyebrow: 'New invoice', heading: 'You have a new invoice' },
    overdue: { eyebrow: 'Payment reminder', heading: 'Your invoice is overdue' },
    payment_confirmation: { eyebrow: 'Payment received', heading: 'Thank you for your payment' },
    invoiceNumber: 'Invoice number',
    issueDate: 'Issue date',
    dueDate: 'Due date',
    amountDue: 'Amount due',
    amountPaid: 'Amount paid',
    payNow: 'Pay invoice online',
    secure: 'Secure payment powered by Stripe',
    attached: 'A PDF copy of your invoice is attached to this email.',
    questions: 'Have a question about this invoice? Just reply to this email.',
    poweredBy: 'Sent with GestionFlow',
  },
  fr: {
    new: { eyebrow: 'Nouvelle facture', heading: 'Vous avez une nouvelle facture' },
    overdue: { eyebrow: 'Rappel de paiement', heading: 'Votre facture est en retard' },
    payment_confirmation: { eyebrow: 'Paiement reçu', heading: 'Merci pour votre paiement' },
    invoiceNumber: 'Numéro de facture',
    issueDate: 'Date d\u2019émission',
    dueDate: 'Date d\u2019échéance',
    amountDue: 'Montant dû',
    amountPaid: 'Montant payé',
    payNow: 'Payer la facture en ligne',
    secure: 'Paiement sécurisé par Stripe',
    attached: 'Une copie PDF de votre facture est jointe à ce courriel.',
    questions: 'Une question sur cette facture ? Répondez simplement à ce courriel.',
    poweredBy: 'Envoyé avec GestionFlow',
  },
};

export function renderInvoiceEmailHtml(args: RenderArgs): string {
  const { company, client, invoice, bodyMessageHtml, paymentLinkUrl, emailType, language, accentColor, hideBranding } = args;
  const t = T[language];
  const head = t[emailType];
  const isPaid = emailType === 'payment_confirmation';

  const addressParts = [
    company.street_address,
    [company.city, company.province_state].filter(Boolean).join(', '),
    company.postal_code,
  ].filter(Boolean).join(' · ');

  const contactParts = [company.email, company.phone].filter(Boolean).join(' · ');

  const logoBlock = company.logo_url
    ? `<img src="${escapeHtml(company.logo_url)}" alt="${escapeHtml(company.name)}" height="44" style="display:block;max-height:44px;width:auto;border:0;outline:none;text-decoration:none;" />`
    : `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:0.2px;">${escapeHtml(company.name)}</div>`;

  const ctaBlock = !isPaid && paymentLinkUrl
    ? `
      <tr>
        <td align="center" style="padding:8px 0 0 0;">
          <a href="${escapeHtml(paymentLinkUrl)}" style="display:inline-block;background:${accentColor};color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;line-height:1;padding:14px 28px;border-radius:8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">${t.payNow}</a>
        </td>
      </tr>
      <tr><td align="center" style="padding:10px 0 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;color:#94a3b8;">${t.secure}</td></tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="${language}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHtml(head.heading)}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1f5f9;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.06);">
        <!-- Header -->
        <tr>
          <td style="background:${accentColor};padding:24px 32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="left" style="vertical-align:middle;">${logoBlock}</td>
                <td align="right" style="vertical-align:middle;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;color:rgba(255,255,255,0.85);font-weight:500;letter-spacing:0.5px;text-transform:uppercase;">${escapeHtml(t[emailType].eyebrow)}</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Greeting -->
        <tr>
          <td style="padding:32px 32px 8px 32px;">
            <h1 style="margin:0 0 4px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:22px;line-height:1.3;color:#0f172a;font-weight:700;">${escapeHtml(head.heading)}</h1>
            <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;color:#64748b;">${escapeHtml(client.name)}</p>
          </td>
        </tr>

        <!-- Invoice summary card -->
        <tr>
          <td style="padding:20px 32px 8px 32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;">
              <tr>
                <td style="padding:20px 24px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;padding-bottom:4px;">${t.invoiceNumber}</td>
                      <td align="right" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;padding-bottom:4px;">${isPaid ? t.amountPaid : t.amountDue}</td>
                    </tr>
                    <tr>
                      <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:18px;color:#0f172a;font-weight:700;padding-bottom:16px;">${escapeHtml(invoice.invoice_number)}</td>
                      <td align="right" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:24px;color:${accentColor};font-weight:700;padding-bottom:16px;">${escapeHtml(formatCurrency(invoice.total, language, invoice.currency))}</td>
                    </tr>
                    <tr>
                      <td colspan="2" style="border-top:1px solid #e2e8f0;padding-top:12px;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:#64748b;padding-right:8px;">${t.issueDate}<br/><span style="color:#0f172a;font-weight:600;">${escapeHtml(formatDate(invoice.issue_date, language))}</span></td>
                            <td align="right" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:#64748b;">${t.dueDate}<br/><span style="color:#0f172a;font-weight:600;">${escapeHtml(formatDate(invoice.due_date, language))}</span></td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    ${ctaBlock ? `<tr><td colspan="2" style="padding-top:18px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${ctaBlock}</table></td></tr>` : ''}
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Body message -->
        <tr>
          <td style="padding:20px 32px 8px 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#334155;">
            ${bodyMessageHtml}
          </td>
        </tr>

        <!-- Attachment notice -->
        <tr>
          <td style="padding:8px 32px 24px 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:#64748b;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border:1px dashed #cbd5e1;border-radius:8px;">
              <tr>
                <td style="padding:12px 16px;">
                  <span style="display:inline-block;vertical-align:middle;margin-right:8px;color:${accentColor};font-weight:700;">📎</span>
                  <span style="vertical-align:middle;">${t.attached}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Reply hint -->
        <tr>
          <td style="padding:0 32px 28px 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:#94a3b8;text-align:center;">
            ${t.questions}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#0f172a;padding:24px 32px;color:#cbd5e1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;">
            <div style="color:#ffffff;font-weight:600;font-size:14px;margin-bottom:4px;">${escapeHtml(company.name)}</div>
            ${addressParts ? `<div>${escapeHtml(addressParts)}</div>` : ''}
            ${contactParts ? `<div style="margin-top:2px;">${escapeHtml(contactParts)}</div>` : ''}
            ${hideBranding ? '' : `<div style="margin-top:14px;padding-top:12px;border-top:1px solid #1e293b;color:#64748b;font-size:11px;">${t.poweredBy} · <a href="https://gestionflow.net" style="color:#94a3b8;text-decoration:none;">gestionflow.net</a></div>`}
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// Convert plain-text email body (with \n already replaced by <br>) into clean paragraphs
export function textBodyToHtml(text: string): string {
  // Convert URLs to links
  const withLinks = text.replace(
    /(https?:\/\/[^\s<]+)/g,
    (url) => `<a href="${url}" style="color:#2563eb;text-decoration:underline;">${url}</a>`
  );
  // Split on double newlines into paragraphs, single newlines become <br>
  const paragraphs = withLinks
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p style="margin:0 0 14px 0;">${p.replace(/\n/g, '<br>')}</p>`)
    .join('');
  return paragraphs || `<p style="margin:0;">${withLinks}</p>`;
}