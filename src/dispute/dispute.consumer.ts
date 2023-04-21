import { Process, Processor } from '@nestjs/bull';
import { DisputeService } from './dispute.service';
import { DISPUTE_QUEUE, DISPUTE_RESOLUTION_PROCESS } from './dispute.constatnt';
import { ResolveDisputeQueueProcess } from './dispute.interface';
import { Job } from 'bull';

@Processor(DISPUTE_QUEUE)
export class DisputeConsumer {
  constructor(private readonly disputeService: DisputeService) {}

  @Process(DISPUTE_RESOLUTION_PROCESS)
  async resolveDispute(job: Job<ResolveDisputeQueueProcess>) {
    const { serviceRequestId, resolveDisputeDto } = job.data;
    await this.disputeService.resolveDispute(
      serviceRequestId,
      resolveDisputeDto,
    );
  }
}
