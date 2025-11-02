import React from 'npm:react@18.3.1'
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'
import { Resend } from 'npm:resend@4.0.0'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { AuthEmail } from './_templates/auth-email.tsx'

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string)
let rawSecret = (Deno.env.get('SEND_EMAIL_HOOK_SECRET') as string || '').trim()
let hookSecretB64 = rawSecret

// Normalize to base64-only secret for Standard Webhooks constructor
try {
  // remove surrounding quotes
  if ((hookSecretB64.startsWith('"') && hookSecretB64.endsWith('"')) || (hookSecretB64.startsWith("'") && hookSecretB64.endsWith("'"))) {
    hookSecretB64 = hookSecretB64.slice(1, -1)
  }
  // remove all spaces/newlines
  hookSecretB64 = hookSecretB64.replace(/\s+/g, '')

  // If the secret contains a whsec_ prefix (optionally with version), strip it
  if (hookSecretB64.includes('whsec_')) {
    const fromWhsec = hookSecretB64.slice(hookSecretB64.indexOf('whsec_'))
    hookSecretB64 = fromWhsec.replace(/^whsec_/, '')
  }

  // Convert base64url -> base64 and pad
  hookSecretB64 = hookSecretB64.replace(/-/g, '+').replace(/_/g, '/')
  const pad = hookSecretB64.length % 4
  if (pad) hookSecretB64 = hookSecretB64 + '='.repeat(4 - pad)
} catch (_) {
  // ignore, leave as-is
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const payload = await req.text()
  const headers = Object.fromEntries(req.headers)
  const wh = new Webhook(hookSecretB64)
  
  try {
    console.log('Received webhook request')
    
    const {
      user,
      email_data: { token, token_hash, redirect_to, email_action_type },
    } = wh.verify(payload, headers) as {
      user: {
        email: string
        new_email?: string
      }
      email_data: {
        token: string
        token_hash: string
        redirect_to: string
        email_action_type: string
        site_url: string
        token_new: string
        token_hash_new: string
      }
    }

    console.log('Webhook verified successfully for:', user.email)
    console.log('Email action type:', email_action_type)
    
    // For email change, use the new email address
    const targetEmail = email_action_type === 'email_change' && user.new_email ? user.new_email : user.email
    console.log('Target email:', targetEmail)

    // Extract user language from metadata, default to French
    const userLanguage = user.raw_user_meta_data?.language || 'fr'
    console.log('User language:', userLanguage)

    const html = await renderAsync(
      React.createElement(AuthEmail, {
        supabase_url: Deno.env.get('SUPABASE_URL') ?? '',
        token,
        token_hash,
        redirect_to,
        email_action_type,
        email: user.email,
        language: userLanguage,
      })
    )

    const getSubject = () => {
      if (email_action_type === 'recovery') return 'Réinitialisation de votre mot de passe GestionFlow'
      if (email_action_type === 'magiclink') return 'Connexion à GestionFlow'
      if (email_action_type === 'signup') return 'Bienvenue sur GestionFlow'
      if (email_action_type === 'email_change') return userLanguage === 'en' ? 'Confirm your email change - GestionFlow' : 'Confirmez votre changement d\'email - GestionFlow'
      return 'GestionFlow'
    }

    const getTextContent = () => {
      const verifyLink = `${Deno.env.get('SUPABASE_URL')}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`
      const isEnglish = userLanguage === 'en'
      
      if (email_action_type === 'recovery') {
        return isEnglish
          ? `GestionFlow - Password Reset\n\nYou requested to reset your password for your GestionFlow account.\n\nClick this link to reset your password:\n${verifyLink}\n\nOr copy and paste this temporary code: ${token}\n\nIf you didn't request this action, you can safely ignore this email.\n\nThis email was sent to ${user.email}\n\nGestionFlow - Simplified management for your business`
          : `GestionFlow - Réinitialisation de votre mot de passe\n\nVous avez demandé à réinitialiser votre mot de passe pour votre compte GestionFlow.\n\nCliquez sur ce lien pour réinitialiser votre mot de passe:\n${verifyLink}\n\nOu copiez et collez ce code temporaire: ${token}\n\nSi vous n'avez pas demandé cette action, vous pouvez ignorer cet email en toute sécurité.\n\nCet email a été envoyé à ${user.email}\n\nGestionFlow - Gestion simplifiée pour votre entreprise`
      }
      if (email_action_type === 'magiclink') {
        return isEnglish
          ? `GestionFlow - Login\n\nClick the link below to log in to GestionFlow.\n\n${verifyLink}\n\nOr copy and paste this temporary code: ${token}\n\nIf you didn't request this action, you can safely ignore this email.\n\nThis email was sent to ${user.email}\n\nGestionFlow - Simplified management for your business`
          : `GestionFlow - Connexion\n\nCliquez sur le lien ci-dessous pour vous connecter à GestionFlow.\n\n${verifyLink}\n\nOu copiez et collez ce code temporaire: ${token}\n\nSi vous n'avez pas demandé cette action, vous pouvez ignorer cet email en toute sécurité.\n\nCet email a été envoyé à ${user.email}\n\nGestionFlow - Gestion simplifiée pour votre entreprise`
      }
      if (email_action_type === 'signup') {
        return isEnglish
          ? `GestionFlow - Welcome\n\nWelcome! Click the link below to confirm your GestionFlow registration.\n\n${verifyLink}\n\nOr copy and paste this temporary code: ${token}\n\nIf you didn't request this action, you can safely ignore this email.\n\nThis email was sent to ${user.email}\n\nGestionFlow - Simplified management for your business`
          : `GestionFlow - Bienvenue\n\nBienvenue ! Cliquez sur le lien ci-dessous pour confirmer votre inscription à GestionFlow.\n\n${verifyLink}\n\nOu copiez et collez ce code temporaire: ${token}\n\nSi vous n'avez pas demandé cette action, vous pouvez ignorer cet email en toute sécurité.\n\nCet email a été envoyé à ${user.email}\n\nGestionFlow - Gestion simplifiée pour votre entreprise`
      }
      if (email_action_type === 'email_change') {
        return isEnglish
          ? `GestionFlow - Email Change Confirmation\n\nYou requested to change your email address.\n\nClick the link below to confirm this change:\n${verifyLink}\n\nOr copy and paste this temporary code: ${token}\n\nIf you didn't request this action, please contact support immediately.\n\nThis email was sent to ${targetEmail}\n\nGestionFlow - Simplified management for your business`
          : `GestionFlow - Confirmation de changement d'email\n\nVous avez demandé à changer votre adresse email.\n\nCliquez sur le lien ci-dessous pour confirmer ce changement:\n${verifyLink}\n\nOu copiez et collez ce code temporaire: ${token}\n\nSi vous n'avez pas demandé cette action, veuillez contacter le support immédiatement.\n\nCet email a été envoyé à ${targetEmail}\n\nGestionFlow - Gestion simplifiée pour votre entreprise`
      }
      return `GestionFlow\n\n${verifyLink}\n\nCode: ${token}`
    }

    console.log('Sending email to:', targetEmail)

    const { data, error } = await resend.emails.send({
      from: Deno.env.get('RESEND_FROM') || 'GestionFlow <onboarding@resend.dev>',
      to: [targetEmail],
      reply_to: 'support@gestionflow.net',
      subject: getSubject(),
      html,
      text: getTextContent(),
    })

    if (error) {
      console.error('Error sending email:', error)
      throw error
    }

    console.log('Email sent successfully:', data)

    return new Response(
      JSON.stringify({ success: true, data }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error in send-email function:', error)
    return new Response(
      JSON.stringify({
        error: {
          http_code: error.code || 500,
          message: error.message,
        },
      }),
      {
        status: error.code || 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})
