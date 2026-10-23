// Explicit opt-in startup installation: no network, environment or credential I/O.
import { installRedirectErrorFetch } from './redirect-error-fetch.mjs';
installRedirectErrorFetch();
