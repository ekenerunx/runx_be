export const SERVICE_REQUEST_QUEUE = 'SERVICE_REQUEST_QUEUE';
export const RESOLVE_DISPUTE_PROCESS = 'RESOLVE_DISPUTE_PROCESS';
export const START_SERVICE_REQUEST_PROCESS = 'START_SERVICE_REQUEST_PROCESS';

export const GET_SERVICE_REQUEST_BY_ID_FIELDS = [
  'r.id',
  'r.created_by',
  'r.start_add',
  'r.start_state',
  'r.start_city',
  'r.end_add',
  'r.end_state',
  'r.end_city',
  'r.start_date',
  'r.description',
  'r.end_date',
  'r.status',
  'r.amount',
  'st.id',
  'st.name',
  'user.id',
  'user.last_name',
  'user.first_name',
];
