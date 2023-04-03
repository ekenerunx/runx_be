import { MessagingService } from './../messaging/messaging.service';
import { RequestPhoneVerificationDto } from './dto/request-phone-verification.dto';
import { PatchUserDto } from './dto/patch-user.dto';
import { ResetTransactionPinDto } from './dto/reset-transaction-pin.dto';
import { CreateTransactionPinDto } from './dto/create-transaction-pin.dto';
import { JwtService } from '@nestjs/jwt';
import { VerificationCodeService } from './../verification-code/verification-code.service';
import { ServiceTypesService } from 'src/services-types/service-types.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Hash } from 'src/common/utils/hash.util';
import { Repository } from 'typeorm';
import { User } from 'src/entities/user.entity';
import { UpdatePassword } from './interfaces/user.interface';
import { InjectRepository } from '@nestjs/typeorm';
import {
  VerificationCodeType,
  IdentifierType,
} from 'src/verification-code/interfaces/verification-code.interface';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { jwtConstants } from 'src/auth/auth.constant';

import {
  CatchErrorException,
  DatabaseException,
  InValidOTPException,
  UserNotFoundException,
} from 'src/exceptions';
import { VerifyPhoneNumberDto } from './dto/verify-phone-number.dto';
import { USER_FIELDS_TO_RETURN } from './users.constant';
import { requestEmailVerificationTemplate } from 'src/common/email-template/request-email-verifcation';
import { createTransactionPinMessage } from 'src/common/email-template/create-trnx-pin';
import { requestTransactionPinResetMessage } from 'src/common/email-template/request-trnx-pin-reset';
import { resetTransactionPinMessage } from 'src/common/email-template/reset-trnx-pin';
import { ListUserQueryDto } from './dto/list-users-query.dto';
import { PaginationResponse } from 'src/common/interface';
import { paginate } from 'nestjs-typeorm-paginate';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly serviceTypesService: ServiceTypesService,
    private readonly verificationCodeService: VerificationCodeService,
    private readonly messagingServive: MessagingService,
    private readonly jwtService: JwtService,
    private readonly messagingService: MessagingService,
  ) {}

  async registerUser(registerUserDto: RegisterUserDto) {
    const {
      password,
      service_types,
      email,
      is_sp,
      first_name,
      last_name,
      gender,
      is_admin,
      is_client,
    } = registerUserDto;
    const hashedPassword = await Hash.encrypt(password);
    const newUser: Partial<User> = {
      password,
      email,
      first_name,
      last_name,
      gender,
      is_admin,
      is_client,
      is_sp,
    };
    newUser.password = hashedPassword;
    const userExists = await this.findUserByEmail(email);

    if (userExists) {
      throw new HttpException('User already exist', HttpStatus.CONFLICT);
    }

    if (is_sp) {
      const serviceTypes = await this.serviceTypesService.getServiceTypesByIds(
        service_types,
      );
      newUser.service_types = serviceTypes;
    }
    const user = await this.userRepository.save(newUser);
    return user;
  }

  async getUserById(id: string) {
    return await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.service_types', 'st')
      .where('user.id = :id', { id })
      .select(USER_FIELDS_TO_RETURN)
      .getOne();
  }
  async getUsersById(ids: string[]) {
    return await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.service_types', 'st')
      .whereInIds(ids)
      // .andWhere('user.is_verified')
      .select(USER_FIELDS_TO_RETURN)
      .getMany();
  }

  async deleteUserById(id: number) {
    const res = await this.userRepository.delete(id);
    return res;
  }

  async patchUser(userId: string, patchUserDto: PatchUserDto) {
    const { service_types, ...__patchUserDto } = patchUserDto;
    // create a check user method
    const user = await this.getUserById(userId);

    if (!user) {
      throw new HttpException('User does not exist', HttpStatus.CONFLICT);
    }

    if (service_types && service_types.length) {
      const serviceTypes = await this.serviceTypesService.getServiceTypesByIds(
        service_types,
      );
      user.service_types = serviceTypes;
    }

    Object.entries(__patchUserDto).forEach(([key, value]) => {
      user[key] = value;
    });
    await this.userRepository.save(user);
    return await this.getUserById(userId);
  }

  async findUserByEmail(email: string): Promise<User> {
    const res = await this.userRepository.findOne({ where: { email } });
    return res;
  }

  async verifyEmail(verifyEmailDto: VerifyEmailDto) {
    const { email, code } = verifyEmailDto;
    const user = await this.findUserByEmail(email);
    if (!user) {
      throw new UserNotFoundException();
    }
    if (user.is_verified) {
      throw new HttpException(
        'User with the credentials has already been verified',
        HttpStatus.NOT_FOUND,
      );
    }
    const isValidCode = await this.verificationCodeService.verifyCode({
      userId: user.id,
      code: code,
      identifier: email,
      iden_type: IdentifierType.EMAIL,
      type: VerificationCodeType.VERIFY_EMAIL,
    });
    if (!isValidCode) {
      throw new HttpException(
        'Invalid or expired verification code try again later',
        HttpStatus.BAD_REQUEST,
      );
    }
    const res = await this.userRepository.update(user.id, {
      is_verified: true,
      verified_at: new Date(),
    });
    const payload = { sub: user.id };
    await this.verificationCodeService.markAsUsed(isValidCode.id);
    const token = await this.jwtService.sign(payload, {
      secret: jwtConstants.secret,
    });
    return {
      access_token: token,
    };
  }

  async updatePassword(data: UpdatePassword) {
    const user = await this.findUserByEmail(data.email);
    if (!user) {
      throw new UserNotFoundException();
    }
    const hashedPassword = await Hash.encrypt(data.password);
    user.password = hashedPassword;
    const res = this.userRepository.save(user);
    return res;
  }

  async requestEmailVerification(email: string) {
    const user = await this.findUserByEmail(email);
    if (!user) {
      throw new UserNotFoundException();
    }
    if (user.is_verified) {
      throw new HttpException(
        'User with the credentials has already been verified',
        HttpStatus.NOT_FOUND,
      );
    }
    const verificationToken = await this.verificationCodeService.generateCode({
      userId: user.id,
      type: VerificationCodeType.VERIFY_EMAIL,
      iden_type: IdentifierType.EMAIL,
      identifier: email,
    });
    const template = requestEmailVerificationTemplate({
      email: user.email,
      firstName: user.first_name,
      token: verificationToken,
    });
    await this.messagingService.sendEmail(template);
  }

  async stipUser(user: User) {
    return user
      ? {
          first_name: user.first_name,
          last_name: user.last_name,
          id: user.id,
        }
      : null;
  }
  async stipServiceProviderUser(user: User) {
    return user
      ? {
          first_name: user.first_name,
          last_name: user.last_name,
          id: user.id,
        }
      : null;
  }

  // transaction pin
  async createTransactionPin(
    currentUser: User,
    createTransactionPinDto: CreateTransactionPinDto,
  ) {
    const user = await this.userRepository.findOne({
      where: { id: currentUser.id },
    });
    if (user.trnx_pin) {
      throw new HttpException(
        'Transaction pin already exist for this user',
        HttpStatus.CONFLICT,
      );
    }
    const hashedTrnxPin = await Hash.encrypt(
      createTransactionPinDto.pin.toString(),
    );
    await this.userRepository.save({ ...user, trnx_pin: hashedTrnxPin });
    const template = createTransactionPinMessage({
      email: user.email,
      firstName: user.first_name,
    });
    await this.messagingService.sendEmail(template);
    return { message: 'Transaction pin created successful' };
  }

  async requestResetTransactionPin(user: User) {
    const token = await this.verificationCodeService.generateCode({
      userId: user.id,
      type: VerificationCodeType.REQUEST_TRNX_PIN_RESET,
      iden_type: IdentifierType.EMAIL,
      identifier: user.email,
    });
    const template = requestTransactionPinResetMessage({
      email: user.email,
      firstName: user.first_name,
      token: token,
    });
    await this.messagingService.sendEmail(template);
    return { message: 'Transaction pin reset successful' };
  }

  async resetTransactionPin(
    currentUser: User,
    resetTransactionPinDto: ResetTransactionPinDto,
  ) {
    const { pin, code } = resetTransactionPinDto;
    const verificationCode = await this.verificationCodeService.verifyCode({
      code: code.toString(),
      type: VerificationCodeType.REQUEST_TRNX_PIN_RESET,
    });
    if (!verificationCode) {
      throw new InValidOTPException();
    }

    // get complete user object
    const user = await this.findUserByEmail(currentUser.email);
    if (!user) {
      throw new UserNotFoundException();
    }
    const hashedTrnxPin = await Hash.encrypt(pin.toString());
    user.trnx_pin = hashedTrnxPin;
    await this.userRepository.save(user);
    await this.verificationCodeService.markAsUsed(verificationCode.id);
    const template = resetTransactionPinMessage({
      email: user.email,
      firstName: user.first_name,
    });
    await this.messagingService.sendEmail(template);
    return { message: 'Transaction pin reset successful' };
  }

  async validateTransactionPin(currentUser: User, transactionPin: string) {
    const user = await this.userRepository.findOne({
      where: { id: currentUser.id },
    });
    const isMatch = await Hash.compare(transactionPin, user.trnx_pin);
    if (isMatch) {
      return true;
    } else {
      throw new HttpException(
        'Incorrect transaction pin',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }
  async getServiceProvider(id: string) {
    try {
      return await this.userRepository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.service_types', 'st')
        .where('user.id = :id', { id })
        .andWhere('user.is_sp')
        .getOne();
    } catch (error) {
      throw new DatabaseException(error);
    }
  }

  async requestPhoneVerification(
    currentUser: User,
    requestPhoneVerificationDto: RequestPhoneVerificationDto,
  ) {
    try {
      const { phone_number } = requestPhoneVerificationDto;
      if (currentUser.phone_number == phone_number) {
        throw new HttpException(
          'Phone number already exist on your profile',
          HttpStatus.CONFLICT,
        );
      }
      const user = await this.userRepository
        .createQueryBuilder('user')
        .where('user.id = :id', { id: currentUser.id })
        .getOne();
      const otp = await this.verificationCodeService.generateCode({
        userId: currentUser.id,
        type: VerificationCodeType.PHONE_NUMBER_VERIFICATION,
        iden_type: IdentifierType.PHONE_NUMBER,
        identifier: phone_number,
      });
      await this.userRepository.save(user);
      return await this.messagingService.sendSMS(
        phone_number,
        `Your verification code is: ${otp} expires in 20 minutes`,
      );
    } catch (error) {
      throw new DatabaseException(error);
    }
  }

  async verifyPhoneNumber(
    currentUser: User,
    verifyPhoneNumberDto: VerifyPhoneNumberDto,
  ) {
    try {
      const { code, phone_number } = verifyPhoneNumberDto;
      const otp = await this.verificationCodeService.verifyCode({
        code,
        userId: currentUser.id,
        type: VerificationCodeType.PHONE_NUMBER_VERIFICATION,
        iden_type: IdentifierType.PHONE_NUMBER,
        identifier: phone_number,
      });
      if (!otp) {
        throw new InValidOTPException();
      }
      const user = await this.userRepository
        .createQueryBuilder('user')
        .where('user.id = :id', { id: currentUser.id })
        .getOne();
      user.is_phone_verified = true;
      user.phone_number = phone_number;
      await this.userRepository.save(user);
      await this.verificationCodeService.markAsUsed(otp.id);
      return await this.messagingService.sendSMS(
        phone_number,
        `Your phone number has been successfully verified`,
      );
    } catch (error) {
      throw new DatabaseException(error);
    }
  }

  async listUsers(
    listUserQueryDto: ListUserQueryDto,
  ): Promise<PaginationResponse<User>> {
    try {
      const { limit, page, is_sp, is_client, is_admin } = listUserQueryDto;
      const queryBuilder = await this.userRepository
        .createQueryBuilder('user')
        .where('user.is_sp = :is_sp', { is_sp })
        .where(
          'user.is_sp = :is_sp OR user.is_client = :is_client OR user.is_admin = :is_admin',
          {
            is_sp,
            is_client,
            is_admin,
          },
        )
        .select([
          'user.id',
          'user.last_name',
          'user.first_name',
          'user.email',
          'user.is_sp',
          'user.is_client',
          'user.is_admin',
        ]);
      return paginate<User>(queryBuilder, { limit, page });
    } catch (error) {
      throw new CatchErrorException(error);
    }
  }
}
