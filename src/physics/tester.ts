import Vector3 from "../math/vector3.js"
import AABB from "../math/aabb.js"
import type Shape from "./shape.js"
import { VecPool, AABBPool } from "../utils/pool.js"

import Box from "./shapes/box.js"
import Sphere from "./shapes/sphere.js"
import Capsule from "./shapes/capsule.js"
import Triangle from "./shapes/triangle.js"

export interface Intersection {
	depth: number;
	normal: Vector3;
}

export interface Collision {
	normal: Vector3;
	tEnter: number;
	tExit: number;
	depth: number;
}

export interface ShapeWrapper {
	parentOffset: Vector3;
	shape: Shape;
}

export interface RayTestResult {
	t: number;
	normal: Vector3;
	hitPoint: Vector3;
	distance: number;
}

export class Tester {
	static is_point_in_triangle (p: Vector3, a: Vector3, b: Vector3, c: Vector3): boolean {
		const ab = VecPool.alloc().copy(b).sub(a);
		const bc = VecPool.alloc().copy(c).sub(b);
		const ca = VecPool.alloc().copy(a).sub(c);

		const ap = VecPool.alloc().copy(p).sub(a);
		const bp = VecPool.alloc().copy(p).sub(b);
		const cp = VecPool.alloc().copy(p).sub(c);

		const c1 = VecPool.alloc().copy(ab).cross(ap);
		const c2 = VecPool.alloc().copy(bc).cross(bp);
		const c3 = VecPool.alloc().copy(ca).cross(cp);

		return (
			c1.dot(c2) >= 0 &&
			c2.dot(c3) >= 0
		);
	}

	static closest_points_on_segments (a: Vector3, b: Vector3, c: Vector3, d: Vector3): [Vector3, Vector3] {
		/*
			a - seg1 origin
			u - seg1 direction
			o - seg2 origin
			e - seg2 direction
			t - delta over seg1
			s - delta over seg2

			ray = a + t*u
			segment = o + s*e

			solve for infinite first, then clamp if out of bounds. Closest point must be orthogonal to both

			(a - o + t*u - s*e) * u = 0
			(a - o + t*u - s*e) * e = 0

			au - ou + t*uu - s*ue = 0
			ae - oe + t*ue - s*ee = 0

			t = (ou - au + s*ue)/uu

			ae - oe + ((ou - au + s*ue)/uu)*ue - s*ee = 0
			(ou*ue - au*ue + s*ue*ue)/uu - s*ee = oe - ae
			ou*ue - au*ue + s*ue*ue - s*ee*uu = oe*uu - ae*uu
			s = (oe*uu - ae*uu - ou*ue + au*ue)/(ue*ue - ee*uu)
		*/

		const u = VecPool.alloc().copy(b).sub(a);
		const uu = u.dot(u);
		const e = VecPool.alloc().copy(d).sub(c);
		const ee = e.dot(e);
		const ue = u.dot(e);
		const au = u.dot(a);
		const ae = e.dot(a);
		const ou = u.dot(c);
		const oe = e.dot(c);

		// check parallel
		const det = uu * ee - ue * ue;

		let s: number;
		let t: number;

		if (det < 1e-8) {
			// parallel segments
			
			const axis = VecPool.alloc().copy(b).sub(a).normalize();

			const aproj = a.dot(axis);
			const bproj = b.dot(axis);
			const cproj = c.dot(axis);
			const dproj = d.dot(axis);

			const min1 = Math.min(aproj, bproj);
			const max1 = Math.max(aproj, bproj);
			const min2 = Math.min(cproj, dproj);
			const max2 = Math.max(cproj, dproj);

			if (min1 > max2) {
				return [
					VecPool.alloc().copy(aproj < bproj ? a : b),
					VecPool.alloc().copy(cproj < dproj ? d : c)
				];
			} else if (max1 < min2) {
				return [
					VecPool.alloc().copy(aproj < bproj ? b : a),
					VecPool.alloc().copy(cproj < dproj ? c : d)
				];
			} else {
				const mid = (Math.min(min1, min2) + Math.max(max1, max2)) * 0.5;

				s = aproj < bproj ? (mid - aproj)/(bproj - aproj) : (mid - bproj)/(aproj - bproj);
				t = cproj < dproj ? (mid - cproj)/(dproj - cproj) : (mid - dproj)/(cproj - dproj);
			}
		} else {
			// non-parallel segments
			s = (oe*uu - ae*uu - ou*ue + au*ue)/(ue*ue - ee*uu);
			t = (ou - au + s*ue)/uu;

			if (s < 0 || s > 1) {
				s = Math.max(0, Math.min(s, 1));
				t = (ou - au + s*ue)/uu;
			} else if (t < 0 || t > 1) {
				t = Math.max(0, Math.min(t, 1));
				s = (ae - oe + t*ue)/ee;
			}
		}

		const point1 = VecPool.alloc().copy(a);
		point1.x += u.x * t;
		point1.y += u.y * t;
		point1.z += u.z * t;
		const point2 = VecPool.alloc().copy(c);
		point2.x += e.x * s;
		point2.y += e.y * s;
		point2.z += e.z * s;

		return [point1, point2];
	}

