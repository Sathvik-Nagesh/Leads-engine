/**
 * Lead Source Registry bootstrap
 * Import this in server startup to register all connectors.
 */

import { leadSourceRegistry } from './types';
import { googleMapsLeadSource } from './google-maps';
import { csvLeadSource } from './csv';

leadSourceRegistry.register(googleMapsLeadSource);
leadSourceRegistry.register(csvLeadSource);

export { leadSourceRegistry, googleMapsLeadSource, csvLeadSource };
export type { LeadSource, RawLead, CampaignConfig, LocationTarget } from './types';
