import {
  START_SERVICE_REQUEST_PROCESS,
  RESOLVE_DISPUTE_PROCESS,
} from '../service-request.constant';
import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { SERVICE_REQUEST_QUEUE } from '../service-request.constant';
import { Logger } from '@nestjs/common';
import {
  ResolveDisputeQueueProcess,
  StartServiceRequestJob,
} from '../interfaces/service-requests.interface';
import { ServiceRequestsService } from '../service-requests.service';

@Processor(SERVICE_REQUEST_QUEUE)
export class ServiceRequestConsumer {
  constructor(
    private readonly serviceRequestsService: ServiceRequestsService,
  ) {}
  private readonly logger = new Logger(ServiceRequestConsumer.name);

  @Process(START_SERVICE_REQUEST_PROCESS)
  async startServiceRequest(job: Job<StartServiceRequestJob>) {
    await this.serviceRequestsService.startProposal(job.data.proposalId);
  }

  @Process(RESOLVE_DISPUTE_PROCESS)
  async resolveDispute(job: Job<ResolveDisputeQueueProcess>) {
    const { serviceRequestId, resolveDisputeDto } = job.data;
    await this.serviceRequestsService.resolveDispute(
      serviceRequestId,
      resolveDisputeDto,
    );
  }
}