	static sphere_triangle_closest_point (center: Vector3, a: Vector3, b: Vector3, c: Vector3): Vector3 {
		const ab = VecPool.alloc().copy(b).sub(a);
		const ac = VecPool.alloc().copy(c).sub(a);

		const as = VecPool.alloc().copy(center).sub(a);

		const d1 = ab.dot(as);
		const d2 = ac.dot(as);

		if (d1 <= 0 && d2 <= 0) return VecPool.alloc().copy(a);

		const bs = VecPool.alloc().copy(center).sub(b);
		const d3 = ab.dot(bs);
		const d4 = ac.dot(bs);

		if (d3 >= 0 && d4 <= d3) return VecPool.alloc().copy(b);

		const vc = d1 * d4 - d3 * d2;
		if (vc <= 0 && d1 >= 0 && d3 <= 0) {
			// edge AB
			const v = d1 / (d1 - d3);
			return VecPool.alloc().set(
				a.x + ab.x * v,
				a.y + ab.y * v,
				a.z + ab.z * v
			);
		}

		const cs = VecPool.alloc().copy(center).sub(c);

		const d5 = ab.dot(cs);
		const d6 = ac.dot(cs);

		if (d6 >= 0 && d5 <= d6) return VecPool.alloc().copy(c);

		const vb = d5 * d2 - d1 * d6;
		if (vb <= 0 && d2 >= 0 && d6 <= 0) {
			// edge AC
			const w = d2 / (d2 - d6);
			return VecPool.alloc().set(
				a.x + ac.x * w,
				a.y + ac.y * w,
				a.z + ac.z * w
			);
		}

		const va = d3 * d6 - d5 * d4;
		if (va <= 0 && (d4 - d3) >= 0 && (d5 - d6) >= 0) {
			// edge BC
			const bc = VecPool.alloc().copy(c).sub(b);
			const w = (d4 - d3) / ((d4 - d3) + (d5 - d6));
			return VecPool.alloc().set(
				b.x + bc.x * w,
				b.y + bc.y * w,
				b.z + bc.z * w
			);
		}

		// on face
		const denom = 1 / (va + vb + vc);
		const v = vb * denom;
		const w = vc * denom;
		return VecPool.alloc().set(
			a.x + ab.x * v + ac.x * w,
			a.y + ab.y * v + ac.y * w,
			a.z + ab.z * v + ac.z * w
		)
	}

	static static_box_box (a: ShapeWrapper, b: ShapeWrapper): Intersection | null {
		const b1center = VecPool.alloc().copy(a.parentOffset).add(a.shape.offset);
		const b2center = VecPool.alloc().copy(b.parentOffset).add(b.shape.offset);

		const axes = [
			b1center.x > b2center.x ? VecPool.alloc().set(1,0,0) : VecPool.alloc().set(-1,0,0),
			b1center.y > b2center.y ? VecPool.alloc().set(0,1,0) : VecPool.alloc().set(0,-1,0),
			b1center.z > b2center.z ? VecPool.alloc().set(0,0,1) : VecPool.alloc().set(0,0,-1)
		]

		let bestAxisIndex: number = -1;
		let bestAxisDepth: number = Infinity;

		for (let i=0; i<axes.length; i++) {
			const axis = axes[i];
			const b1interval = a.shape.projectOnAxis(a.parentOffset, axis);
			const b2interval = b.shape.projectOnAxis(b.parentOffset, axis);

			if (b1interval[0] > b2interval[1]) return null;
			if (b1interval[1] < b2interval[0]) return null;

			const depth = Math.min(b1interval[1] - b2interval[0], b2interval[1] - b1interval[0]);

			if (depth < bestAxisDepth) {
				bestAxisDepth = depth;
				bestAxisIndex = i
			}
		}

		return {
			depth: bestAxisDepth,
			normal: axes[bestAxisIndex]
		}
	}

