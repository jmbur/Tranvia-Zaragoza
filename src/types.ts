export type DirectionType = 'MAGO_DE_OZ' | 'AVENIDA_ACADEMIA';

export interface DestinationArrival {
  linea: string;
  destino: string;
  minutos: number;
}

export interface StopRawData {
  id: string;
  title: string;
  uri?: string;
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  destinos?: DestinationArrival[];
  mensajes?: string[];
  lastUpdated?: string;
  icon?: string;
}

export interface StopMetadata {
  id: string;
  name: string;
  cleanName: string;
  code: string;
  coordinates: [number, number]; // [lng, lat]
  direction: DirectionType;
  sequenceIndex: number; // 0 to 24
  neighborhood: string;
  connections?: string[]; // e.g. ['Cercanías Renfe C1', 'Líneas Bus Ci1, Ci2']
  isKeyStation?: boolean; // e.g. Plaza del Pilar, Gran Vía, Romareda
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'info';
  category: 'corte' | 'retraso' | 'obras' | 'aviso';
  affectedStops?: string[]; // Stop IDs or clean names
  affectedSection?: string; // e.g. 'Gran Vía ↔ Romareda'
  direction?: DirectionType | 'ALL';
  timestamp: string;
  source: string;
  active: boolean;
}

export interface StopWithRealtime extends StopMetadata {
  destinos: DestinationArrival[];
  mensajes: string[];
  lastUpdated?: string;
  distanceMeters?: number;
  hasIncident?: boolean;
}

export interface NotificationRule {
  stopId: string;
  stopName: string;
  direction: DirectionType;
  thresholdMinutes: number; // 1, 2, 3, 5 minutes
  enabled: boolean;
  lastNotifiedAt?: number;
  timeRangeEnabled?: boolean; // true = only notify in time range, false = all day
  timeRangeStart?: string; // "HH:mm", e.g. "07:30"
  timeRangeEnd?: string; // "HH:mm", e.g. "09:30"
  daysOfWeek?: number[]; // [1..7] where 1 = Lunes, 7 = Domingo. Empty/undefined = todos los días
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  line: string;
  stopName: string;
  destination: string;
  etaMinutes: number;
  timestamp: number;
  direction: DirectionType;
}

export interface TramConvoy {
  id: string; // e.g. 'TZ-01', 'TZ-02'
  direction: DirectionType;
  destinationName: string;
  coordinates: [number, number]; // [lng, lat]
  headingAngle: number; // in degrees for rotation
  currentStopId?: string;
  nextStopId: string;
  nextStopName: string;
  etaMinutes: number;
  status: 'at_stop' | 'in_transit';
  speedKmH: number;
  progressBetweenStops: number; // 0.0 to 1.0
  unitType: 'Urbos 3' | 'Urbos 3 Doble';
  occupancy?: 'low' | 'medium' | 'high';
}

export interface ApiResponse {
  success: boolean;
  totalStops: number;
  lastUpdated: string;
  isCached: boolean;
  stops: StopRawData[];
  alerts: string[];
  incidents?: Incident[];
  activeTramsCount?: number;
}

export type ViewMode = 'map' | 'schematic';

