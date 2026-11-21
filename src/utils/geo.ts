import { ZARAGOZA_BOUNDS } from '../data/lineData';

export interface Point2D {
  x: number;
  y: number;
}

export const SVG_VIEW_WIDTH = 900;
export const SVG_VIEW_HEIGHT = 1600;
export const SVG_PADDING = 70;

/**
 * Projects GPS coordinates [lng, lat] to SVG 2D space (x, y).
 * Uses a conformal Mercator / equidistant local planar projection calibrated for Zaragoza.
 */
export function projectCoordinates(
  lng: number,
  lat: number,
  width = SVG_VIEW_WIDTH,
  height = SVG_VIEW_HEIGHT,
  padding = SVG_PADDING
): Point2D {
  const { minLng, maxLng, minLat, maxLat } = ZARAGOZA_BOUNDS;

  const innerW = width - padding * 2;
  const innerH = height - padding * 2;

  // X maps linearly to longitude (west -> east)
  const normX = (lng - minLng) / (maxLng - minLng);
  // Y maps inversely to latitude (north -> south)
  const normY = (maxLat - lat) / (maxLat - minLat);

  return {
    x: padding + normX * innerW,
    y: padding + normY * innerH,
  };
}

/**
 * Calculates Euclidean distance between two projected 2D points.
 */
export function pointDistance(p1: Point2D, p2: Point2D): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculates compass heading angle in degrees (0 = north, 90 = east, 180 = south, 270 = west)
 */
export function calculateHeading(from: Point2D, to: Point2D): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y; // screen Y is downwards
  const rad = Math.atan2(dy, dx);
  let deg = (rad * 180) / Math.PI;
  if (deg < 0) deg += 360;
  return deg;
}

/**
 * Great-circle distance between two GPS coordinates using Haversine formula (in meters)
 */
export function calculateHaversineDistance(
  coord1: [number, number],
  coord2: [number, number]
): number {
  const [lng1, lat1] = coord1;
  const [lng2, lat2] = coord2;

  const R = 6371e3; // Earth's radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Generates an SVG path string from a sequence of 2D points with subtle curvature.
 */
export function generateSvgSpline(points: Point2D[], tension = 0.2): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i > 0 ? points[i - 1] : points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i < points.length - 2 ? points[i + 2] : p2;

    const cp1x = p1.x + ((p2.x - p0.x) / 6) * tension * 3;
    const cp1y = p1.y + ((p2.y - p0.y) / 6) * tension * 3;

    const cp2x = p2.x - ((p3.x - p1.x) / 6) * tension * 3;
    const cp2y = p2.y - ((p3.y - p1.y) / 6) * tension * 3;

    path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }

  return path;
}
