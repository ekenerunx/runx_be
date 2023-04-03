import { Module } from '@nestjs/common';
import { PaymentProcessorService } from './payment-processor.service';
import { PaymentProcessorController } from './payment-processor.controller';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

@Module({
  controllers: [PaymentProcessorController],
  providers: [PaymentProcessorService],
  exports: [PaymentProcessorService],
  imports: [HttpModule],
})
export class PaymentProcessorModule {}
