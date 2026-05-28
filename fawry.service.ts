import crypto from 'crypto';
import { config } from '@/config/env';
import { prisma } from '@/lib/prisma';
import { cache } from '@/lib/redis';
import { AppError } from '@/middleware/errorHandler';
import { logger } from '@/lib/logger';
import { PaymentProvider, PaymentStatus } from '@prisma/client';
import { enrollmentService } from '@/modules/courses/enrollment.service';
import { notificationService } from '@/modules/notifications/notifications.service';
import { invoiceService } from './invoice.service';
import { paymentsTotal } from '@/lib/metrics';

interface FawryChargeRequest {
  merchantCode: string;
  merchantRefNum: string;
  customerName: string;
  customerMobile: string;
  customerEmail?: string;
  amount: number;
  currencyCode: string;
  description: string;
  paymentExpiry?: number; // Unix timestamp
  chargeItems: Array<{
    itemId: string;
    description: string;
    price: number;
    quantity: number;
  }>;
  returnUrl?: string;
  authCaptureModePayment: boolean;
  signature: string;
}

export const fawryService = {
  /**
   * Generate Fawry reference number (11 digits, unique per transaction)
   */
  generateMerchantRef(): string {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    return `MA${timestamp.slice(-7)}${random}`;
  },

  /**
   * Generate HMAC-SHA256 signature for Fawry request
   * Format: merchantCode + merchantRefNum + customerMobile? + amount(2dp) + chargeItems(sorted) + securityKey
   */
  generateSignature(params: {
    merchantRefNum: string;
    customerMobile: string;
    amount: number;
    chargeItems: Array<{ itemId: string; price: number; quantity: number }>;
  }): string {
    if (!config.fawry.merchantCode || !config.fawry.securityKey) {
      throw new AppError('Fawry not configured', 500, 'PAYMENT_CONFIG_ERROR');
    }

    const itemsString = params.chargeItems
      .sort((a, b) => a.itemId.localeCompare(b.itemId))
      .map((item) => `${item.itemId}${item.price.toFixed(2)}${item.quantity}`)
      .join('');

    const signatureString = [
      config.fawry.merchantCode,
      params.merchantRefNum,
      params.customerMobile,
      params.amount.toFixed(2),
      itemsString,
      config.fawry.securityKey,
    ].join('');

    return crypto.createHash('sha256').update(signatureString).digest('hex');
  },

  /**
   * Create Fawry payment — returns reference number for cash payment at Fawry outlet
   */
  async createPayment(data: {
    paymentId: string;
    userId: string;
    courseId: string;
    amount: number;
    customerName: string;
    customerMobile: string;
    customerEmail?: string;
    courseTitle: string;
  }) {
    if (!config.fawry.merchantCode || !config.fawry.securityKey) {
      throw new AppError('Fawry payment not available', 503, 'SERVICE_UNAVAILABLE');
    }

    const merchantRefNum = fawryService.generateMerchantRef();
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 3); // 3 days to pay at Fawry
    const expiryTimestamp = Math.floor(expiryDate.getTime());

    const chargeItems = [
      {
        itemId: data.courseId.slice(0, 20), // Fawry itemId max 20 chars
        description: data.courseTitle.substring(0, 50),
        price: data.amount,
        quantity: 1,
      },
    ];

    const signature = fawryService.generateSignature({
      merchantRefNum,
      customerMobile: data.customerMobile,
      amount: data.amount,
      chargeItems,
    });

    const payload: FawryChargeRequest = {
      merchantCode: config.fawry.merchantCode,
      merchantRefNum,
      customerName: data.customerName,
      customerMobile: data.customerMobile,
      customerEmail: data.customerEmail,
      amount: data.amount,
      currencyCode: 'EGP',
      description: `اشتراك في ${data.courseTitle}`,
      paymentExpiry: expiryTimestamp,
      chargeItems,
      returnUrl: config.fawry.returnUrl,
      authCaptureModePayment: false,
      signature,
    };

    try {
      // Call Fawry API
      const response = await fetch(`${config.fawry.baseUrl}/charge/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        const errText = await response.text();
        logger.error({ status: response.status, body: errText }, 'Fawry API error');
        throw new AppError('خطأ في خدمة الدفع فوري', 502, 'FAWRY_API_ERROR');
      }

      const result = await response.json();

      if (result.statusCode !== 200 && result.type !== 'ChargeResponse') {
        logger.error({ result }, 'Fawry charge failed');
        throw new AppError(result.statusDescription || 'فشل إنشاء طلب الدفع', 400, 'FAWRY_CHARGE_FAILED');
      }

      const fawryRefNum: string = result.referenceNumber || merchantRefNum;

      // Update payment record
      await prisma.payment.update({
        where: { id: data.paymentId },
        data: {
          providerRef: fawryRefNum,
          fawryReferenceNumber: fawryRefNum,
          fawryMerchantCode: config.fawry.merchantCode,
          providerOrderId: merchantRefNum,
          providerRawData: result,
          status: PaymentStatus.PENDING,
          expiresAt: expiryDate,
        },
      });

      // Cache payment status for polling
      await cache.set(
        `fawry:status:${fawryRefNum}`,
        { status: 'UNPAID', paymentId: data.paymentId },
        60 * 60 * 24 * 3, // 3 days TTL
      );

      logger.info({ fawryRefNum, paymentId: data.paymentId }, 'Fawry payment created');

      return {
        referenceNumber: fawryRefNum,
        merchantRefNum,
        expiresAt: expiryDate,
        instructions: [
          '١. اذهب لأقرب فرع فوري أو نقطة خدمة',
          '٢. اعطِ أمين الصندوق رقم المرجع',
          '٣. سيتم تفعيل الكورس تلقائياً بعد الدفع',
        ],
      };
    } catch (err) {
      if (err instanceof AppError) throw err;
      logger.error({ err }, 'Fawry payment creation failed');
      throw new AppError('حدث خطأ أثناء إنشاء طلب الدفع', 500, 'PAYMENT_ERROR');
    }
  },

  /**
   * Query Fawry payment status
   */
  async getPaymentStatus(fawryRefNum: string): Promise<{
    status: 'UNPAID' | 'PAID' | 'CANCELED' | 'REFUNDED' | 'EXPIRED';
    orderAmount?: number;
    paymentTime?: string;
  }> {
    if (!config.fawry.merchantCode || !config.fawry.securityKey) {
      throw new AppError('Fawry not configured', 500, 'PAYMENT_CONFIG_ERROR');
    }

    // Signature for status query: merchantCode + merchantRefNum + securityKey
    const signatureString = `${config.fawry.merchantCode}${fawryRefNum}${config.fawry.securityKey}`;
    const signature = crypto.createHash('sha256').update(signatureString).digest('hex');

    const url = new URL(`${config.fawry.baseUrl}/charge/status`);
    url.searchParams.set('merchantCode', config.fawry.merchantCode);
    url.searchParams.set('merchantRefNum', fawryRefNum);
    url.searchParams.set('signature', signature);

    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new AppError('Failed to check Fawry status', 502, 'FAWRY_STATUS_ERROR');
    }

    const result = await response.json();
    return {
      status: result.paymentStatus as any,
      orderAmount: result.orderAmount,
      paymentTime: result.paymentTime,
    };
  },

  /**
   * Process confirmed Fawry payment (called by webhook or polling)
   */
  async processConfirmedPayment(fawryRefNum: string, rawData: unknown) {
    const payment = await prisma.payment.findFirst({
      where: { fawryReferenceNumber: fawryRefNum },
      include: {
        user: { select: { id: true, name: true, phone: true, email: true } },
      },
    });

    if (!payment) {
      logger.warn({ fawryRefNum }, 'Fawry payment not found for processing');
      return;
    }

    if (payment.status === PaymentStatus.COMPLETED) {
      logger.info({ fawryRefNum }, 'Fawry payment already processed (idempotent)');
      return;
    }

    if (!payment.courseId) {
      logger.error({ fawryRefNum }, 'Payment has no courseId');
      return;
    }

    // Mark payment complete
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.COMPLETED,
        paidAt: new Date(),
        providerRawData: rawData as any,
      },
    });

    // Enroll student
    await enrollmentService.enroll({
      userId: payment.userId,
      courseId: payment.courseId,
      paymentId: payment.id,
      source: PaymentProvider.FAWRY,
    });

    // Generate invoice
    await invoiceService.generate(payment.id);

    // Send notification
    await notificationService.sendPaymentSuccess({
      userId: payment.userId,
      paymentId: payment.id,
      amount: Number(payment.amount),
      courseId: payment.courseId,
    });

    paymentsTotal.inc({ provider: 'fawry', status: 'completed', currency: 'EGP' });

    logger.info({ fawryRefNum, paymentId: payment.id }, 'Fawry payment processed successfully');
  },

  /**
   * Validate Fawry webhook signature
   */
  validateWebhookSignature(payload: {
    fawryRefNum: string;
    merchantRefNum: string;
    paymentAmount: number;
    orderAmount: number;
    paymentStatus: string;
    paymentMethod: string;
    signature: string;
  }): boolean {
    if (!config.fawry.securityKey) return false;

    const expected = crypto
      .createHash('sha256')
      .update(
        [
          payload.fawryRefNum,
          payload.merchantRefNum,
          payload.paymentAmount.toFixed(2),
          payload.orderAmount.toFixed(2),
          payload.orderStatus ?? payload.paymentStatus,
          payload.paymentMethod,
          payload.paymentStatus,
          config.fawry.securityKey,
        ].join(''),
      )
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(payload.signature, 'hex'),
    );
  },
};