	static static_box_sphere (a: ShapeWrapper, b: ShapeWrapper): Intersection | null {
		const bc = VecPool.alloc().copy(a.parentOffset).add(a.shape.offset);
		const sc = VecPool.alloc().copy(b.parentOffset).add(b.shape.offset);
		const aabb = AABBPool.alloc().copy(a.shape.aabb).translate(bc);

		const closestVec = VecPool.alloc().set(
			Math.max(aabb.min.x, Math.min(aabb.max.x, sc.x)),
			Math.max(aabb.min.y, Math.min(aabb.max.y, sc.y)),
			Math.max(aabb.min.z, Math.min(aabb.max.z, sc.z))
		);

		const radius = (b.shape as Sphere).radius;
		const dir = VecPool.alloc().copy(closestVec).sub(sc);
		if (dir.lengthSquared() < radius * radius) {
			const depth = dir.length();
			return {
				depth: depth,
				normal: dir.normalize()
			}
		} else {
			return null;
		}

	}

	static static_box_capsule (a: ShapeWrapper, b: ShapeWrapper): Intersection | null {
		const bc = VecPool.alloc().copy(a.parentOffset).add(a.shape.offset);
		const aabb = AABBPool.alloc().copy(a.shape.aabb).translate(bc);
		const segA = VecPool.alloc().copy(b.parentOffset).add(b.shape.offset);
		segA.y -= (b.shape as Capsule).halfSegmentLength;
		const segB = VecPool.alloc().copy(b.parentOffset).add(b.shape.offset);
		segB.y += (b.shape as Capsule).halfSegmentLength;

		const seg = VecPool.alloc().copy(segB).sub(segA);
		let t = VecPool.alloc().copy(bc).sub(segA).dot(seg)/seg.dot(seg);
		t = Math.max(0, Math.min(1, t));

		const closestOnSegment = VecPool.alloc().set(
			segA.x,
			segA.y + (segB.y - segA.y) * t,
			segA.z
		);
		const closestOnBox = VecPool.alloc().set(
			Math.max(aabb.min.x, Math.min(aabb.max.x, closestOnSegment.x)),
			Math.max(aabb.min.y, Math.min(aabb.max.y, closestOnSegment.y)),
			Math.max(aabb.min.z, Math.min(aabb.max.z, closestOnSegment.z))
		);

		const delta = VecPool.alloc().copy(closestOnBox).sub(closestOnSegment);
		const radius = (b.shape as Capsule).radius;

		if (delta.lengthSquared() > radius * radius) return null;

		const depth = radius - delta.length();

		return {
			normal: delta.normalize(),
			depth: depth
		};
	}

