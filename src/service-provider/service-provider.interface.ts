import { ServiceProviderJob } from 'src/common/interface/job.interface';

export interface SpJobOverviewResponse {
  todaySchedule: { count: number; data: ServiceProviderJob[] };
  inProgress: { count: number; data: ServiceProviderJob[] };
  invited: { count: number; data: ServiceProviderJob[] };
  pending: { count: number; data: ServiceProviderJob[] };
}
