import { COUNTRIES } from './../constant/countries.constant';
import { Controller } from '@nestjs/common';
import { Get } from '@nestjs/common/decorators/http/request-mapping.decorator';
import { PaymentProcessorService } from 'src/payment-processor/payment-processor.service';
import { ServiceTypesService } from 'src/services-types/service-types.service';
@Controller('system')
export class SystemController {
  constructor(
    private readonly serviceTypesServices: ServiceTypesService,
    private readonly paymentProcessorService: PaymentProcessorService,
  ) {}

  @Get('init')
  async initializeSystem() {
    const serviceTypes = await this.serviceTypesServices.getServiceTypes();
    const countries = COUNTRIES;
    const supportedBanks = await this.paymentProcessorService.getSupportedBanks(
      'nigeria',
    );
    return { serviceTypes, countries, bankList: supportedBanks.data };
  }
}
