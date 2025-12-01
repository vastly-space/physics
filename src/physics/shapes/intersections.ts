import Vector3 from "../../math/vector3.js"
import AABB from "../../math/aabb.js"
import Box from "./box.js"
import Sphere from "./sphere.js"
import Cylinder from "./cylinder.js"
import Trimesh from "./trimesh.js"
import Triangle from "./triangle.js"

interface Intersection {
	mtv: Vector3;
	tEnter: number;
	tExit: number;
};
const axes = ["x", "y", "z"];

export default class Intersections {
	static static_box_box (a: Box, b: Box): Intersection | null {
		if (!a.aabb.overlaps(b.abbb)) {
			return null;
		} else {
			const overlapX = Math.min(a.aabb.max.x, b.aabb.max.x) - Math.max(a.aabb.min.x, b.aabb.min.x);
			const overlapY = Math.min(a.aabb.max.y, b.aabb.max.y) - Math.max(a.aabb.min.y, b.aabb.min.y);
			const overlapZ = Math.min(a.aabb.max.z, b.aabb.max.z) - Math.max(a.aabb.min.z, b.aabb.min.z);

			const centerA = a.offset;
			const centerB = b.offset;

			const sx = (centerA.x < centerB.x ? -overlapX : overlapX);
			const sy = (centerA.y < centerB.y ? -overlapY : overlapY);
			const sz = (centerA.z < centerB.z ? -overlapZ : overlapZ);

			const mtv = new Vector3();

			if (overlapX <= overlapY && overlapX <= overlapZ) {
				mtv.x = overlapX;
			} else if (overlapZ <= overlapY && overlapZ <= overlapX) {
				mtv.z = overlapZ;
			} else {
				mtv.y = overlapY;
			}

			return {
				tEnter: 0,
				tExit: Infinity,
				mtv: mtv
			}
		}
	}

	static static_box_sphere (b: Box, s: Box): Intersection | null {
		const px = Math.max(b.aabb.min.x, Math.min(b.aabb.max.x, s.offset.x));
		const py = Math.max(b.aabb.min.y, Math.min(b.aabb.max.y, s.offset.y));
		const pz = Math.max(b.aabb.min.z, Math.min(b.aabb.max.z, s.offset.z));

		const dx = px - s.offset.x;
		const dy = py - s.offset.y;
		const dz = pz - s.offset.z;
		const distSq = dx*dx + dy*dy + dz*dz;

		if (distSq > s.radius * s.radius) return null;

		if (distSq !== 0) {
			const dist = Math.sqrt(distSq);
			const penetration = s.radius - dist;
			const mtv = new Vector3(
				(dx/dist * penetration) | 0,
				(dy/dist * penetration) | 0,
				(dz/dist * penetration) | 0
			);
			return {
				mtv: mtv,
				tEnter: 0,
				tExit: Infinity
			};
		} else {
			const dxMin = s.offset.x - b.aabb.min.x;
			const dxMax = b.aabb.max.x - s.offset.x;
			const dyMin = s.offset.y - b.aabb.min.y;
			const dyMax = b.aabb.max.y - sphere.offset.y;
			const dzMin = sphere.offset.z - b.aabb.min.z;
			const dzMax = b.aabb.max.z - sphere.offset.z;

			const minPen = Math.min(dxMin, dxMax, dyMin, dyMax, dzMin, dzMax);

			let mtv = new Vector3();
			if (minPen === dxMin) mtv.x =  dxMin;
			else if (minPen === dxMax) mtv.x = -dxMax;
			else if (minPen === dyMin) mtv.y =  dyMin;
			else if (minPen === dyMax) mtv.y = -dyMax;
			else if (minPen === dzMin) mtv.z =  dzMin;
			else mtv.z = -dzMax;

			return { mtv, tEnter: 0, tExit: Infinity };
		}
	}

	static static_box_cylinder (b: Box, c: Cylinder): Intersection | null {
		return null;
	}

	static static_box_triangle (b: Box, t: Triangle): Intersection | null {
		return null;
	}

	static static_sphere_sphere (a: Sphere, b: Sphere): Intersection | null {
		const R = a.radius + b.radius;
		const dX = b.offset.x - a.offset.x;
		const dY = b.offset.y - a.offset.y;
		const dZ = b.offset.z - a.offset.z;
		const dSq = dX * dX + dY * dY + dZ * dZ; 

		if (dSq) {
			return {
				mtv: new Vector3(0, R, 0),
				tEnter: 0,
				tExit: Infinity
			}
		} else if (dSq <= R * R) {
			const dist = Math.sqrt(dSq);
			const mtv = new Vector3(
				(a.offset.x - b.offset.x) / dist,
				(a.offset.y - b.offset.y) / dist,
				(a.offset.z - b.offset.z) / dist
			);

			const depth = R - dist;

			mtv.scale(depth);

			return {
				mtv: mtv,
				tEnter: 0,
				tExit: Infinity
			}
		} else {
			return null;
		}
	}

