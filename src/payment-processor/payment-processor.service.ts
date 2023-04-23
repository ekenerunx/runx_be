import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { CatchErrorException } from 'src/exceptions';
import { BankList, VerifyBankAccount } from './interface/paystack.interface';
import { SupportedCountries } from 'src/system/system.interface';

@Injectable()
export class PaymentProcessorService {
  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  async paystackHttps<T>(method: 'GET' | 'POST', url: string, data?: any) {
    const SECRET_KEY = this.configService.get<string>(
      'paymentProcessor.secretKey',
    );
    const options = {
      method,
      url: 'https://api.paystack.co/' + url,
      headers: {
        'Content-Type': ['application/json', 'application/json'],
        Authorization: `Bearer ${SECRET_KEY}`,
        'cache-control': 'no-cache',
      },
      ...(data && { data: JSON.stringify(data) }),
    };
    try {
      const response = await firstValueFrom(
        this.httpService.request<T>(options),
      );
      console.log('response', response);
      return response.data;
    } catch (error) {
      throw new CatchErrorException(error);
    }
  }

  async verifyBankAccountNumber(
    bankAccount: string,
    bankCode: string,
  ): Promise<VerifyBankAccount> {
    try {
      const url = `bank/resolve?account_number=${bankAccount}&bank_code=${bankCode}`;
      return await this.paystackHttps<VerifyBankAccount>('GET', url);
    } catch (error) {
      throw new CatchErrorException(error);
    }
  }

  async getSupportedBanks(country: SupportedCountries) {
    const url = `bank?country=${country}`;
    return await this.paystackHttps<BankList>('GET', url);
  }
}
