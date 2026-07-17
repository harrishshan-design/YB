import { Client } from "@googlemaps/google-maps-services-js";

let mapsClient: Client | null = null;

export function getGoogleMapsClient() {
  if (!mapsClient) {
    mapsClient = new Client({});
  }

  return mapsClient;
}

export function getGoogleMapsApiKey() {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    throw new Error("Missing GOOGLE_MAPS_API_KEY");
  }

  return apiKey;
}
