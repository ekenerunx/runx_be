import { sendProposal } from './send-proposal';
import { acceptProposal } from './accept-proposal';
import { completeProposal } from './complete-proposal';
import { startProposal } from './start-proposal';
import { raiseDispute } from './raise-dispute';
import { transactionUpdate } from './transaction-update';
import { resolveDispute } from './resolve-dispute';
import { fundReleasedByClient } from './fun-relased-by-client';

export const EmailTemplate = {
  sendProposal,
  acceptProposal,
  completeProposal,
  startProposal,
  raiseDispute,
  transactionUpdate,
  resolveDispute,
  fundReleasedByClient,
};
