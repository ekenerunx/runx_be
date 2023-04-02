import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { PaymentProcessorService } from './payment-processor.service';
import { PaystackWebhookBody } from './interface/paystack.interface';

@Controller('payment-processor')
export class PaymentProcessorController {
  constructor(
    private readonly paymentProcessorService: PaymentProcessorService,
  ) {}

  @Post('/paystack/webhook')
  @HttpCode(200)
  async paystackPaymentWebhook(@Body() body: PaystackWebhookBody) {
    if (body.event === 'customeridentification.success') {
      console.log(body.data);
    }
  }
}
