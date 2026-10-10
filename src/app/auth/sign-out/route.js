import { createTrialSessionHandlers } from '../../../server/trial-session.js';
export const POST = createTrialSessionHandlers().signout;