	static static_box_triangle (a: ShapeWrapper, b: ShapeWrapper): Intersection | null {
		const axes = [
			VecPool.alloc().copy(Vector3.XAxis),
			VecPool.alloc().copy(Vector3.YAxis),
			VecPool.alloc().copy(Vector3.ZAxis)
		];

		const triangle = b.shape as Triangle;
		const e0 = VecPool.alloc().copy(triangle.b).sub(triangle.a);
		const e1 = VecPool.alloc().copy(triangle.c).sub(triangle.b);
		const e2 = VecPool.alloc().copy(triangle.a).sub(triangle.c);

		// triangle normal
		axes.push(VecPool.alloc().copy(e0).cross(e1));
		// cross products
		axes.push(VecPool.alloc().copy(axes[0]).cross(e0));
		axes.push(VecPool.alloc().copy(axes[0]).cross(e1));
		axes.push(VecPool.alloc().copy(axes[0]).cross(e2));
		axes.push(VecPool.alloc().copy(axes[1]).cross(e0));
		axes.push(VecPool.alloc().copy(axes[1]).cross(e1));
		axes.push(VecPool.alloc().copy(axes[1]).cross(e2));
		axes.push(VecPool.alloc().copy(axes[2]).cross(e0));
		axes.push(VecPool.alloc().copy(axes[2]).cross(e1));
		axes.push(VecPool.alloc().copy(axes[2]).cross(e2));

		// fix axes
		const finalAxes: Vector3[] = [];

		for (const axis of axes) {
			if (axis.isZero()) continue;

			axis.normalize();

			finalAxes.push(axis);
		}

		const boxCenter = VecPool.alloc().copy(a.parentOffset).add(a.shape.offset);
		const aabb = AABBPool.alloc().copy(a.shape.aabb).translate(boxCenter);

		// vertices in box coords
		const v0 = VecPool.alloc().copy(triangle.a).sub(boxCenter);
		const v1 = VecPool.alloc().copy(triangle.b).sub(boxCenter);
		const v2 = VecPool.alloc().copy(triangle.c).sub(boxCenter);

		let bestAxisIndex = -1;
		let bestAxisDepth = Infinity;

		for (let i=0; i<finalAxes.length; i++) {
			const axis = finalAxes[i];
			const p0 = v0.dot(axis);
			const p1 = v1.dot(axis);
			const p2 = v2.dot(axis);

			const triMin = Math.min(p0, p1, p2);
			const triMax = Math.max(p0, p1, p2);

			const boxInterval = a.shape.projectOnAxis(Vector3.Zero, axis);

			if (triMin > boxInterval[1] || triMax < boxInterval[0]) return null;

			const depth = Math.min(boxInterval[1] - triMin, triMax - boxInterval[0]);

			if (depth < bestAxisDepth) {
				bestAxisDepth = depth;
				bestAxisIndex = i;
			}
		}

		return {
			normal: finalAxes[bestAxisIndex],
			depth: bestAxisDepth
		}
	}

	static static_sphere_sphere (a: ShapeWrapper, b: ShapeWrapper): Intersection | null {
		const c1 = VecPool.alloc().copy(a.parentOffset).add(a.shape.offset);
		const c2 = VecPool.alloc().copy(b.parentOffset).add(b.shape.offset);
		const axis = VecPool.alloc().copy(c1).sub(c2).normalize();
		const r = (a.shape as Sphere).radius + (b.shape as Sphere).radius;

		const s1 = a.shape.projectOnAxis(a.parentOffset, axis);
		const s2 = b.shape.projectOnAxis(b.parentOffset, axis);

		if (s1[1] < s2[0] - r || s1[0] > s2[1] + r) return null;

		const depth = Math.min(s1[1] - (s2[0] - r), s2[1] + r - s1[0]);

		return {
			normal: axis,
			depth: depth
		}
	}

	static static_sphere_capsule (a: ShapeWrapper, b: ShapeWrapper): Intersection | null {
		const sc = VecPool.alloc().copy(a.parentOffset).add(a.shape.offset);
		const segA = VecPool.alloc().copy(b.parentOffset).add(b.shape.offset);
		segA.y -= (b.shape as Capsule).halfSegmentLength;
		const segB = VecPool.alloc().copy(b.parentOffset).add(b.shape.offset);
		segB.y += (b.shape as Capsule).halfSegmentLength;

		const segment = VecPool.alloc().copy(segB).sub(segA);
		const centerToSegment = VecPool.alloc().copy(sc).sub(segA);
		let t = centerToSegment.dot(segment)/segment.dot(segment);

		t = Math.max(0, Math.min(1, t));

		const closestOnSegment = VecPool.alloc().set(
			segA.x + segment.x * t,
			segA.y + segment.y * t,
			segA.z + segment.z * t
		);

		const dist = VecPool.alloc().copy(sc).sub(closestOnSegment);
		const r = (a.shape as Sphere).radius + (b.shape as Capsule).radius;

		if (dist.lengthSquared() > r*r) return null;

		const depth = r - dist.length();
		dist.normalize();

		return {
			normal: dist,
			depth: depth
		}
	}

