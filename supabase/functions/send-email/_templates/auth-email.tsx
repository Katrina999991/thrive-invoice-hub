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

interface AuthEmailProps {
  supabase_url: string
  email_action_type: string
  redirect_to: string
  token_hash: string
  token: string
  email: string
}

export const AuthEmail = ({
  token,
  supabase_url,
  email_action_type,
  redirect_to,
  token_hash,
  email,
}: AuthEmailProps) => {
  const isRecovery = email_action_type === 'recovery'
  const isMagicLink = email_action_type === 'magiclink'
  const isSignup = email_action_type === 'signup'

  const getTitle = () => {
    if (isRecovery) return 'Réinitialisation de votre mot de passe'
    if (isMagicLink) return 'Connexion à GestionFlow'
    if (isSignup) return 'Bienvenue sur GestionFlow'
    return 'GestionFlow'
  }

  const getPreview = () => {
    if (isRecovery) return 'Réinitialisez votre mot de passe GestionFlow'
    if (isMagicLink) return 'Connectez-vous à GestionFlow avec ce lien'
    if (isSignup) return 'Confirmez votre inscription à GestionFlow'
    return 'GestionFlow'
  }

  const getMessage = () => {
    if (isRecovery) return 'Vous avez demandé à réinitialiser votre mot de passe pour votre compte GestionFlow.'
    if (isMagicLink) return 'Cliquez sur le lien ci-dessous pour vous connecter à GestionFlow.'
    if (isSignup) return 'Bienvenue ! Cliquez sur le lien ci-dessous pour confirmer votre inscription à GestionFlow.'
    return 'Cliquez sur le lien ci-dessous pour continuer.'
  }

  const getButtonText = () => {
    if (isRecovery) return 'Réinitialiser mon mot de passe'
    if (isMagicLink) return 'Se connecter'
    if (isSignup) return 'Confirmer mon inscription'
    return 'Continuer'
  }

  return (
    <Html>
      <Head />
      <Preview>{getPreview()}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>GestionFlow</Heading>
          <Heading style={h2}>{getTitle()}</Heading>
          <Text style={text}>{getMessage()}</Text>
          <Link
            href={`${supabase_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`}
            target="_blank"
            style={button}
          >
            {getButtonText()}
          </Link>
          <Text style={text}>
            Ou copiez et collez ce code temporaire :
          </Text>
          <code style={code}>{token}</code>
          <Text style={footer}>
            Si vous n&apos;avez pas demandé cette action, vous pouvez ignorer cet email en toute sécurité.
          </Text>
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

export default AuthEmail

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
  fontSize: '24px',
  fontWeight: '600',
  margin: '0 0 20px',
  padding: '0 48px',
}

const text = {
  color: '#555',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
  padding: '0 48px',
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
  margin: '24px 48px',
}

const code = {
  display: 'inline-block',
  padding: '16px 4.5%',
  width: '90.5%',
  backgroundColor: '#f4f4f4',
  borderRadius: '5px',
  border: '1px solid #eee',
  color: '#333',
  fontSize: '18px',
  fontWeight: '600',
  letterSpacing: '2px',
  textAlign: 'center' as const,
  margin: '0 48px',
}

const footer = {
  color: '#898989',
  fontSize: '14px',
  lineHeight: '22px',
  marginTop: '24px',
  padding: '0 48px',
}

const footerBrand = {
  color: '#1a73e8',
  fontSize: '14px',
  fontWeight: '600',
  lineHeight: '22px',
  marginTop: '32px',
  padding: '0 48px',
  textAlign: 'center' as const,
}
