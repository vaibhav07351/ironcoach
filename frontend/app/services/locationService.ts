import * as Location from 'expo-location';

export type PlaceParts = {
  city: string;
  area: string;
  pincode: string;
  latitude?: number;
  longitude?: number;
};

type NominatimAddress = {
  suburb?: string;
  neighbourhood?: string;
  residential?: string;
  city_district?: string;
  county?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  state_district?: string;
  state?: string;
  postcode?: string;
  road?: string;
};

type NominatimResult = {
  lat?: string;
  lon?: string;
  display_name?: string;
  address?: NominatimAddress;
};

function pick(...values: Array<string | null | undefined>): string {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return '';
}

function fromExpoAddress(
  place: Location.LocationGeocodedAddress
): PlaceParts {
  const city = pick(place.city, place.subregion, place.region);
  const area = pick(
    place.district,
    place.name,
    place.street,
    place.subregion !== city ? place.subregion : undefined
  );
  return {
    city,
    area: area === city ? '' : area,
    pincode: pick(place.postalCode),
  };
}

function fromNominatim(result: NominatimResult): PlaceParts {
  const address = result.address ?? {};
  const city = pick(
    address.city,
    address.town,
    address.village,
    address.municipality,
    address.state_district,
    address.county,
    address.state
  );
  const area = pick(
    address.suburb,
    address.neighbourhood,
    address.residential,
    address.city_district,
    address.road
  );
  const lat = result.lat ? Number(result.lat) : undefined;
  const lng = result.lon ? Number(result.lon) : undefined;
  return {
    city,
    area: area === city ? '' : area,
    pincode: pick(address.postcode),
    latitude: Number.isFinite(lat) ? lat : undefined,
    longitude: Number.isFinite(lng) ? lng : undefined,
  };
}

async function fetchNominatim(url: string): Promise<NominatimResult | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'IronCoach/1.0 (trainer-location)',
      },
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as NominatimResult;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function reverseViaNominatim(
  latitude: number,
  longitude: number
): Promise<PlaceParts | null> {
  const url =
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
    `&lat=${encodeURIComponent(String(latitude))}` +
    `&lon=${encodeURIComponent(String(longitude))}` +
    `&addressdetails=1`;
  const result = await fetchNominatim(url);
  if (!result) {
    return null;
  }
  return fromNominatim(result);
}

/**
 * Resolve city / area / pincode from GPS coordinates.
 * Tries Expo native geocoder first, then OpenStreetMap Nominatim.
 */
export async function resolvePlaceFromCoords(
  latitude: number,
  longitude: number
): Promise<PlaceParts> {
  let parts: PlaceParts = { city: '', area: '', pincode: '', latitude, longitude };

  try {
    const places = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (places[0]) {
      parts = { ...fromExpoAddress(places[0]), latitude, longitude };
    }
  } catch {
    // fall through to Nominatim
  }

  if (!parts.city || !parts.area || !parts.pincode) {
    const fallback = await reverseViaNominatim(latitude, longitude);
    if (fallback) {
      parts = {
        city: parts.city || fallback.city,
        area: parts.area || fallback.area,
        pincode: parts.pincode || fallback.pincode,
        latitude,
        longitude,
      };
    }
  }

  return parts;
}

/**
 * Resolve place from an Indian (or other) postal / PIN code.
 */
export async function resolvePlaceFromPincode(
  pincode: string
): Promise<PlaceParts | null> {
  const code = pincode.trim();
  if (!code) {
    return null;
  }

  // Prefer India-scoped postal lookup, then generic.
  const urls = [
    `https://nominatim.openstreetmap.org/search?format=jsonv2` +
      `&postalcode=${encodeURIComponent(code)}` +
      `&countrycodes=in&addressdetails=1&limit=1`,
    `https://nominatim.openstreetmap.org/search?format=jsonv2` +
      `&q=${encodeURIComponent(code)}` +
      `&addressdetails=1&limit=1`,
  ];

  for (const url of urls) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      let results: NominatimResult[] = [];
      try {
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            Accept: 'application/json',
            'User-Agent': 'IronCoach/1.0 (trainer-location)',
          },
        });
        if (response.ok) {
          results = (await response.json()) as NominatimResult[];
        }
      } finally {
        clearTimeout(timeout);
      }

      const first = results[0];
      if (!first) {
        continue;
      }
      const parts = fromNominatim(first);
      if (!parts.pincode) {
        parts.pincode = code;
      }
      if (parts.city || parts.latitude !== undefined) {
        return parts;
      }
    } catch {
      // try next URL
    }
  }

  // Expo forward geocode as last resort
  try {
    const results = await Location.geocodeAsync(code);
    const first = results[0];
    if (!first) {
      return null;
    }
    const resolved = await resolvePlaceFromCoords(first.latitude, first.longitude);
    return {
      ...resolved,
      pincode: resolved.pincode || code,
    };
  } catch {
    return null;
  }
}