	static static_sphere_triangle (a: ShapeWrapper, b: ShapeWrapper): Intersection | null {
		const center = VecPool.alloc().copy(a.parentOffset).add(a.shape.offset);
		const radius = (a.shape as Sphere).radius;

		const triangle = b.shape as Triangle;
		const closestPoint = Tester.sphere_triangle_closest_point(center, triangle.a, triangle.b, triangle.c);

		const dist = VecPool.alloc().copy(center).sub(closestPoint);

		if (dist.lengthSquared() > radius*radius) return null;

		const dl = dist.length();

		if (dl < 1e-8) {
			// sphere center is on plane
			const e0 = VecPool.alloc().copy(triangle.b).sub(triangle.a);
			const e1 = VecPool.alloc().copy(triangle.c).sub(triangle.b);
			e0.cross(e1).normalize();

			return {
				normal: e0,
				depth: radius
			}
		} else {
			dist.normalize();

			return {
				normal: dist,
				depth: radius - dl
			}
		}
	}

	static static_capsule_capsule (a: ShapeWrapper, b: ShapeWrapper): Intersection | null {
		const ac = VecPool.alloc().copy(a.parentOffset).add(a.shape.offset);
		const bc = VecPool.alloc().copy(b.parentOffset).add(b.shape.offset);

		const ar = (a.shape as Capsule).radius;
		const ahl = (a.shape as Capsule).halfSegmentLength;
		const segA = VecPool.alloc().copy(ac);
		segA.y -= ahl;
		const segB = VecPool.alloc().copy(ac);
		segB.y += ahl;

		const br = (b.shape as Capsule).radius;
		const bhl = (b.shape as Capsule).halfSegmentLength;
		const segC = VecPool.alloc().copy(bc);
		segC.y -= bhl;
		const segD = VecPool.alloc().copy(bc);
		segD.y += bhl;

		const [p1, p2] = Tester.closest_points_on_segments(segA, segB, segC, segD);

		const r = ar + br;
		const diff = VecPool.alloc().copy(p1).sub(p2);

		if (diff.lengthSquared() > r*r) return null;

		const depth = r - diff.length();
		diff.normalize();

		return {
			normal: diff,
			depth: depth
		}
	}

	static static_capsule_triangle (a: ShapeWrapper, b: ShapeWrapper): Intersection | null {
		const center = VecPool.alloc().copy(a.parentOffset).add(a.shape.offset);
		const radius = (a.shape as Capsule).radius;
		const halfSegmentLength = (a.shape as Capsule).halfSegmentLength;

		const segA = VecPool.alloc().copy(center);
		segA.y -= halfSegmentLength;
		const segB = VecPool.alloc().copy(center);
		segB.y += halfSegmentLength;

		const triangle = b.shape as Triangle;
		const e0 = VecPool.alloc().copy(triangle.b).sub(triangle.a);
		const e1 = VecPool.alloc().copy(triangle.c).sub(triangle.b);
		const e2 = VecPool.alloc().copy(triangle.a).sub(triangle.c);

		const tn = VecPool.alloc().copy(e0).cross(e1).normalize();

		// fast check
		let aa = VecPool.alloc().copy(segA).sub(triangle.a);
		let ba = VecPool.alloc().copy(segB).sub(triangle.a);

		let dotA = aa.dot(tn);
		let dotB = ba.dot(tn);

		if (Math.min(dotA, dotB) > radius || Math.max(dotA, dotB) < -radius) return null;

		let d: number;
		let p: Vector3;
		let pproj: Vector3;

		if (dotA * dotB < 0) {
			const t = dotA/(dotA - dotB);
			p = VecPool.alloc().set(
				segA.x + t * (segB.x - segA.x),
				segA.y + t * (segB.y - segA.y),
				segA.z + t * (segB.z - segA.z)
			);
			pproj = p;
			d = 0;
		} else {
			if (Math.abs(dotA) < Math.abs(dotB)) {
				p = VecPool.alloc().copy(segA);
			} else {
				p = VecPool.alloc().copy(segB);
			}

			const pvec = VecPool.alloc().copy(p).sub(triangle.a);
			d = pvec.dot(tn);

			pproj = VecPool.alloc().set(
				p.x - d * tn.x,
				p.y - d * tn.y,
				p.z - d * tn.z
			);
		}

		if (Tester.is_point_in_triangle(pproj, triangle.a, triangle.b, triangle.c)) {
			if (Math.abs(d) > radius) return null;

			tn.set(
				tn.x * Math.sign(d),
				tn.y * Math.sign(d),
				tn.z * Math.sign(d)
			);
			const depth = radius - Math.abs(d);

			return {
				normal: tn,
				depth: depth
			}
		} else {
			// test edges
			const [e0p1, e0p2] = Tester.closest_points_on_segments(segA, segB, triangle.a, triangle.b);
			let dist = VecPool.alloc().copy(e0p1).sub(e0p2);

			if (dist.lengthSquared() <= radius*radius) {
				const depth = radius - dist.length();
				dist.normalize();

				return {
					normal: dist,
					depth: depth
				}
			}

			const [e1p1, e1p2] = Tester.closest_points_on_segments(segA, segB, triangle.c, triangle.b);
			dist.copy(e1p1).sub(e1p2);

			if (dist.lengthSquared() <= radius*radius) {
				const depth = radius - dist.length();
				dist.normalize();

				return {
					normal: dist,
					depth: depth
				}
			}

			const [e2p1, e2p2] = Tester.closest_points_on_segments(segA, segB, triangle.a, triangle.c);
			dist.copy(e2p1).sub(e2p2);

			if (dist.lengthSquared() <= radius*radius) {
				const depth = radius - dist.length();
				dist.normalize();

				return {
					normal: dist,
					depth: depth
				}
			}

			return null;
		}
	}