	static static_sphere_cylinder (s: Sphere, c: Cylinder): Intersection | null {
		return null;
	}

	static static_sphere_triangle (s: Sphere, t: Triangle): Intersection | null {
		return null;
	}

	static static_cylinder_cylinder (a: Cylinder, b: Cylinder): Intersection | null {
		return null;
	}

	static static_cylinder_triangle (c: Cylinder, t: Triangle): Intersection | null {
		return null;
	}

	static box_box (a: Box, b: Box, avel: Vector3, bvel: Vector3): Intersection | null {
		const rvel = avel.clone().sub(bvel);

		if (rvel.isZero()) {
			return Intersections.static_box_box(a, b);
		}

		let tEnter = -Infinity;
		let tExit = Infinity;

		for (const axis of axes) {
			if (rvel[axis] === 0) {
				if (a.aabb.max[axis] <= b.aabb.min[axis] || a.aabb.min[axis] >= b.aabb.max[axis]) {
					return null;
				}

				continue;
			}

			/*
				aMin(t) < bMax => aMin + vel * t < bMax => t < (bMax - aMin) / vel
				aMax(t) > bMin => aMax + vel * t > bMin => t > (bMin - aMax) / vel
			*/
			const aMin = a.aabb.min[axis];
			const aMax = a.aabb.max[axis];
			const bMin = b.aabb.min[axis];
			const bMax = b.aabb.max[axis];
			const inv = 1/rvel[axis];

			let t1 = (bMax - aMin) * inv;
			let t2 = (bMin - aMax) * inv;

			if (t1 > t2) [t1, t2] = [t2, t1];

			tEnter = Math.max(t1, tEnter);
			tExit = Math.min(t2, tExit);

			if (tEnter > tExit) return null;
			if (tExit < 0) return null;
		}

		const t = Math.max(tEnter, 0);

		if (t > 1) return null;

		const offsetX = rvel.x * t;
		const offsetY = rvel.y * t;
		const offsetZ = rvel.z * t;

		const overlapX = Math.min(a.aabb.max.x + offsetX, b.aabb.max.x) - Math.max(a.aabb.min.x + offsetX, b.aabb.min.x);
		const overlapY = Math.min(a.aabb.max.y + offsetY, b.aabb.max.y) - Math.max(a.aabb.min.y + offsetY, b.aabb.min.y);
		const overlapZ = Math.min(a.aabb.max.z + offsetZ, b.aabb.max.z) - Math.max(a.aabb.min.z + offsetZ, b.aabb.min.z);

		const centerA = a.offset.clone();
		centerA.x += offsetX;
		centerA.y += offsetY;
		centerA.z += offsetZ;
		const centerB = b.offset;

		const sx = (centerA.x < centerB.x ? -overlapX : overlapX);
		const sy = (centerA.y < centerB.y ? -overlapY : overlapY);
		const sz = (centerA.z < centerB.z ? -overlapZ : overlapZ);

		const sx = (centerA.x < centerB.x ? -overlapX : overlapX);
		const sy = (centerA.y < centerB.y ? -overlapY : overlapY);
		const sz = (centerA.z < centerB.z ? -overlapZ : overlapZ);

		const mtv = new Vector3();

		if (overlapX <= overlapY && overlapX <= overlapZ) {
			mtv.x = overlapX | 0;
		} else if (overlapZ <= overlapY && overlapZ <= overlapX) {
			mtv.z = overlapZ | 0;
		} else {
			mtv.y = overlapY | 0;
		}
		
		return {
			mtv: mtv,
			tEnter: tEnter,
			tExit: tExit
		}
	}

