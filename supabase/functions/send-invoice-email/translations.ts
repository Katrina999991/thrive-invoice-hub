// Email template translations
export const emailTranslations = {
  en: {
    // Common words
    dear: 'Dear',
    bestRegards: 'Best regards',
    invoice: 'Invoice',
    
    // New invoice
    newInvoice: {
      subject: 'Invoice {invoice_number} from {company_name}',
      body: `Hello {client_name},

Here is your new invoice. You will find all the details in the summary above, along with a PDF copy attached to this email.

If you have any questions, simply reply to this email.

Thank you for your trust,
{company_name}`
    },
    
    // Overdue
    overdue: {
      subject: 'Payment Overdue - Invoice {invoice_number}',
      body: `Hello {client_name},

A friendly reminder that invoice {invoice_number} is now {days_overdue} day(s) overdue. The summary above includes all key information.

If payment has already been sent, please disregard this message.

Best regards,
{company_name}`
    },
    
    // Payment confirmation
    paymentConfirmation: {
      subject: 'Payment Confirmation - Invoice {invoice_number}',
      body: `Hello {client_name},

We confirm receipt of your payment. Thank you!

Best regards,
{company_name}`
    },
    
    footer: 'Thank you for your business!'
  },
  
  fr: {
    // Common words
    dear: 'Cher/Chère',
    bestRegards: 'Cordialement',
    invoice: 'Facture',
    
    // New invoice
    newInvoice: {
      subject: 'Facture {invoice_number} de {company_name}',
      body: `Bonjour {client_name},

Voici votre nouvelle facture. Vous trouverez tous les détails dans le récapitulatif ci-dessus, ainsi qu'une copie PDF en pièce jointe.

Pour toute question, n'hésitez pas à répondre directement à ce courriel.

Merci de votre confiance,
{company_name}`
    },
    
    // Overdue
    overdue: {
      subject: 'Paiement en retard - Facture {invoice_number}',
      body: `Bonjour {client_name},

Petit rappel amical : votre facture {invoice_number} est aujourd'hui en retard de {days_overdue} jour(s). Le récapitulatif ci-dessus reprend les informations clés.

Si le paiement a déjà été effectué, merci d'ignorer ce message.

Cordialement,
{company_name}`
    },
    
    // Payment confirmation
    paymentConfirmation: {
      subject: 'Confirmation de paiement - Facture {invoice_number}',
      body: `Bonjour {client_name},

Nous confirmons la bonne réception de votre paiement. Merci !

Cordialement,
{company_name}`
    },
    
    footer: 'Merci pour votre confiance !'
  }
};

// Helper function to translate a template from English to French
export function translateTemplate(englishText: string, templateType: 'newInvoice' | 'overdue' | 'paymentConfirmation' | 'footer', isSubject: boolean = false): string {
  // Get the default French template
  const frenchDefault = isSubject 
    ? (emailTranslations.fr[templateType === 'footer' ? 'footer' : templateType] as any).subject
    : (templateType === 'footer' 
        ? emailTranslations.fr.footer 
        : emailTranslations.fr[templateType].body);
  
  const englishDefault = isSubject
    ? (emailTranslations.en[templateType === 'footer' ? 'footer' : templateType] as any).subject
    : (templateType === 'footer'
        ? emailTranslations.en.footer
        : emailTranslations.en[templateType].body);
  
  // If the English text is the default, return the French default
  if (englishText.trim() === englishDefault.trim()) {
    return frenchDefault;
  }
  
  // Otherwise, try to intelligently translate by replacing common phrases
  let translated = englishText;
  
  // Replace common English phrases with French equivalents
  const phraseMap: Record<string, string> = {
    'Dear': 'Cher/Chère',
    'Best regards': 'Cordialement',
    'Thank you for your business': 'Merci pour votre confiance',
    'Thank you for your prompt payment and continued business': 'Merci pour votre paiement rapide et votre fidélité',
    'Thank you for your prompt attention to this matter': 'Merci de votre attention rapide à cette question',
    'Please find attached your invoice': 'Veuillez trouver ci-jointe votre facture',
    'Amount due': 'Montant dû',
    'Due date': 'Date d\'échéance',
    'Invoice': 'Facture',
    'from': 'de',
    'Payment Overdue': 'Paiement en retard',
    'This is a friendly reminder that your invoice': 'Ceci est un rappel amical que votre facture',
    'dated': 'datée du',
    'is now overdue': 'est maintenant en retard',
    'Original amount': 'Montant original',
    'Days overdue': 'Jours de retard',
    'Please remit payment at your earliest convenience to avoid any late fees': 'Veuillez effectuer le paiement dans les plus brefs délais pour éviter les frais de retard',
    'If you have already sent payment, please disregard this notice': 'Si vous avez déjà envoyé le paiement, veuillez ignorer cet avis',
    'Payment Confirmation': 'Confirmation de paiement',
    'We have successfully received your payment for invoice': 'Nous avons reçu avec succès votre paiement pour la facture',
    'Payment details': 'Détails du paiement',
    'Amount': 'Montant',
    'Date paid': 'Date de paiement'
  };
  
  // Replace phrases (case-sensitive for better accuracy)
  for (const [english, french] of Object.entries(phraseMap)) {
    translated = translated.replace(new RegExp(english, 'g'), french);
  }
  
  return translated;
}
