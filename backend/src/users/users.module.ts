import { MessagingModule } from '../messaging/messaging.module';
import { ServiceTypesModule } from '../services-types/service-types.module';
import { VerificationCode } from 'src/entities/verification-code.entity';
import { User } from 'src/entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VerificationCodeService } from '../verification-code/verification-code.service';
import { JwtService } from '@nestjs/jwt';
import { Module } from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { ServiceType } from 'src/entities/service-type.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, ServiceType, VerificationCode]),
    ServiceTypesModule,
    MessagingModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, AuthService, JwtService, VerificationCodeService],
  exports: [UsersService],
})
export class UsersModule {}
