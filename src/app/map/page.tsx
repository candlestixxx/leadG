'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

// Dynamically import the map component so it doesn't run on the server
// Leaflet uses the window object which is not available in server components
const MapComponent = dynamic(() => import('./MapComponent'), {
  ssr: false,
  loading: () => <div className="h-96 bg-gray-100 animate-pulse flex items-center justify-center">Loading Map...</div>
});

type Lead = {
  id: string;
  first_name: string;
  last_name: string;
  property_address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  latitude: number | null;
  longitude: number | null;
  lead_type: string;
  phone: string | null;
};

export default function MapPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [targetAddress, setTargetAddress] = useState('');
  const [radiusMiles, setRadiusMiles] = useState(5);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [targetCoords, setTargetCoords] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const res = await fetch('/api/leads');
        if (res.ok) {
          const data = await res.json();
          // Only keep leads that have coordinates
          const withCoords = data.filter((l: Lead) => l.latitude !== null && l.longitude !== null);
          setLeads(withCoords);
          setFilteredLeads(withCoords);
        }
      } catch (e) {
        console.error("Failed to load leads for map");
      } finally {
        setLoading(false);
      }
    };
    fetchLeads();

    // Subscribe to SSE for live map updates
    const eventSource = new EventSource('/api/sse');

    eventSource.onmessage = (event) => {
      if (event.data === 'heartbeat') return;
      try {
        const payload = JSON.parse(event.data);
        // Only interested in new_lead events
        if (payload.event === 'new_lead') {
           const newLead = payload.data;
           if (newLead.latitude && newLead.longitude) {
              setLeads(prev => [newLead, ...prev]);
              // Also add to filtered list if it matches the current radius
              setFilteredLeads(prev => {
                if (!targetCoords) return [newLead, ...prev];
                const dist = haversineDistance(targetCoords.lat, targetCoords.lng, newLead.latitude, newLead.longitude);
                if (dist <= radiusMiles) {
                   return [newLead, ...prev];
                }
                return prev;
              });
           }
        }
      } catch (err) {
        // Ignore parse errors on heartbeat
      }
    };

    // Explicit event listener for labeled events
    eventSource.addEventListener('new_lead', (event: any) => {
       try {
           const newLead = JSON.parse(event.data);
           if (newLead.latitude && newLead.longitude) {
              setLeads(prev => {
                 // Prevent duplicates in case React re-runs
                 if (prev.some(l => l.id === newLead.id)) return prev;
                 return [newLead, ...prev];
              });
              setFilteredLeads(prev => {
                if (prev.some(l => l.id === newLead.id)) return prev;
                if (!targetCoords) return [newLead, ...prev];
                const dist = haversineDistance(targetCoords.lat, targetCoords.lng, newLead.latitude, newLead.longitude);
                if (dist <= radiusMiles) {
                   return [newLead, ...prev];
                }
                return prev;
              });
           }
       } catch (err) {}
    });

    return () => {
      eventSource.close();
    };
  }, [radiusMiles, targetCoords]);

  const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const R = 3958.8; // Earth's radius in miles
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleFilter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetAddress) {
      setFilteredLeads(leads);
      setTargetCoords(null);
      return;
    }

    // In a real implementation, you'd call a geocoding API to resolve targetAddress
    // Here we'll do a simple backend call or mock it for the UI
    try {
      // Simulate calling the GeocodingAdapter by calling Nominatim directly from frontend
      const query = encodeURIComponent(targetAddress);
      const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`;

      const response = await fetch(url);
      const data = await response.json();

      if (data && data.length > 0) {
        const targetLat = parseFloat(data[0].lat);
        const targetLng = parseFloat(data[0].lon);

        setTargetCoords({ lat: targetLat, lng: targetLng });

        const closeLeads = leads.filter(l => {
          if (!l.latitude || !l.longitude) return false;
          const dist = haversineDistance(targetLat, targetLng, l.latitude, l.longitude);
          return dist <= radiusMiles;
        });

        setFilteredLeads(closeLeads);
      } else {
        alert("Could not geocode the target address.");
      }
    } catch (e) {
      console.error("Geocoding failed", e);
    }
  };

  const resetFilter = () => {
    setTargetAddress('');
    setFilteredLeads(leads);
    setTargetCoords(null);
  };

  const generateCsv = () => {
    const headers = ["first_name", "last_name", "phone", "property_address", "city", "state", "zip", "lead_type"];
    const rows = filteredLeads.map(l => [
      l.first_name,
      l.last_name,
      l.phone || '',
      `"${l.property_address || ''}"`,
      l.city || '',
      l.state || '',
      l.zip || '',
      l.lead_type
    ].join(","));

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'circle_prospecting_list.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Circle Prospecting Map</h1>
            <p className="text-gray-600 mt-2">Filter your leads by geographic proximity to generate calling lists.</p>
          </div>
          <Link href="/" className="text-blue-600 hover:underline">Back to Dashboard</Link>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">Filter Area</h2>
              <form onSubmit={handleFilter} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Target Address</label>
                  <input
                    type="text"
                    value={targetAddress}
                    onChange={(e) => setTargetAddress(e.target.value)}
                    placeholder="e.g. 123 Main St, Detroit, MI"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Radius (Miles): {radiusMiles}</label>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={radiusMiles}
                    onChange={(e) => setRadiusMiles(parseInt(e.target.value))}
                    className="mt-1 block w-full"
                  />
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 flex-1">
                    Search
                  </button>
                  <button type="button" onClick={resetFilter} className="bg-gray-200 text-gray-800 px-4 py-2 rounded shadow hover:bg-gray-300">
                    Reset
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
              <h2 className="text-xl font-semibold mb-2 text-gray-800">Results</h2>
              <p className="text-gray-600 mb-4">{filteredLeads.length} leads in area</p>

              <button
                onClick={generateCsv}
                disabled={filteredLeads.length === 0}
                className="w-full bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700 disabled:opacity-50"
              >
                Export CSV Call List
              </button>
            </div>
          </div>

          <div className="lg:col-span-3">
             <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden" style={{ height: '600px' }}>
                {loading ? (
                   <div className="w-full h-full flex items-center justify-center bg-gray-100">
                      <p className="text-gray-500">Loading map data...</p>
                   </div>
                ) : (
                  <MapComponent
                    leads={filteredLeads}
                    targetCoords={targetCoords}
                    radiusMiles={radiusMiles}
                  />
                )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
