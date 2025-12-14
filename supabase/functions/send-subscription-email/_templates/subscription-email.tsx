import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

export type SubscriptionEmailType = 
  | 'upgrade'
  | 'downgrade_scheduled'
  | 'downgrade_activated'
  | 'billing_change'
  | 'cancellation'

interface SubscriptionEmailProps {
  emailType: SubscriptionEmailType
  firstName: string
  email: string
  newPlanName: string
  oldPlanName?: string
  billingEndDate?: string
  billingType?: 'monthly' | 'yearly'
  nextRenewalDate?: string
  appUrl: string
}

export const SubscriptionEmail = ({
  emailType,
  firstName,
  email,
  newPlanName,
  oldPlanName,
  billingEndDate,
  billingType,
  nextRenewalDate,
  appUrl,
}: SubscriptionEmailProps) => {
  
  const getSubject = () => {
    switch (emailType) {
      case 'upgrade':
        return 'Votre abonnement GestionFlow a été mis à jour'
      case 'downgrade_scheduled':
        return 'Changement de plan programmé — GestionFlow'
      case 'downgrade_activated':
        return 'Votre nouveau plan GestionFlow est maintenant actif'
      case 'billing_change':
        return 'Modification de votre facturation GestionFlow'
      case 'cancellation':
        return "Confirmation d'annulation de votre abonnement GestionFlow"
      default:
        return 'GestionFlow - Mise à jour de votre abonnement'
    }
  }

  const getPreview = () => {
    switch (emailType) {
      case 'upgrade':
        return `Votre plan ${newPlanName} est maintenant actif`
      case 'downgrade_scheduled':
        return `Votre changement vers le plan ${newPlanName} a été programmé`
      case 'downgrade_activated':
        return `Votre plan ${newPlanName} est maintenant actif`
      case 'billing_change':
        return `Votre facturation a été modifiée`
      case 'cancellation':
        return 'Votre abonnement a été annulé'
      default:
        return 'Mise à jour de votre abonnement GestionFlow'
    }
  }

  const getBillingTypeLabel = () => {
    return billingType === 'yearly' ? 'Annuelle' : 'Mensuelle'
  }

  const renderContent = () => {
    switch (emailType) {
      case 'upgrade':
        return (
          <>
            <Text style={text}>
              Merci d'avoir choisi de passer au plan <strong>{newPlanName}</strong>.
            </Text>
            <Text style={highlightBox}>
              ✅ Votre nouveau plan est <strong>actif immédiatement</strong>.
            </Text>
            <Text style={highlightBox}>
              💳 Le montant a été <strong>ajusté au prorata</strong>, en fonction du temps restant dans votre cycle de facturation.
            </Text>
            <Text style={text}>
              Vous pouvez dès maintenant profiter de toutes les fonctionnalités incluses dans votre nouveau plan.
            </Text>
            <Link href={`${appUrl}/dashboard/pricing`} style={button}>
              👉 Voir mon abonnement
            </Link>
          </>
        )

      case 'downgrade_scheduled':
        return (
          <>
            <Text style={text}>
              Nous avons bien enregistré votre demande de changement de plan.
            </Text>
            <Text style={highlightBox}>
              ℹ️ Votre plan actuel restera actif jusqu'à la <strong>fin de votre cycle de facturation</strong>, le {billingEndDate}.
            </Text>
            <Text style={text}>
              À partir de cette date, votre nouveau plan <strong>{newPlanName}</strong> sera automatiquement appliqué.
            </Text>
            <Text style={text}>
              Aucune action supplémentaire n'est requise de votre part.
            </Text>
            <Link href={`${appUrl}/dashboard/pricing`} style={button}>
              👉 Gérer mon abonnement
            </Link>
          </>
        )

      case 'downgrade_activated':
        return (
          <>
            <Text style={text}>
              Votre abonnement GestionFlow a été mis à jour.
            </Text>
            <Text style={highlightBox}>
              Votre plan <strong>{newPlanName}</strong> est maintenant actif.
            </Text>
            <Text style={text}>
              Certaines fonctionnalités peuvent être limitées selon ce plan, mais toutes vos données sont conservées.
            </Text>
            <Link href={`${appUrl}/dashboard/pricing`} style={button}>
              👉 Voir les détails de mon plan
            </Link>
          </>
        )

      case 'billing_change':
        return (
          <>
            <Text style={text}>
              Votre type de facturation a bien été mis à jour.
            </Text>
            <Text style={highlightBox}>
              🧾 Nouvelle facturation : <strong>{getBillingTypeLabel()}</strong>
            </Text>
            <Text style={highlightBox}>
              📅 Prochaine date de renouvellement : {nextRenewalDate}
            </Text>
            <Text style={text}>
              Merci de votre confiance.
            </Text>
            <Link href={`${appUrl}/dashboard/pricing`} style={button}>
              👉 Voir mon abonnement
            </Link>
          </>
        )

      case 'cancellation':
        return (
          <>
            <Text style={text}>
              Votre abonnement GestionFlow a bien été annulé.
            </Text>
            <Text style={highlightBox}>
              ℹ️ Vous conserverez l'accès à votre plan actuel jusqu'à la fin de votre période de facturation, le {billingEndDate}.
            </Text>
            <Text style={text}>
              Après cette date, votre compte passera automatiquement au plan Gratuit.
            </Text>
            <Text style={text}>
              Merci d'avoir utilisé GestionFlow.
            </Text>
            <Link href={`${appUrl}/dashboard`} style={button}>
              👉 Accéder à mon compte
            </Link>
          </>
        )

      default:
        return null
    }
  }

  return (
    <Html>
      <Head />
      <Preview>{getPreview()}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>GestionFlow</Heading>
          <Heading style={h2}>{getSubject()}</Heading>
          <Text style={greeting}>Bonjour {firstName},</Text>
          {renderContent()}
          <Text style={signature}>L'équipe GestionFlow</Text>
          <Text style={footer}>
            Cet email a été envoyé à {email}
          </Text>
          <Text style={footerBrand}>
            GestionFlow - Gestion simplifiée pour votre entreprise
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default SubscriptionEmail

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  borderRadius: '8px',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
}

const h1 = {
  color: '#1a73e8',
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '40px 0 20px',
  padding: '0 48px',
  textAlign: 'center' as const,
}

const h2 = {
  color: '#333',
  fontSize: '22px',
  fontWeight: '600',
  margin: '0 0 24px',
  padding: '0 48px',
  textAlign: 'center' as const,
}

const greeting = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '24px 0 16px',
  padding: '0 48px',
  fontWeight: '500',
}

const text = {
  color: '#555',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
  padding: '0 48px',
}

const highlightBox = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '12px 48px',
  padding: '12px 16px',
  backgroundColor: '#f0f7ff',
  borderRadius: '6px',
  borderLeft: '4px solid #1a73e8',
}

const button = {
  backgroundColor: '#1a73e8',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '14px 20px',
  margin: '28px 48px',
}

const signature = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '32px 0 16px',
  padding: '0 48px',
  fontWeight: '500',
}

const footer = {
  color: '#898989',
  fontSize: '14px',
  lineHeight: '22px',
  marginTop: '32px',
  padding: '0 48px',
  borderTop: '1px solid #eee',
  paddingTop: '24px',
}

const footerBrand = {
  color: '#1a73e8',
  fontSize: '14px',
  fontWeight: '600',
  lineHeight: '22px',
  marginTop: '16px',
  padding: '0 48px',
  textAlign: 'center' as const,
}
