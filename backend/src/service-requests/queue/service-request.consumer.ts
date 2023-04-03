import {
  START_SERVICE_REQUEST_PROCESS,
  RESOLVE_DISPUTE_PROCESS,
} from './../service-request.constant';
import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { SERVICE_REQUEST_QUEUE } from '../service-request.constant';
import { Logger } from '@nestjs/common';
import { StartServiceRequestJob } from '../interfaces/service-requests.interface';

@Processor(SERVICE_REQUEST_QUEUE)
export class ServiceRequestConsumer {
  private readonly logger = new Logger(ServiceRequestConsumer.name);

  @Process(START_SERVICE_REQUEST_PROCESS)
  async startServiceRequest(job: Job<StartServiceRequestJob>) {
    this.logger.log(JSON.stringify(job));
  }

  @Process(RESOLVE_DISPUTE_PROCESS)
  async resolveDispute(job: Job<any>) {
    this.logger.log(JSON.stringify(job));
  }
}
