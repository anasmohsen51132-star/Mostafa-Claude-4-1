import { Router, Request, Response } from 'express';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { fawryService } from '@/modules/payments/fawry/fawry.service';
import { stripeService } from '@/modules/payments/stripe/stripe.service';
import { vodafoneService } from '@/modules/payments/vodafone/vodafone.service';
import { WebhookEventStatus } from '@prisma/client';

export const webhooksRouter = Router();

// Idempotency helper
async function ensureIdempotent(eventId: string, provider: string): Promise<boolean> {
  try {
    await prisma.paymentWebhookEvent.create({
      data: {
        provider: provider as any,
        eventType: 'unknown',
        eventId,
        payload: {},
        status: WebhookEventStatus.RECEIVED,
      },
    });
    return true; // First time seen
  } catch {
    return false; // Duplicate
  }
}

// Stripe webhook
webhooksRouter.post('/stripe', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  if (!sig) return res.status(400).send('Missing signature');

  let event: any;
  try {
    event = stripeService.constructWebhookEvent(req.body as Buffer, sig);
  } catch (err: any) {
    logger.warn({ err: err.message }, 'Stripe webhook signature invalid');
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Idempotency
  const isNew = await ensureIdempotent(event.id, 'STRIPE');
  if (!isNew) {
    logger.info({ eventId: event.id }, 'Stripe duplicate webhook ignored');
    return res.json({ received: true });
  }

  // Update event record
  await prisma.paymentWebhookEvent.update({
    where: { eventId: event.id },
    data: { eventType: event.type, payload: event, status: WebhookEventStatus.PROCESSING },
  });

  try {
    await stripeService.handleWebhookEvent(event);
    await prisma.paymentWebhookEvent.update({
      where: { eventId: event.id },
      data: { status: WebhookEventStatus.PROCESSED, processedAt: new Date() },
    });
  } catch (err: any) {
    logger.error({ err, eventId: event.id }, 'Stripe webhook processing failed');
    await prisma.paymentWebhookEvent.update({
      where: { eventId: event.id },
      data: { status: WebhookEventStatus.FAILED, error: err.message, attempts: { increment: 1 } },
    });
    return res.status(500).json({ error: 'Processing failed' });
  }

  res.json({ received: true });
});

// Fawry callback
webhooksRouter.post('/fawry', async (req: Request, res: Response) => {
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { fawryRefNum, paymentStatus, signature, merchantRefNum, paymentAmount, orderAmount, paymentMethod } = body;

  if (!fawryRefNum) return res.status(400).json({ error: 'Missing fawryRefNum' });

  // Validate signature
  const isValid = fawryService.validateWebhookSignature({
    fawryRefNum, merchantRefNum, paymentAmount: Number(paymentAmount),
    orderAmount: Number(orderAmount), paymentStatus, paymentMethod, signature,
  });

  if (!isValid) {
    logger.warn({ fawryRefNum }, 'Fawry webhook signature invalid');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const eventId = `fawry-${fawryRefNum}-${paymentStatus}`;
  const isNew = await ensureIdempotent(eventId, 'FAWRY');
  if (!isNew) return res.json({ status: 'ok' });

  await prisma.paymentWebhookEvent.update({
    where: { eventId },
    data: { eventType: paymentStatus, payload: body, status: WebhookEventStatus.PROCESSING },
  });

  try {
    if (paymentStatus === 'PAID') {
      await fawryService.processConfirmedPayment(fawryRefNum, body);
    }
    await prisma.paymentWebhookEvent.update({
      where: { eventId },
      data: { status: WebhookEventStatus.PROCESSED, processedAt: new Date() },
    });
  } catch (err: any) {
    logger.error({ err, fawryRefNum }, 'Fawry webhook processing failed');
    await prisma.paymentWebhookEvent.update({
      where: { eventId },
      data: { status: WebhookEventStatus.FAILED, error: err.message },
    });
    return res.status(500).json({ error: 'Processing failed' });
  }

  res.json({ status: 'ok' });
});

// Vodafone Cash callback
webhooksRouter.post('/vodafone', async (req: Request, res: Response) => {
  const rawBody = JSON.stringify(req.body);
  const sig = req.headers['x-vodafone-signature'] as string;

  if (sig && !vodafoneService.validateCallbackSignature(rawBody, sig)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const { transactionId, orderId, status, amount } = req.body;
  const eventId = `vodafone-${orderId}-${transactionId}`;
  const isNew = await ensureIdempotent(eventId, 'VODAFONE_CASH');
  if (!isNew) return res.json({ status: 'ok' });

  try {
    await vodafoneService.processCallback({ transactionId, orderId, status, amount });
    await prisma.paymentWebhookEvent.update({
      where: { eventId },
      data: { eventType: status, payload: req.body, status: WebhookEventStatus.PROCESSED, processedAt: new Date() },
    });
  } catch (err: any) {
    await prisma.paymentWebhookEvent.update({
      where: { eventId },
      data: { status: WebhookEventStatus.FAILED, error: err.message },
    });
    return res.status(500).json({ error: 'Processing failed' });
  }

  res.json({ status: 'ok' });
});
