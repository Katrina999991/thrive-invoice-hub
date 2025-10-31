import React from 'npm:react@18.3.1'
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'
import { Resend } from 'npm:resend@4.0.0'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { AuthEmail } from './_templates/auth-email.tsx'

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string)
// Le secret doit être au format complet v1,whsec_...
let hookSecret = Deno.env.get('SEND_EMAIL_HOOK_SECRET') as string
// Si le secret ne commence pas par v1, on l'ajoute
if (!hookSecret.startsWith('v1,')) {
  hookSecret = `v1,${hookSecret}`
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const payload = await req.text()
  const headers = Object.fromEntries(req.headers)
  const wh = new Webhook(hookSecret)
  
  try {
    console.log('Received webhook request')
    
    const {
      user,
      email_data: { token, token_hash, redirect_to, email_action_type },
    } = wh.verify(payload, headers) as {
      user: {
        email: string
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

    const html = await renderAsync(
      React.createElement(AuthEmail, {
        supabase_url: Deno.env.get('SUPABASE_URL') ?? '',
        token,
        token_hash,
        redirect_to,
        email_action_type,
        email: user.email,
      })
    )

    const getSubject = () => {
      if (email_action_type === 'recovery') return 'Réinitialisation de votre mot de passe GestionFlow'
      if (email_action_type === 'magiclink') return 'Connexion à GestionFlow'
      if (email_action_type === 'signup') return 'Bienvenue sur GestionFlow'
      return 'GestionFlow'
    }

    console.log('Sending email to:', user.email)

    const { data, error } = await resend.emails.send({
      from: 'GestionFlow <onboarding@resend.dev>',
      to: [user.email],
      subject: getSubject(),
      html,
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
