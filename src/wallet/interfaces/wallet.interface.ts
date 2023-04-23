export interface SpWallet {
  escrow: number;
  hold: number;
  available_balance: number;
}
export interface ClientWallet {
  escrow: number;
  available_balance: number;
  totalPendingFunding: number;
}

export interface SettleFundWalletTransaction {
  reference: string;
  sp_id?: string;
  client_id?: string;
}