	static test (a: ShapeWrapper, b: ShapeWrapper): Intersection | null {
		let result: Intersection | null;

		switch (a.shape.type) {
			case "box":
				switch (b.shape.type) {
					case "box":
						return Tester.static_box_box(a, b);
					case "sphere":
						return Tester.static_box_sphere(a, b);
					case "capsule":
						return Tester.static_box_capsule(a, b);
					case "triangle":
						return Tester.static_box_triangle(a, b);
					default:
						throw new Error(`Unknown shape kind: ${b.shape.type}`)
				}
			case "sphere":
				switch (b.shape.type) {
					case "box":
						result = Tester.static_box_sphere(b, a);
						if (result !== null) result.normal.neg();
						return result;
					case "sphere":
						return Tester.static_box_sphere(a, b);
					case "capsule":
						return Tester.static_box_capsule(a, b);
					case "triangle":
						return Tester.static_box_triangle(a, b);
					default:
						throw new Error(`Unknown shape kind: ${b.shape.type}`)
				}
			case "capsule":
				switch (b.shape.type) {
					case "box":
						result = Tester.static_box_capsule(b, a);
						if (result !== null) result.normal.neg();
						return result;
					case "sphere":
						result = Tester.static_sphere_capsule(b, a);
						if (result !== null) result.normal.neg();
						return result;
					case "capsule":
						return Tester.static_box_capsule(a, b);
					case "triangle":
						return Tester.static_box_triangle(a, b);
					default:
						throw new Error(`Unknown shape kind: ${b.shape.type}`)
				}
			case "default":
				throw new Error(`Unknown shape kind: ${a.shape.type}`)
		}

		return null;
	}

	// for raycast
	// all methods return surface normal or null

	static ray_box_math (shape: AABB, from: Vector3, to: Vector3, extension: number = 0): RayTestResult | null {
		const dir = VecPool.alloc().copy(to).sub(from);

		let tEnter: number = -Infinity;
		let tExit: number = Infinity;
		let enterNormal = VecPool.alloc().set(0,0,0);

		for (let i=0; i<3; i++) {
			const axis = i === 0 ? "x" : i === 1 ? "y" : "z";
			const origin = from[axis];
			const direction = dir[axis];
			const min = shape.min[axis] - extension;
			const max = shape.max[axis] + extension;

			if (direction === 0) {
				if (origin < min || origin > max) {
	                return null;
	            }
	            continue;
			}

			const t1 = (min - origin) / direction;
	        const t2 = (max - origin) / direction;

	        const tMin = Math.min(t1, t2);
	        const tMax = Math.max(t1, t2);

	        if (tMin > tEnter) {
	            tEnter = tMin;

	            enterNormal.set(0, 0, 0);
	            switch (axis) {
		            case "x":
		            	enterNormal.x = t1 > t2 ? 1 : -1;
	            		break;
	            	case "y":
	            		enterNormal.y = t1 > t2 ? 1 : -1;
	            		break;
	            	case "z":
	            		enterNormal.z = t1 > t2 ? 1 : -1;
	            		break;
	            }
	        }

	        if (tMax < tExit) {
	            tExit = tMax;
	        }

	        if (tEnter > tExit) return null;
		}

		if (tEnter < 0 || tEnter > 1) return null;

		const hitPoint = VecPool.alloc().copy(dir).scale(tEnter).add(from);
		const distance = VecPool.alloc().copy(hitPoint).sub(from).length() | 0;

		return {
			t: tEnter,
			normal: enterNormal,
			hitPoint: hitPoint,
			distance: distance
		}
	}

