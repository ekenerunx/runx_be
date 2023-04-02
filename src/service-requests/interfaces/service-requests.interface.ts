export enum ServiceRequestStatus {
  'INVITED' = 'INVITED',
  'COMPLETED' = 'COMPLETED',
  'PENDING' = 'PENDING',
  'AWAITING_PAYMENT' = 'AWAITING_PAYMENT',
  'IN_PROGRESS' = 'IN_PROGRESS',
  'CANCELLED' = 'CANCELLED',
  'NEW' = 'NEW',
}

export interface StartServiceRequestJob {
  serviceRequestId: string;
  proposalId: string;
}
