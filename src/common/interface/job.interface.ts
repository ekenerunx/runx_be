import { ServiceRequestStatus } from 'src/service-request/interfaces/service-requests.interface';

export interface ServiceProviderJob {
  description: string;
  start_date: Date;
  start_add: string;
  amount: number;
  id: string;
  service_request_id: string;
  created_by: {
    first_name: string;
    last_name: string;
    id: string;
  };
  status: ServiceRequestStatus;
}
