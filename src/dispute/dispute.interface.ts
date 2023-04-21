export enum DisputeStatus {
  'COMPLETED_BY_SYSTEM' = 'COMPLETED_BY_SYSTEM',
  'CANCELLED_BY_ADMIN' = 'CANCELLED_BY_ADMIN',
  'IN_PROGRESS' = 'IN_PROGRESS',
}

export enum Disputant {
  'SERVICE_PROVIDER' = 'SERVICE_PROVIDER',
  'CLIENT' = 'CLIENT',
}
export enum DisputeResolver {
  'ADMIN' = 'ADMIN',
  'SYSTEM_QUEUE' = 'SYSTEM_QUEUE',
}

export interface ResolveDisputeQueueProcess {
  serviceRequestId: string;
  resolveDisputeDto: {
    disputant: Disputant;
    service_provider_id: string;
    dispute_resolve_action: DisputeResolveAction;
    dispute_resolve_reason: string;
    resolver: DisputeResolver;
  };
}

export enum DisputeResolveAction {
  'PAY_SERVICE_PROVIDER' = 'PAY_SERVICE_PROVIDER',
  'REFUND_CLIENT' = 'REFUND_CLIENT',
}