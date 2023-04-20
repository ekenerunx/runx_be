import { ServiceProviderJob } from 'src/common/interface/job.interface';
import { ServiceRequestProposal } from 'src/entities/service-request-proposal.entity';

export const stripJob = (p: ServiceRequestProposal): ServiceProviderJob => {
  const sr = p.service_request;
  const created_by = sr.created_by;
  return {
    description: sr.description,
    start_date: sr.start_date,
    start_add: sr.start_add,
    amount: p.proposal_amount || 0,
    id: p.id,
    service_request_id: sr.id,
    created_by: {
      first_name: created_by?.first_name,
      last_name: created_by?.last_name,
      id: created_by.id,
    },
    status: p.status,
  };
};
