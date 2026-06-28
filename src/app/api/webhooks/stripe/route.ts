import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
  apiVersion: '2024-06-20' as any,
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_dummy'

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const signature = req.headers.get('stripe-signature') as string

    let event: Stripe.Event

    // Only verify signatures if we are actually using a real live or test webhook secret
    if (!webhookSecret.includes('dummy')) {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } else {
        // Fallback for mocked local testing
        event = JSON.parse(body) as Stripe.Event
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session

      // In our billing action, we passed organizationId via customer metadata
      if (session.customer) {
        const customer = await stripe.customers.retrieve(session.customer as string)
        if (!customer.deleted) {
           const organizationId = (customer as Stripe.Customer).metadata?.organizationId

           if (organizationId) {
              // Determine plan from line items (requires expanding line_items, or matching amount/id)
              // For prototype, we'll bump to PROFESSIONAL if payment succeeds
              await prisma.organization.update({
                where: { id: organizationId },
                data: { plan: 'PROFESSIONAL' }
              })
              console.log(`[Stripe Webhook] Upgraded Organization ${organizationId} to PROFESSIONAL plan.`)
           }
        }
      }
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error('[Stripe Webhook] Error:', err.message)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 400 })
  }
}
