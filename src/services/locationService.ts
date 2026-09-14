export interface DatacenterLocation {
  id: string;
  provider: string;
  facility_code: string;
  city: string;
  state: string | null;
  country: string;
  latitude: number;
  longitude: number;
  metro_area: string | null;
}

export interface CloudRegionLocation {
  id: string;
  provider: string;
  region_code: string;
  region_name: string;
  city: string;
  state: string | null;
  country: string;
  latitude: number;
  longitude: number;
  availability_zones: number;
}

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  city: string;
  state?: string;
  country: string;
}

const mockDatacenters: DatacenterLocation[] = [
  { id: '1', provider: 'Equinix', facility_code: 'NY5', city: 'New York', state: 'NY', country: 'USA', latitude: 40.7128, longitude: -74.0060, metro_area: 'New York' },
  { id: '2', provider: 'Equinix', facility_code: 'SV1', city: 'San Jose', state: 'CA', country: 'USA', latitude: 37.3382, longitude: -121.8863, metro_area: 'Silicon Valley' },
  { id: '3', provider: 'Digital Realty', facility_code: 'CHI1', city: 'Chicago', state: 'IL', country: 'USA', latitude: 41.8781, longitude: -87.6298, metro_area: 'Chicago' },
  { id: '4', provider: 'Coresite', facility_code: 'LA1', city: 'Los Angeles', state: 'CA', country: 'USA', latitude: 34.0522, longitude: -118.2437, metro_area: 'Los Angeles' },
];

const mockCloudRegions: CloudRegionLocation[] = [
  { id: '1', provider: 'AWS', region_code: 'us-east-1', region_name: 'US East (N. Virginia)', city: 'Ashburn', state: 'VA', country: 'USA', latitude: 39.0438, longitude: -77.4874, availability_zones: 6 },
  { id: '2', provider: 'AWS', region_code: 'us-west-2', region_name: 'US West (Oregon)', city: 'Portland', state: 'OR', country: 'USA', latitude: 45.5152, longitude: -122.6784, availability_zones: 4 },
  { id: '3', provider: 'Azure', region_code: 'eastus', region_name: 'East US', city: 'Virginia', state: 'VA', country: 'USA', latitude: 37.3719, longitude: -79.4581, availability_zones: 3 },
  { id: '4', provider: 'GCP', region_code: 'us-central1', region_name: 'Iowa', city: 'Council Bluffs', state: 'IA', country: 'USA', latitude: 41.2619, longitude: -95.8608, availability_zones: 4 },
  { id: '5', provider: 'Oracle', region_code: 'us-ashburn-1', region_name: 'US East (Ashburn)', city: 'Ashburn', state: 'VA', country: 'USA', latitude: 39.0438, longitude: -77.4874, availability_zones: 3 },
];

let datacenterCache: DatacenterLocation[] | null = null;
let cloudRegionCache: Map<string, CloudRegionLocation[]> | null = null;

export async function getDatacenterLocations(): Promise<DatacenterLocation[]> {
  if (datacenterCache) {
    return datacenterCache;
  }

  await new Promise(resolve => setTimeout(resolve, 100));
  datacenterCache = mockDatacenters;
  return datacenterCache;
}

export async function getCloudRegionLocations(provider?: string): Promise<CloudRegionLocation[]> {
  if (!cloudRegionCache) {
    cloudRegionCache = new Map();
  }

  const cacheKey = provider || 'all';
  if (cloudRegionCache.has(cacheKey)) {
    return cloudRegionCache.get(cacheKey)!;
  }

  await new Promise(resolve => setTimeout(resolve, 100));

  const regions = provider
    ? mockCloudRegions.filter(r => r.provider === provider)
    : mockCloudRegions;

  cloudRegionCache.set(cacheKey, regions);
  return regions;
}

export async function getCloudRegionByCode(provider: string, regionCode: string): Promise<CloudRegionLocation | null> {
  await new Promise(resolve => setTimeout(resolve, 50));

  const region = mockCloudRegions.find(
    r => r.provider === provider && r.region_code === regionCode
  );

  return region || null;
}

export async function getDatacenterByFacility(provider: string, facilityCode: string): Promise<DatacenterLocation | null> {
  await new Promise(resolve => setTimeout(resolve, 50));

  const datacenter = mockDatacenters.find(
    d => d.provider === provider && d.facility_code === facilityCode
  );

  return datacenter || null;
}

export function getCloudProviders(): string[] {
  return ['AWS', 'Azure', 'GCP', 'Oracle'];
}

export function getDatacenterProviders(): string[] {
  return ['Equinix', 'Digital Realty', 'Coresite', 'CyrusOne'];
}

export function convertToMapCoordinates(
  latitude: number,
  longitude: number,
  mapWidth: number = 800,
  mapHeight: number = 600
): { x: number; y: number } {
  const x = ((longitude + 180) / 360) * mapWidth;
  const y = ((90 - latitude) / 180) * mapHeight;

  return { x, y };
}

export function clearLocationCache(): void {
  datacenterCache = null;
  cloudRegionCache = null;
}
