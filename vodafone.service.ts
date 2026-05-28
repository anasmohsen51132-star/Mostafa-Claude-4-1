import crypto from 'crypto';
import { config } from '@/config/env';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/middleware/errorHandler';
import { logger } from '@/lib/logger';
import { PaymentStatus } from '@prisma/client';
import { enrollmentService } from '@/modules/courses/enrollment.service';
import { invoiceService } from '../invoice.service';
import { notificationService } from '@/modules/notifications/notifications.service';

export const vodafoneService = {
  generateOrderId(): string {
    return `MA-VC-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  },

  async createPayment(data: {
    paymentId: string;
    userId: string;
    courseId: string;
    amount: number;
    customerPhone: string;
    customerName: string;
    courseTitle: string;
  }) {
    if (!config.vodafone.merchantId || !config.vodafone.apiKey) {
      throw new AppError('Vodafone Cash not configured', 503, 'SERVICE_UNAVAILABLE');
    }

    const orderId = vodafoneService.generateOrderId();
    const expiryDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const requestBody = {
      merchantId: config.vodafone.merchantId,
      orderId,
      amount: data.amount,
      currency: 'EGP',
      customerPhone: data.customerPhone,
      customerName: data.customerName,
      description: `اشتراك في ${data.courseTitle}`,
      callbackUrl: config.vodafone.callbackUrl,
      expiryTime: expiryDate.toISOString(),
    };

    const signature = crypto
      .createHmac('sha256', config.vodafone.apiKey)
      .update(JSON.stringify(requestBody))
      .digest('hex');

    try {
      const response = await fetch(`${config.vodafone.baseUrl}/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Merchant-ID': config.vodafone.merchantId,
          'X-Signature': signature,
          Accept: 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        const err = await response.text();
        logger.error({ status: response.status, body: err }, 'Vodafone Cash API error');
        throw new AppError('خطأ في خدمة فودافون كاش', 502, 'VODAFONE_API_ERROR');
      }

      const result = await response.json();

      await prisma.payment.update({
        where: { id: data.paymentId },
        data: {
          providerRef: result.transactionId || orderId,
          providerOrderId: orderId,
          providerRawData: result,
          status: PaymentStatus.PENDING,
          expiresAt: expiryDate,
        },
      });

      return {
        transactionId: result.transactionId,
        orderId,
        deepLink: result.deepLink, // Vodafone app deep link
        ussdCode: result.ussdCode, // e.g., *9*amount*merchantCode#
        expiresAt: expiryDate,
        instructions: [
          '١. افتح تطبيق فودافون كاش',
          '٢. اختر "ادفع" ثم "للتجار"',
          '٣. ادخل الكود المميز',
          '٤. تأكد المبلغ وأدخل الرقم السري',
        ],
      };
    } catch (err) {
      if (err instanceof AppError) throw err;
      logger.error({ err }, 'Vodafone Cash payment failed');
      throw new AppError('حدث خطأ في خدمة فودافون كاش', 500, 'PAYMENT_ERROR');
    }
  },

  validateCallbackSignature(body: string, signature: string): boolean {
    if (!config.vodafone.apiKey) return false;
    const expected = crypto
      .createHmac('sha256', config.vodafone.apiKey)
      .update(body)
      .digest('hex');
    return crypto.timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(signature, 'hex'),
    );
  },

  async processCallback(data: {
    transactionId: string;
    orderId: string;
    status: string;
    amount: number;
  }) {
    const payment = await prisma.payment.findFirst({
      where: { providerOrderId: data.orderId },
      include: { user: true },
    });

    if (!payment || payment.status === PaymentStatus.COMPLETED) return;

    if (data.status === 'SUCCESS' || data.status === 'COMPLETED') {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.COMPLETED,
          paidAt: new Date(),
          providerRawData: data as any,
        },
      });

      if (payment.courseId) {
        await enrollmentService.enroll({
          userId: payment.userId,
          courseId: payment.courseId,
          paymentId: payment.id,
          source: 'VODAFONE_CASH' as any,
        });
        await invoiceService.generate(payment.id);
        await notificationService.sendPaymentSuccess({
          userId: payment.userId,
          paymentId: payment.id,
          amount: data.amount,
          courseId: payment.courseId,
        });
      }
    } else if (data.status === 'FAILED' || data.status === 'EXPIRED') {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED },
      });
    }
  },
};
