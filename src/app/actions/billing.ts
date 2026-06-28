'use server'

import { prisma } from '@/lib/db/prisma'
import Stripe from 'stripe'
import { revalidatePath } from 'next/cache'

// Ensure Stripe doesn't crash during static build if key is missing
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
  apiVersion: '2024-06-20' as any, // using any to bypass strict version typing for this specific stripe version
})

export async function getBillingDetails(organizationId: string) {
  if (process.env.npm_lifecycle_event === 'build') {
    return { plan: 'FREE', minutesUsed: 0, minutesLimit: 50, hasPaymentMethod: false }
  }

  try {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { plan: true, stripeCustomerId: true }
    })

    if (!org) throw new Error('Organization not found')

    // Mock usage data based on call logs
    const callLogs = await prisma.callLog.aggregate({
      where: { organizationId, status: 'COMPLETED' },
      _sum: { duration: true }
    })

    const minutesUsed = Math.ceil((callLogs._sum.duration || 0) / 60)

    let minutesLimit = 50
    if (org.plan === 'STARTER') minutesLimit = 500
    if (org.plan === 'PROFESSIONAL') minutesLimit = 5000
    if (org.plan === 'ENTERPRISE') minutesLimit = 25000

    let hasPaymentMethod = false
    if (org.stripeCustomerId && process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.includes('dummy')) {
        try {
            const customer = await stripe.customers.retrieve(org.stripeCustomerId)
            if (!customer.deleted && (customer as Stripe.Customer).invoice_settings?.default_payment_method) {
                hasPaymentMethod = true
            }
        } catch (e) {
            console.error('Stripe fetch error:', e)
        }
    }

    return {
      plan: org.plan,
      minutesUsed,
      minutesLimit,
      hasPaymentMethod
    }
  } catch (error) {
    console.error("Error fetching billing details:", error)
    return { plan: 'FREE', minutesUsed: 0, minutesLimit: 50, hasPaymentMethod: false }
  }
}

export async function createCheckoutSession(organizationId: string, priceId: string) {
  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('dummy')) {
      return { url: '/settings/billing?error=stripe_not_configured' }
  }

  try {
    const org = await prisma.organization.findUnique({ where: { id: organizationId } })
    if (!org) throw new Error('Organization not found')

    let customerId = org.stripeCustomerId

    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: { organizationId }
      })
      customerId = customer.id
      await prisma.organization.update({
        where: { id: organizationId },
        data: { stripeCustomerId: customerId }
      })
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.BASE_URL}/settings/billing?success=true`,
      cancel_url: `${process.env.BASE_URL}/settings/billing?canceled=true`,
    })

    return { url: session.url }
  } catch (error) {
    console.error("Error creating checkout session:", error)
    return { url: '/settings/billing?error=session_creation_failed' }
  }
}