	static ray_box (shape: ShapeWrapper, from: Vector3, to: Vector3, extension: number = 0): RayTestResult | null {
		const aabb = AABBPool.alloc().copy((shape.shape as Box).aabb).translate(shape.parentOffset);

		return Tester.ray_box_math(aabb, from, to, extension);
	}

	static ray_sphere_math (center: Vector3, from: Vector3, to: Vector3, radius: number): RayTestResult | null {
		const dir = VecPool.alloc().copy(to).sub(from);
		const oc = VecPool.alloc().copy(from).sub(center);

		const a = dir.dot(dir);
		const b = 2 * dir.dot(oc);
		const c = oc.dot(oc) - radius;

		const D = b*b - 4*a*c;

		if (D < 0) return null;

		const t1 = (-b - Math.sqrt(D))/(2*a);
		const t2 = (-b + Math.sqrt(D))/(2*a);

		let t = Infinity;

		if (t1 >= 0 && t1 <= 1) t = t1;
		else if (t2 >= 0 && t2 <= 1) t = t2;

		if (t === Infinity) return null;

		const hitPoint = VecPool.alloc().copy(dir).scale(t).add(from);
		const normal = VecPool.alloc().copy(hitPoint).sub(center).normalize();
		const distance = VecPool.alloc().copy(hitPoint).sub(from).length() | 0;

		return { t, normal, hitPoint, distance };
	}

	static ray_sphere (shape: ShapeWrapper, from: Vector3, to: Vector3, extension: number = 0): RayTestResult | null {
		const center = VecPool.alloc().copy(shape.shape.offset).add(shape.parentOffset);
		const radius = ((shape.shape as Sphere).radius + extension);

		return Tester.ray_sphere_math(center, from, to, radius);
	}

	static ray_capsule_math (segA: Vector3, segB: Vector3, radius: number, from: Vector3, to: Vector3): RayTestResult | null {
		const [p1, p2] = Tester.closest_points_on_segments(from, to, segA, segB);

		const diff = VecPool.alloc().copy(p1).sub(p2);

		if (diff.lengthSquared() > radius*radius) return null;

		const hitPoint = VecPool.alloc().copy(p1).addScaled(diff, radius);
		const rayDiff = VecPool.alloc().copy(hitPoint).sub(from);
		const direction = VecPool.alloc().copy(to).sub(from);
		const tHit = rayDiff.dot(direction)/direction.dot(direction);
		diff.normalize();

		return {
			t: tHit,
			hitPoint: hitPoint,
			normal: diff,
			distance: rayDiff.length()
		}
	}

	static ray_capsule (shape: ShapeWrapper, from: Vector3, to: Vector3, extension: number = 0): RayTestResult | null {
		const capsule = (shape.shape as Capsule);
		const radius = capsule.radius + extension;
		const sc = VecPool.alloc().copy(shape.parentOffset).add(capsule.offset);
		const segA = VecPool.alloc().copy(sc);
		segA.y -= capsule.halfSegmentLength;
		const segB = VecPool.alloc().copy(sc);
		segB.y += capsule.halfSegmentLength;

		return Tester.ray_capsule_math(segA, segB, radius, from, to);
	}

