import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import React from 'npm:react@18.3.1'
import { Resend } from 'npm:resend@4.0.0'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { SubscriptionEmail, SubscriptionEmailType } from './_templates/subscription-email.tsx'
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SubscriptionEmailRequest {
  emailType: SubscriptionEmailType
  userId?: string
  email?: string
  firstName?: string
  newPlanName: string
  oldPlanName?: string
  billingEndDate?: string
  billingType?: 'monthly' | 'yearly'
  nextRenewalDate?: string
}

const getPlanDisplayName = (planType: string): string => {
  switch (planType?.toLowerCase()) {
    case 'free':
      return 'Gratuit'
    case 'premium':
      return 'Premium'
    case 'pro':
      return 'Pro'
    default:
      return planType || 'Gratuit'
  }
}

const getSubject = (emailType: SubscriptionEmailType): string => {
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[SEND-SUBSCRIPTION-EMAIL] Function started')
    
    const requestData: SubscriptionEmailRequest = await req.json()
    console.log('[SEND-SUBSCRIPTION-EMAIL] Request data:', JSON.stringify(requestData))
    
    const { 
      emailType, 
      userId, 
      email: providedEmail, 
      firstName: providedFirstName,
      newPlanName,
      oldPlanName,
      billingEndDate,
      billingType,
      nextRenewalDate
    } = requestData

    if (!emailType) {
      throw new Error('emailType is required')
    }
    
    if (!newPlanName && emailType !== 'cancellation') {
      throw new Error('newPlanName is required')
    }

    let userEmail = providedEmail
    let userFirstName = providedFirstName || 'Cher utilisateur'

    // If userId is provided but email is not, fetch user details from Supabase
    if (userId && !providedEmail) {
      console.log('[SEND-SUBSCRIPTION-EMAIL] Fetching user details for userId:', userId)
      
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      )

      // Get user email from auth.users
      const { data: userData, error: userError } = await supabaseClient.auth.admin.getUserById(userId)
      
      if (userError) {
        console.error('[SEND-SUBSCRIPTION-EMAIL] Error fetching user:', userError)
        throw new Error(`Failed to fetch user: ${userError.message}`)
      }
      
      userEmail = userData.user?.email
      
      // Try to get display name from profiles
      const { data: profileData } = await supabaseClient
        .from('profiles')
        .select('display_name')
        .eq('user_id', userId)
        .single()
      
      if (profileData?.display_name) {
        userFirstName = profileData.display_name.split(' ')[0] // Use first name only
      }
      
      console.log('[SEND-SUBSCRIPTION-EMAIL] User details fetched:', { email: userEmail, firstName: userFirstName })
    }

    if (!userEmail) {
      throw new Error('Could not determine user email')
    }

    const appUrl = Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovable.app') 
      || 'https://gestionflow.lovable.app'
    
    // Remove protocol and path to get just the app domain
    const appDomain = appUrl.includes('supabase') 
      ? 'https://gestionflow.lovable.app'
      : appUrl

    console.log('[SEND-SUBSCRIPTION-EMAIL] Rendering email template')
    
    const html = await renderAsync(
      React.createElement(SubscriptionEmail, {
        emailType,
        firstName: userFirstName,
        email: userEmail,
        newPlanName: getPlanDisplayName(newPlanName),
        oldPlanName: oldPlanName ? getPlanDisplayName(oldPlanName) : undefined,
        billingEndDate,
        billingType,
        nextRenewalDate,
        appUrl: appDomain,
      })
    )

    console.log('[SEND-SUBSCRIPTION-EMAIL] Sending email to:', userEmail)

    const { data, error } = await resend.emails.send({
      from: Deno.env.get('RESEND_FROM') || 'GestionFlow <onboarding@resend.dev>',
      to: [userEmail],
      reply_to: 'support@gestionflow.net',
      subject: getSubject(emailType),
      html,
    })

    if (error) {
      console.error('[SEND-SUBSCRIPTION-EMAIL] Error sending email:', error)
      throw error
    }

    console.log('[SEND-SUBSCRIPTION-EMAIL] Email sent successfully:', data)

    return new Response(
      JSON.stringify({ success: true, data }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error: any) {
    console.error('[SEND-SUBSCRIPTION-EMAIL] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
