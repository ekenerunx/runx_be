import { Module } from '@nestjs/common';
import { RatingService } from './rating.service';
import { RatingController } from './rating.controller';
import { ServiceRequestsModule } from 'src/service-requests/service-requests.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Rating } from 'src/entities/rating.entity';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    ServiceRequestsModule,
    TypeOrmModule.forFeature([Rating]),
    UsersModule,
  ],
  controllers: [RatingController],
  providers: [RatingService],
})
export class RatingModule {}