	static box_sphere (b: Box, s: Sphere, bvel: Vector3, svel: Vector3): Intersection | null {
		const rvel = bvel.clone().sub(svel);

		if (rvel.isZero()) {
			return Intersections.static_box_sphere(b, s);
		}

		const expanded = b.aabb.clone();
		expanded.expand(new Vector3(s.radius, s.radius, s.radius));

		// test intersection of expanded moving AABB with sphere center

		let tEnter = -Infinity;
		let tExit = Infinity;

		for (const axis of axes) {
			if (rvel[axis] === 0) {
				if (b.aabb.max[axis] <= s.offset[axis] || b.aabb.min[axis] >= s.offset[axis]) {
					return null;
				}

				continue;
			}

			const aMin = b.aabb.min[axis];
			const aMax = b.aabb.max[axis];
			const inv = 1/rvel[axis];

			let t1 = (s.offset[axis] - aMin) * inv;
			let t2 = (s.offset[axis] - aMax) * inv;

			if (t1 > t2) [t1, t2] = [t2, t1];

			tEnter = Math.max(t1, tEnter);
			tExit = Math.min(t2, tExit);

			if (tEnter > tExit) return null;
			if (tExit < 0) return null;
		}

		const t = Math.max(tEnter, 0);

		if (t > 1) return null;

		const cx = s.offset.x - rvel.x * tEnter;
		const cy = s.offset.y - rvel.y * tEnter;
		const cz = s.offset.z - rvel.z * tEnter;

		const px = Math.max(b.aabb.min.x, Math.min(b.aabb.max.x, cx));
		const py = Math.max(b.aabb.min.y, Math.min(b.aabb.max.y, cy));
		const pz = Math.max(b.aabb.min.z, Math.min(b.aabb.max.z, cz));

		const dx = px - cx;
		const dy = py - cy;
		const dz = pz - cz;
		const distSq = dx*dx + dy*dy + dz*dz;

		if (distSq > s.radius * s.radius) return null;

		if (distSq !== 0) {
			const dist = Math.sqrt(distSq);
			const penetration = s.radius - dist;
			const mtv = new Vector3(
				(dx/dist * penetration) | 0,
				(dy/dist * penetration) | 0,
				(dz/dist * penetration) | 0
			);
			return {
				mtv: mtv,
				tEnter: tEnter,
				tExit: tExit
			};
		} else {
			const dxMin = cx - b.aabb.min.x;
			const dxMax = b.aabb.max.x - cx;
			const dyMin = cy - b.aabb.min.y;
			const dyMax = b.aabb.max.y - cy;
			const dzMin = cz - b.aabb.min.z;
			const dzMax = b.aabb.max.z - cz;

			const minPen = Math.min(dxMin, dxMax, dyMin, dyMax, dzMin, dzMax);

			let mtv = new Vector3();
			if (minPen === dxMin) mtv.x =  dxMin;
			else if (minPen === dxMax) mtv.x = -dxMax;
			else if (minPen === dyMin) mtv.y =  dyMin;
			else if (minPen === dyMax) mtv.y = -dyMax;
			else if (minPen === dzMin) mtv.z =  dzMin;
			else mtv.z = -dzMax;

			return { mtv, tEnter: tEnter, tExit: tExit };
		}
	}

	static box_cylinder (b: Box, c: Cylinder): Intersection | null {
		return null;
	}

	static box_triangle (b: Box, t: Triangle): Intersection | null {
		return null;
	}

	static sphere_sphere (a: Sphere, b: Sphere, avel: Vector3, bvel: Vector3): Intersection | null {
		const R = a.radius + b.radius;
		const rp = a.offset.clone().vsub(b.offset);
		const v = avel.clone().sub(bvel);

		if (v.isZero()) return Intersections.static_sphere_sphere(a, b);

		// solve quadratic equation
		let tEnter: number = -Infinity;
		let tExit: number = Infinity;

		const A = v.x * v.x + v.y * v.y + v.z * v.z;
		const B = 2 * (rp.x * v.x + rp.y * v.y + rp.z * v.z);
		const D = B * B - 4 * A * (R * R) ;

		if (D < 0) {
			return null;
		} else if (D === 0) {
			tEnter = (-B)/(2*A);
		} else {
			tEnter = (-B - Math.sqrt(D))/(2*A);
			tExit = (-B + Math.sqrt(D))/(2*A);

			if (tEnter > tExit) [tEnter, tExit] = [tExit, tEnter];
		}

		rp.x += v.x * tEnter;
		rp.y += v.y * tEnter;
		rp.z += v.z * tEnter;

		const dist = Math.sqrt((rp.x)*(rp.x) + (rp.y)*(rp.y) + (rp.z)*(rp.z));
		const depth = R - dist;

		const L = Math.sqrt(rp.x*rp.x + rp.y*rp.y + rp.z*rp.z);
		rp.x /= L;
		rp.y /= L;
		rp.z /= L;

		rp.scale(depth);

		return {
			mtv: rp,
			tEnter: tEnter,
			tExit: tExit
		}
	}

	static sphere_cylinder (s: Sphere, c: Cylinder): Intersection | null {
		return null;
	}

	static sphere_triangle (s: Sphere, t: Triangle): Intersection | null {
		return null;
	}

	static cylinder_triangle (c: Cylinder, t: Triangle): Intersection | null {
		return null;
	}
}