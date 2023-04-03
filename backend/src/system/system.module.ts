import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';
import { ServiceTypesService } from 'src/services-types/service-types.service';
import { SystemController } from './system.controller';
import { ServiceType } from 'src/entities/service-type.entity';
import { PaymentProcessorModule } from 'src/payment-processor/payment-processor.module';

@Module({
  imports: [TypeOrmModule.forFeature([ServiceType]), PaymentProcessorModule],
  controllers: [SystemController],
  providers: [ServiceTypesService],
  exports: [ServiceTypesService],
})
export class SystemModule {}
