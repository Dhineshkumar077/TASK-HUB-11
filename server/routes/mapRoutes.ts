import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

function getMapsApiKey(): string {
  return process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyAG7STglqzPFS3hz35Id-pj8WKE8e0p_0o';
}

// 1. Geocode Address -> { lat, lng, formattedAddress }
router.get('/geocode', async (req: Request, res: Response) => {
  const address = req.query.address as string;
  if (!address || !address.trim()) {
    res.status(400).json({ error: 'Address query parameter is required.' });
    return;
  }

  const apiKey = getMapsApiKey();

  try {
    if (apiKey) {
      const gUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        address.trim()
      )}&key=${apiKey}`;
      const gRes = await fetch(gUrl);
      const gData = await gRes.json();

      if (gData.status === 'OK' && gData.results && gData.results.length > 0) {
        const top = gData.results[0];
        res.json({
          success: true,
          lat: top.geometry.location.lat,
          lng: top.geometry.location.lng,
          formattedAddress: top.formatted_address,
          provider: 'GOOGLE_MAPS_PLATFORM',
        });
        return;
      }
    }

    // High-accuracy fallback via OpenStreetMap Nominatim
    const nomUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      address.trim()
    )}&format=json&limit=1`;
    const nomRes = await fetch(nomUrl, {
      headers: { 'User-Agent': 'TaskHub-App/2.0' },
    });
    const nomData = await nomRes.json();

    if (Array.isArray(nomData) && nomData.length > 0) {
      const top = nomData[0];
      res.json({
        success: true,
        lat: parseFloat(top.lat),
        lng: parseFloat(top.lon),
        formattedAddress: top.display_name,
        provider: 'OPENSTREETMAP_FALLBACK',
      });
      return;
    }

    res.status(404).json({ error: `Could not locate address: "${address}". Please check spelling or select on map.` });
  } catch (err: any) {
    console.error('Geocoding server error:', err);
    res.status(500).json({ error: 'Geocoding service encountered a network error.' });
  }
});

// 2. Reverse Geocode Coordinates -> { formattedAddress }
router.get('/reverse-geocode', async (req: Request, res: Response) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) {
    res.status(400).json({ error: 'Latitude and Longitude query parameters are required.' });
    return;
  }

  const apiKey = getMapsApiKey();
  const latitude = parseFloat(String(lat));
  const longitude = parseFloat(String(lng));

  try {
    if (apiKey) {
      const gUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`;
      const gRes = await fetch(gUrl);
      const gData = await gRes.json();

      if (gData.status === 'OK' && gData.results && gData.results.length > 0) {
        res.json({
          success: true,
          formattedAddress: gData.results[0].formatted_address,
          provider: 'GOOGLE_MAPS_PLATFORM',
        });
        return;
      }
    }

    // High-accuracy fallback via Nominatim
    const nomUrl = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`;
    const nomRes = await fetch(nomUrl, {
      headers: { 'User-Agent': 'TaskHub-App/2.0' },
    });
    const nomData = await nomRes.json();

    if (nomData && nomData.display_name) {
      res.json({
        success: true,
        formattedAddress: nomData.display_name,
        provider: 'OPENSTREETMAP_FALLBACK',
      });
      return;
    }

    res.json({
      success: true,
      formattedAddress: `Location at ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
      provider: 'COORDINATES_ONLY',
    });
  } catch (err: any) {
    console.error('Reverse geocoding error:', err);
    res.json({
      success: true,
      formattedAddress: `Location at ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
      provider: 'FALLBACK',
    });
  }
});

// 3. Address Autocomplete Suggestions
router.get('/autocomplete', async (req: Request, res: Response) => {
  const input = req.query.input as string;
  if (!input || input.trim().length < 2) {
    res.json({ suggestions: [] });
    return;
  }

  const apiKey = getMapsApiKey();

  try {
    if (apiKey) {
      const gUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
        input.trim()
      )}&key=${apiKey}`;
      const gRes = await fetch(gUrl);
      const gData = await gRes.json();

      if (gData.status === 'OK' && gData.predictions) {
        const suggestions = gData.predictions.map((p: any) => ({
          description: p.description,
          placeId: p.place_id,
        }));
        res.json({ suggestions });
        return;
      }
    }

    // Fallback search suggestions via Nominatim
    const nomUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      input.trim()
    )}&format=json&limit=5`;
    const nomRes = await fetch(nomUrl, {
      headers: { 'User-Agent': 'TaskHub-App/2.0' },
    });
    const nomData = await nomRes.json();

    if (Array.isArray(nomData)) {
      const suggestions = nomData.map((item: any) => ({
        description: item.display_name,
        placeId: String(item.place_id),
      }));
      res.json({ suggestions });
      return;
    }

    res.json({ suggestions: [] });
  } catch (err: any) {
    res.json({ suggestions: [] });
  }
});

export default router;
