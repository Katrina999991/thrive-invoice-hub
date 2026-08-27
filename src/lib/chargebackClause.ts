// Chargeback / Receipt Acknowledgment Clause utilities

export const DEFAULT_CHARGEBACK_CLAUSE_FR = 
`Le paiement complet de cette facture constitue une confirmation que les services ou produits ont été livrés et acceptés par le client.

Toute contestation ou demande de rétrofacturation (chargeback) devra être précédée d'une tentative raisonnable de résolution directement avec nous.

En cas de contestation abusive ou frauduleuse, nous nous réservons le droit de fournir toutes preuves nécessaires aux institutions financières afin de contester la réclamation.`;

export const DEFAULT_CHARGEBACK_CLAUSE_EN = 
`Full payment of this invoice constitutes confirmation that the services or products have been delivered and accepted by the client.

Any dispute or chargeback request must be preceded by a reasonable attempt at resolution directly with us.

In the event of an abusive or fraudulent dispute, we reserve the right to provide all necessary evidence to financial institutions to contest the claim.`;

export function getDefaultClauseText(language: 'fr' | 'en', documentType: 'invoice' | 'quote' = 'invoice'): string {
  if (documentType === 'quote') {
    return language === 'fr'
      ? DEFAULT_CHARGEBACK_CLAUSE_FR.replace('cette facture', 'ce devis')
      : DEFAULT_CHARGEBACK_CLAUSE_EN.replace('this invoice', 'this quote');
  }
  return language === 'fr' ? DEFAULT_CHARGEBACK_CLAUSE_FR : DEFAULT_CHARGEBACK_CLAUSE_EN;
}

/**
 * Appends the chargeback clause to existing terms if the client has it enabled.
 * Returns the combined terms string.
 */
export function appendChargebackClause(
  existingTerms: string | null | undefined,
  client: { chargeback_clause_enabled?: boolean; chargeback_clause_text?: string | null } | null | undefined,
  language: 'fr' | 'en',
  documentType: 'invoice' | 'quote' = 'invoice'
): string | null {
  if (!client?.chargeback_clause_enabled) {
    return existingTerms || null;
  }

  const clauseText = client.chargeback_clause_text || getDefaultClauseText(language, documentType);
  const separator = '\n\n───────────────────────────\n\n';
  const clauseHeader = language === 'fr' 
    ? 'Clause de reconnaissance de reception' 
    : 'Receipt Acknowledgment Clause';

  const formattedClause = `${clauseHeader}\n\n${clauseText}`;

  if (existingTerms && existingTerms.trim()) {
    return `${existingTerms}${separator}${formattedClause}`;
  }
  return formattedClause;
}