	static ray_triangle_math (a: Vector3, b: Vector3, c: Vector3, from: Vector3, to: Vector3): RayTestResult | null {
		const dir = VecPool.alloc().copy(to).sub(from);
		const maxT = dir.length();
		dir.x /= maxT;
		dir.y /= maxT;
		dir.z /= maxT;

		const e0 = VecPool.alloc().copy(b).sub(a);
		const e1 = VecPool.alloc().copy(c).sub(b);
		const e2 = VecPool.alloc().copy(a).sub(c);

		const n = VecPool.alloc().copy(e0).cross(e1).normalize();
		
		const det = dir.dot(n);

		if (Math.abs(det) < 1e-8) return null;

		if (det > 0) n.neg();

		const H = VecPool.alloc().copy(a).sub(from);
		const t = (n.dot(H)/det) / maxT;

		if (t <= 0 || t > 1) return null;

		const P = VecPool.alloc().set(
			from.x + dir.x*t,
			from.y + dir.y*t,
			from.z + dir.z*t
		);

		// first edge
		let toP = VecPool.alloc().copy(P).sub(a);
		let edge = VecPool.alloc().copy(e0);
		edge.cross(toP);
		let side = n.dot(edge);

		if (side < 0) return null;

		// second edge
		toP.copy(P).sub(b);
		edge.copy(e1);
		edge.cross(toP);
		side = n.dot(edge);

		if (side < 0) return null;

		// third edge
		toP.copy(P).sub(c);
		edge.copy(e2);
		edge.cross(toP);
		side = n.dot(edge);

		if (side < 0) return null;

		const hitPoint = P;
	    const normal = n;
	    const distance = VecPool.alloc().copy(hitPoint).sub(from).length();

	    return { t, hitPoint, normal, distance };
	}

	static ray_triangle (shape: ShapeWrapper, from: Vector3, to: Vector3): RayTestResult | null {
		const triangle = shape.shape as Triangle;
		
		return Tester.ray_triangle_math(triangle.a, triangle.b, triangle.c, from, to);
	}

	static swept_sphere_triangle (triangleWrapper: ShapeWrapper, center: Vector3, movedCenter: Vector3, radius: number): RayTestResult | null {
		const triangle = triangleWrapper.shape as Triangle;

		let bestResult: RayTestResult | null = null;

		// test against moved faces
		const a = VecPool.alloc().copy(triangle.a);
		const b = VecPool.alloc().copy(triangle.b);
		const c = VecPool.alloc().copy(triangle.c);

		const n = VecPool.alloc().copy(a).cross(b);

		a.x += n.x * radius;
		a.y += n.y * radius;
		a.z += n.z * radius;
		b.x += n.x * radius;
		b.y += n.y * radius;
		b.z += n.z * radius;
		c.x += n.x * radius;
		c.y += n.y * radius;
		c.z += n.z * radius;

		let result: RayTestResult | null = Tester.ray_triangle_math(a, b, c, center, movedCenter);

		if (result !== null) {
			bestResult = result;
		}

		a.x -= 2 * n.x * radius;
		a.y -= 2 * n.y * radius;
		a.z -= 2 * n.z * radius;
		b.x -= 2 * n.x * radius;
		b.y -= 2 * n.y * radius;
		b.z -= 2 * n.z * radius;
		c.x -= 2 * n.x * radius;
		c.y -= 2 * n.y * radius;
		c.z -= 2 * n.z * radius;

		result = Tester.ray_triangle_math(a, b, c, center, movedCenter);

		if (result !== null) {
			if (bestResult === null || result.t < bestResult.t) bestResult = result;
		}

		// restore points

		a.x += n.x * radius;
		a.y += n.y * radius;
		a.z += n.z * radius;
		b.x += n.x * radius;
		b.y += n.y * radius;
		b.z += n.z * radius;
		c.x += n.x * radius;
		c.y += n.y * radius;
		c.z += n.z * radius;

		// test against edges

		result = Tester.ray_capsule_math(a, b, radius, center, movedCenter);

		if (result !== null) {
			if (bestResult === null || result.t < bestResult.t) bestResult = result;
		}

		result = Tester.ray_capsule_math(b, c, radius, center, movedCenter);

		if (result !== null) {
			if (bestResult === null || result.t < bestResult.t) bestResult = result;
		}

		result = Tester.ray_capsule_math(c, a, radius, center, movedCenter);

		if (result !== null) {
			if (bestResult === null || result.t < bestResult.t) bestResult = result;
		}

		// test against vertices

		result = Tester.ray_sphere_math(a, center, movedCenter, radius);

		if (result !== null) {
			if (bestResult === null || result.t < bestResult.t) bestResult = result;
		}

		result = Tester.ray_sphere_math(b, center, movedCenter, radius);

		if (result !== null) {
			if (bestResult === null || result.t < bestResult.t) bestResult = result;
		}

		result = Tester.ray_sphere_math(c, center, movedCenter, radius);

		if (result !== null) {
			if (bestResult === null || result.t < bestResult.t) bestResult = result;
		}

		return result;
	}
}