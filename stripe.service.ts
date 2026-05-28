import Stripe from 'stripe';
import { config } from '@/config/env';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/middleware/errorHandler';
import { logger } from '@/lib/logger';
import { PaymentStatus } from '@prisma/client';
import { enrollmentService } from '@/modules/courses/enrollment.service';
import { invoiceService } from '../invoice.service';
import { notificationService } from '@/modules/notifications/notifications.service';

let stripeClient: Stripe | null = null;

const getStripe = (): Stripe => {
  if (!config.stripe.secretKey) {
    throw new AppError('Stripe not configured', 503, 'SERVICE_UNAVAILABLE');
  }
  if (!stripeClient) {
    stripeClient = new Stripe(config.stripe.secretKey, {
      apiVersion: '2024-04-10',
      typescript: true,
    });
  }
  return stripeClient;
};

export const stripeService = {
  async createPaymentIntent(data: {
    paymentId: string;
    amount: number; // in EGP
    currency?: string;
    userId: string;
    courseId: string;
    customerEmail?: string;
    courseTitle: string;
    idempotencyKey: string;
  }) {
    const stripe = getStripe();
    const amountCents = Math.round(data.amount * 100);

    const intent = await stripe.paymentIntents.create(
      {
        amount: amountCents,
        currency: data.currency || 'egp',
        automatic_payment_methods: { enabled: true },
        metadata: {
          paymentId: data.paymentId,
          userId: data.userId,
          courseId: data.courseId,
          courseTitle: data.courseTitle.substring(0, 500),
        },
        description: `اشتراك في ${data.courseTitle}`,
        receipt_email: data.customerEmail,
      },
      { idempotencyKey: data.idempotencyKey },
    );

    await prisma.payment.update({
      where: { id: data.paymentId },
      data: {
        stripePaymentIntentId: intent.id,
        providerRef: intent.id,
        status: PaymentStatus.PENDING,
      },
    });

    return {
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
    };
  },

  async confirmPayment(paymentIntentId: string) {
    const stripe = getStripe();
    return stripe.paymentIntents.retrieve(paymentIntentId);
  },

  async createRefund(data: {
    stripeChargeId: string;
    amount?: number; // partial refund amount in cents
    reason: Stripe.RefundCreateParams.Reason;
  }) {
    const stripe = getStripe();
    return stripe.refunds.create({
      charge: data.stripeChargeId,
      amount: data.amount,
      reason: data.reason,
    });
  },

  constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
    if (!config.stripe.webhookSecret) {
      throw new AppError('Stripe webhook secret not configured', 500, 'CONFIG_ERROR');
    }
    const stripe = getStripe();
    return stripe.webhooks.constructEvent(payload, signature, config.stripe.webhookSecret);
  },

  async handleWebhookEvent(event: Stripe.Event) {
    logger.info({ eventType: event.type, eventId: event.id }, 'Processing Stripe webhook');

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const intent = event.data.object as Stripe.PaymentIntent;
        await stripeService.handlePaymentSuccess(intent);
        break;
      }
      case 'payment_intent.payment_failed': {
        const intent = event.data.object as Stripe.PaymentIntent;
        await stripeService.handlePaymentFailed(intent);
        break;
      }
      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        await stripeService.handleChargeRefunded(charge);
        break;
      }
      default:
        logger.debug({ eventType: event.type }, 'Unhandled Stripe event type');
    }
  },

  async handlePaymentSuccess(intent: Stripe.PaymentIntent) {
    const paymentId = intent.metadata.paymentId;
    if (!paymentId) return;

    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment || payment.status === PaymentStatus.COMPLETED) return;

    const charge = intent.latest_charge as string | null;

    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.COMPLETED,
        paidAt: new Date(),
        stripeChargeId: charge,
        providerRawData: intent as any,
      },
    });

    if (payment.courseId) {
      await enrollmentService.enroll({
        userId: payment.userId,
        courseId: payment.courseId,
        paymentId: payment.id,
        source: 'STRIPE' as any,
      });

      await invoiceService.generate(payment.id);

      await notificationService.sendPaymentSuccess({
        userId: payment.userId,
        paymentId: payment.id,
        amount: Number(payment.amount),
        courseId: payment.courseId,
      });
    }
  },

  async handlePaymentFailed(intent: Stripe.PaymentIntent) {
    const paymentId = intent.metadata.paymentId;
    if (!paymentId) return;

    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.FAILED,
        errorMessage: intent.last_payment_error?.message || 'Payment failed',
        retryCount: { increment: 1 },
        providerRawData: intent as any,
      },
    });
  },

  async handleChargeRefunded(charge: Stripe.Charge) {
    const payment = await prisma.payment.findFirst({
      where: { stripeChargeId: charge.id },
    });
    if (!payment) return;

    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.REFUNDED },
    });
  },
};
