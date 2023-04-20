import { Module } from '@nestjs/common';
import { ServiceProviderService } from './service-provider.service';
import { ServiceProviderController } from './service-provider.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceRequestProposal } from 'src/entities/service-request-proposal.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ServiceRequestProposal])],
  controllers: [ServiceProviderController],
  providers: [ServiceProviderService],
})
export class ServiceProviderModule {}
