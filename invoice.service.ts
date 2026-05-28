import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

let invoiceCounter = 0;

export const invoiceService = {
  generateInvoiceNumber(): string {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const seq = String(++invoiceCounter).padStart(6, '0');
    return `INV-${year}${month}-${seq}`;
  },

  async generate(paymentId: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { invoice: true },
    });

    if (!payment || payment.invoice) return payment?.invoice;

    const amount = Number(payment.amount);
    const tax = 0; // Egypt VAT handling - adjust as needed

    try {
      const invoice = await prisma.invoice.create({
        data: {
          userId: payment.userId,
          paymentId: payment.id,
          invoiceNumber: invoiceService.generateInvoiceNumber(),
          amount: payment.amount,
          tax: 0,
          total: payment.amount,
          currency: payment.currency,
          paidAt: payment.paidAt,
        },
      });

      logger.info({ invoiceId: invoice.id, paymentId }, 'Invoice generated');
      return invoice;
    } catch (err) {
      logger.error({ err, paymentId }, 'Failed to generate invoice');
      throw err;
    }
  },
};
