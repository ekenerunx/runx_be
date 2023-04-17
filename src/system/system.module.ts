import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';
import { ServiceTypesService } from 'src/services-types/service-types.service';
import { SystemController } from './system.controller';
import { ServiceType } from 'src/entities/service-type.entity';
import { PaymentProcessorModule } from 'src/payment-processor/payment-processor.module';
import { SystemService } from './system.service';
import { User } from 'src/entities/user.entity';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ServiceType, User]),
    PaymentProcessorModule,
    UsersModule,
  ],
  controllers: [SystemController],
  providers: [ServiceTypesService, SystemService],
  exports: [ServiceTypesService],
})
export class SystemModule {}
