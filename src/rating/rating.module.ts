import { Module } from '@nestjs/common';
import { RatingService } from './rating.service';
import { RatingController } from './rating.controller';
import { ServiceRequestModule } from 'src/service-request/service-request.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Rating } from 'src/entities/rating.entity';
import { UsersModule } from 'src/users/users.module';
import { ProposalModule } from 'src/proposal/proposal.module';

@Module({
  imports: [
    ServiceRequestModule,
    TypeOrmModule.forFeature([Rating]),
    UsersModule,
    ProposalModule,
  ],
  controllers: [RatingController],
  providers: [RatingService],
  exports: [RatingService],
})
export class RatingModule {}
