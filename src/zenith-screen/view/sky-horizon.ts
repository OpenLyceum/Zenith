/**
 * sky-horizon.ts
 *
 * Pure helpers for the planetarium horizon: a circle-through-three-points fit
 * used by the horizon-curve / ground-fill renderer. Extracted from
 * `PlanetariumSkyNode` so the geometry is unit-testable without constructing
 * the full scene graph. No Scenery node dependencies — only `dot` (Vector2,
 * Bounds2), `kite` (Shape), and a projection callback supplied by the caller.
 */
import { type Bounds2, Vector2 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";

/** Azimuth / horizon curves are sampled every this many degrees. */
const HORIZON_SAMPLE_STEP_DEG = 2;

/**
 * Circle (center + radius) through three points, or null when they are collinear.
 * Geometrically the unique circumcircle when the points are non-collinear.
 * @internal Exported for unit tests; not part of the application API.
 */
export const circleThroughPoints = (a: Vector2, b: Vector2, c: Vector2): { center: Vector2; radius: number } | null => {
  const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
  if (Math.abs(d) < 1e-6) {
    return null;
  }
  const a2 = a.x * a.x + a.y * a.y;
  const b2 = b.x * b.x + b.y * b.y;
  const c2 = c.x * c.x + c.y * c.y;
  const ux = (a2 * (b.y - c.y) + b2 * (c.y - a.y) + c2 * (a.y - b.y)) / d;
  const uy = (a2 * (c.x - b.x) + b2 * (a.x - c.x) + c2 * (b.x - a.x)) / d;
  const center = new Vector2(ux, uy);
  return { center, radius: center.distance(a) };
};

/**
 * Projects an (altDeg, azDeg) horizon-frame direction to a screen point, or
 * null when the direction is outside the view (culled or beyond the antipode).
 * The projection is supplied by the caller so this module stays renderer-agnostic.
 */
export type HorizonProjector = (altDeg: number, azDeg: number) => Vector2 | null;

/**
 * The horizon curve and the ground region below it, in view pixels. The horizon
 * great circle projects (stereographically) to a circle on screen, so we fit
 * that circle from horizon samples and fill the side away from the view center
 * as ground. Near a level view the circle degenerates to a line, so we fall
 * back to a half-plane below the horizon. Returns nulls when the horizon is
 * entirely out of view.
 */
export const horizonAndGroundShapes = (
  project: HorizonProjector,
  bounds: Bounds2,
): { horizon: Shape | null; ground: Shape | null } => {
  const points: Vector2[] = [];
  for (let az = 0; az < 360; az += HORIZON_SAMPLE_STEP_DEG) {
    const point = project(0, az);
    if (point) {
      points.push(point);
    }
  }
  if (points.length < 3) {
    return { horizon: null, ground: null };
  }

  const n = points.length;
  const diagonal = Math.hypot(bounds.width, bounds.height);
  const circle = circleThroughPoints(
    points[0] as Vector2,
    points[(n / 3) | 0] as Vector2,
    points[((2 * n) / 3) | 0] as Vector2,
  );

  if (circle && circle.radius < 8 * diagonal) {
    const horizon = Shape.circle(circle.center.x, circle.center.y, circle.radius);
    // The view center's altitude is the (non-negative) look altitude, so it is
    // on the sky side; ground is the opposite side of the horizon circle.
    const skyIsInside = circle.center.distance(bounds.center) < circle.radius;
    const disc = Shape.circle(circle.center.x, circle.center.y, circle.radius);
    const ground = skyIsInside ? Shape.bounds(bounds).shapeDifference(disc) : disc;
    return { horizon, ground };
  }

  // Level-view fallback: horizon ≈ a straight line; fill the half-plane below.
  const p1 = points[0] as Vector2;
  const p2 = points[(n / 2) | 0] as Vector2;
  if (p1.distance(p2) < 1e-3) {
    return { horizon: null, ground: null };
  }
  const dir = p2.minus(p1).normalized();
  const normal = new Vector2(-dir.y, dir.x);
  const groundNormal = normal.dot(bounds.center.minus(p1)) > 0 ? normal.negated() : normal;
  const big = 4 * diagonal;
  const a = p1.minus(dir.timesScalar(big));
  const c = p2.plus(dir.timesScalar(big));
  const ground = new Shape()
    .moveToPoint(a)
    .lineToPoint(c)
    .lineToPoint(c.plus(groundNormal.timesScalar(big)))
    .lineToPoint(a.plus(groundNormal.timesScalar(big)))
    .close();
  const horizon = new Shape().moveToPoint(a).lineToPoint(c);
  return { horizon, ground };
};
