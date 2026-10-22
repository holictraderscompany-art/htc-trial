import { defineCloudflareConfig } from '@opennextjs/cloudflare';

// Existing dynamic/no-store routes stay dynamic. No R2, ISR or database migration.
export default defineCloudflareConfig();
