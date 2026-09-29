'use client';

import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet icon issue in Next.js
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

type Lead = {
  id: string;
  first_name: string;
  last_name: string;
  property_address: string | null;
  latitude: number | null;
  longitude: number | null;
  lead_type: string;
};

type MapComponentProps = {
  leads: Lead[];
  targetCoords: {lat: number, lng: number} | null;
  radiusMiles: number;
};

export default function MapComponent({ leads, targetCoords, radiusMiles }: MapComponentProps) {
  // Default center (USA approximation)
  const defaultCenter: [number, number] = [39.8283, -98.5795];
  const defaultZoom = targetCoords ? 12 : 4;

  const center: [number, number] = targetCoords
    ? [targetCoords.lat, targetCoords.lng]
    : leads.length > 0 && leads[0].latitude && leads[0].longitude
      ? [leads[0].latitude, leads[0].longitude]
      : defaultCenter;

  const radiusMeters = radiusMiles * 1609.34;

  return (
    <MapContainer center={center} zoom={defaultZoom} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {targetCoords && (
        <>
          <Marker position={[targetCoords.lat, targetCoords.lng]}>
             <Popup>Target Area Center</Popup>
          </Marker>
          <Circle
            center={[targetCoords.lat, targetCoords.lng]}
            radius={radiusMeters}
            pathOptions={{ color: 'blue', fillColor: 'blue', fillOpacity: 0.1 }}
          />
        </>
      )}

      {leads.map(lead => {
        if (!lead.latitude || !lead.longitude) return null;

        return (
          <Marker key={lead.id} position={[lead.latitude, lead.longitude]}>
            <Popup>
              <div className="font-sans">
                <h3 className="font-bold">{lead.first_name} {lead.last_name}</h3>
                <p className="text-sm text-gray-600">{lead.property_address}</p>
                <p className="text-xs bg-gray-100 rounded px-1 mt-1 inline-block">{lead.lead_type}</p>
                <a href={`/leads/${lead.id}`} className="block mt-2 text-blue-600 text-sm hover:underline">View Profile</a>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
