export class GeocodingAdapter {
  static async geocode(address: string, city: string, state: string, zip: string): Promise<{ latitude: number, longitude: number } | null> {
    try {
      const query = encodeURIComponent(`${address}, ${city}, ${state} ${zip}`);
      const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Jules-AI-Real-Estate-Concierge/1.0',
        }
      });

      if (!response.ok) {
        console.error('Geocoding API error:', response.statusText);
        return null;
      }

      const data = await response.json();
      if (data && data.length > 0) {
        return {
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon)
        };
      }

      return null;
    } catch (error) {
      console.error('Geocoding adapter error:', error);
      return null;
    }
  }
}
