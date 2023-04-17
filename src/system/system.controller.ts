import { COUNTRIES } from './../constant/countries.constant';
import { Body, Controller, Query } from '@nestjs/common';
import {
  Get,
  Post,
} from '@nestjs/common/decorators/http/request-mapping.decorator';
import { PaymentProcessorService } from 'src/payment-processor/payment-processor.service';
import { ServiceTypesService } from 'src/services-types/service-types.service';
import { SupportedBankQueryDto } from './dto/support-banks.query.dto';
import { RegisterUserDto } from 'src/users/dto/register-user.dto';
import { SystemService } from './system.service';
@Controller('system')
export class SystemController {
  constructor(
    private readonly serviceTypesServices: ServiceTypesService,
    private readonly paymentProcessorService: PaymentProcessorService,
    private readonly systemService: SystemService,
  ) {}

  @Get('init')
  async initializeSystem() {
    const serviceTypes = await this.serviceTypesServices.getServiceTypes();
    const countries = COUNTRIES;
    return { serviceTypes, countries };
  }

  @Get('supported-banks')
  async getSupportedBanks(
    @Query() supportedBanksQueryDto: SupportedBankQueryDto,
  ) {
    const { country } = supportedBanksQueryDto;
    const supportedBanks = await this.paymentProcessorService.getSupportedBanks(
      country,
    );
    return supportedBanks.data.map((b) => ({
      id: b.id,
      name: b.name,
      code: b.code,
      currency: b.currency,
    }));
  }

  @Post('seed-user')
  async seedUsers(@Body() registerUserDto: RegisterUserDto) {
    return this.systemService.seedUser(registerUserDto);
  }
}
