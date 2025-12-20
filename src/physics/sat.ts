import Vector3 from "../math/vector3.js"
import AABB from "../math/aabb.js"
import type Shape from "./shape.js"
import { VecPool, AABBPool } from "../utils/pool.js"

import Box from "./shapes/box.js"
import Sphere from "./shapes/sphere.js"
import Cylinder from "./shapes/cylinder.js"
import Triangle from "./shapes/triangle.js"

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

export class SAT {
	static swept_interval_test (aMin: number, aMax: number, bMin: number, bMax: number, vel: number): [number, number, number] | null {
		if (vel === 0) {
			if (aMin > bMax || aMax < bMin) {
				return null;
			}

			const p1 = aMax - bMin;
			const p2 = bMax - aMin;

			return [0, Infinity, Math.min(p1, p2)];
		} else {
			const t1 = (bMin - aMax) / vel;
			const t2 = (bMax - aMin) / vel;

			const enter = Math.min(t1, t2);
			const exit = Math.max(t1, t2);

			return [enter, exit, 0];
		}
	}

	static basic_axes (a: ShapeWrapper, b: ShapeWrapper): Vector3[] {
		const ac = VecPool.alloc().copy(a.parentOffset).add(a.shape.offset);
		// triangles workaround
		const bc = VecPool.alloc().copy(b.shape.aabb.min).add(b.shape.aabb.max);
		bc.x /= 2;
		bc.y /= 2;
		bc.z /= 2;
		bc.add(b.parentOffset);

		return [
			VecPool.alloc().set(
				ac.x <= bc.x ? -1 : 1,
				0,
				0
			),
			VecPool.alloc().set(
				0,
				ac.y <= bc.y ? -1 : 1,
				0
			),
			VecPool.alloc().set(
				0,
				0,
				ac.z <= bc.z ? -1 : 1
			),
		]
	}

	static box_box_axes (a: ShapeWrapper, b: ShapeWrapper): Vector3[] {
		return SAT.basic_axes(a, b);
	}

	static box_sphere_axes (a: ShapeWrapper, b: ShapeWrapper): Vector3[] {
		return SAT.basic_axes(a, b);
	}

	static box_cylinder_axes (a: ShapeWrapper, b: ShapeWrapper): Vector3[] {
		return SAT.basic_axes(a, b);
	}

	static box_triangle_axes (a: ShapeWrapper, b: ShapeWrapper): Vector3[] {
		const result = SAT.basic_axes(a, b);

		const box = a.shape as Box;
		const triangle = b.shape as Triangle;

		const e0 = VecPool.alloc().copy(triangle.b).sub(triangle.a);
		const e1 = VecPool.alloc().copy(triangle.c).sub(triangle.b);
		const e2 = VecPool.alloc().copy(triangle.a).sub(triangle.c);

		result.push(VecPool.alloc().copy(result[0]).cross(e0));
		result.push(VecPool.alloc().copy(result[0]).cross(e1));
		result.push(VecPool.alloc().copy(result[0]).cross(e2));
		result.push(VecPool.alloc().copy(result[1]).cross(e0));
		result.push(VecPool.alloc().copy(result[1]).cross(e1));
		result.push(VecPool.alloc().copy(result[1]).cross(e2));
		result.push(VecPool.alloc().copy(result[2]).cross(e0));
		result.push(VecPool.alloc().copy(result[2]).cross(e1));
		result.push(VecPool.alloc().copy(result[2]).cross(e2));
		result.push(VecPool.alloc().copy(e0).cross(e1));

		return result;
	}

	static sphere_sphere_axes (a: ShapeWrapper, b: ShapeWrapper): Vector3[] {
		const s1 = a.shape as Sphere;
		const s2 = b.shape as Sphere;

		const c1 = VecPool.alloc().copy(s1.offset).add(a.parentOffset);
		const c2 = VecPool.alloc().copy(s2.offset).add(b.parentOffset);

		return [
			c1.sub(c2)
		]
	}

	static sphere_cylinder_axes (a: ShapeWrapper, b: ShapeWrapper): Vector3[] {
		const sc = VecPool.alloc().copy(a.shape.offset).add(a.parentOffset);
		const cc = VecPool.alloc().copy(b.parentOffset).add(b.shape.offset);

		const result: Vector3[] = [
			VecPool.alloc().set(
				0,
				sc.y <= cc.y ? -1 : 1,
				0
			)	
		];

		const s = a.shape as Sphere;
		const c = b.shape as Cylinder;

		const dist = sc.dot(result[0]);
		const closestOnY = VecPool.alloc().copy(result[0]);
		closestOnY.x *= dist;
		closestOnY.y *= dist;
		closestOnY.z *= dist;
		const secondAxis = sc.sub(closestOnY);

		result.push(secondAxis);
		result.push(VecPool.alloc().copy(result[0]).cross(secondAxis));

		return result;
	}

	static sphere_triangle_axes (a: ShapeWrapper, b: ShapeWrapper): Vector3[] {
		const result: Vector3[] = [];

		const sphere = a.shape as Sphere;
		const triangle = b.shape as Triangle;

		const e0 = VecPool.alloc().copy(triangle.b).sub(triangle.a);
		const e1 = VecPool.alloc().copy(triangle.c).sub(triangle.b);
		const e2 = VecPool.alloc().copy(triangle.a).sub(triangle.c);

		const dA = VecPool.alloc().copy(sphere.offset).add(a.parentOffset).sub(triangle.a);
		const dB = VecPool.alloc().copy(sphere.offset).add(a.parentOffset).sub(triangle.b);
		const dC = VecPool.alloc().copy(sphere.offset).add(a.parentOffset).sub(triangle.c);

		result.push(VecPool.alloc().copy(e0).cross(dA));
		result.push(VecPool.alloc().copy(e1).cross(dB));
		result.push(VecPool.alloc().copy(e2).cross(dC));
		result.push(dA);
		result.push(dB);
		result.push(dC);
		// normal
		result.push(VecPool.alloc().copy(e0).cross(e1));

		return result;
	}

	static cylinder_cylinder_axes (a: ShapeWrapper, b: ShapeWrapper): Vector3[] {
		const ca = VecPool.alloc().copy((a.shape as Cylinder).offset).add(a.parentOffset);
		const cb = VecPool.alloc().copy((b.shape as Cylinder).offset).add(b.parentOffset);

		const result: Vector3[] = [
			VecPool.alloc().set(
				0,
				ca.y <= cb.y ? -1 : 1,
				0
			)
		];

		ca.y = 0;
		cb.y = 0;
		result.push(cb.sub(ca));

		return result;
	}

	static cylinder_triangle_axes (a: ShapeWrapper, b: ShapeWrapper): Vector3[] {
		const tc = VecPool.alloc().copy(b.shape.aabb.min).add(b.shape.aabb.max);
		tc.x /= 2;
		tc.y /= 2;
		tc.z /= 2;
		const cc = VecPool.alloc().copy(a.parentOffset).add(a.shape.offset);

		const result: Vector3[] = [
			VecPool.alloc().set(
				0,
				cc.y <= tc.y ? -1 : 1,
				0
			)	
		];

		const triangle = b.shape as Triangle;

		const e0 = VecPool.alloc().copy(triangle.b).sub(triangle.a);
		const e1 = VecPool.alloc().copy(triangle.c).sub(triangle.b);
		const e2 = VecPool.alloc().copy(triangle.a).sub(triangle.c);

		result.push(e0);
		result.push(e1);
		result.push(e2);
		result.push(VecPool.alloc().copy(e0).cross(e1));
		result.push(VecPool.alloc().copy(result[0]).cross(e0));
		result.push(VecPool.alloc().copy(result[0]).cross(e1));
		result.push(VecPool.alloc().copy(result[0]).cross(e2));

		return result;
	}

	static collect_axes (a: ShapeWrapper, b: ShapeWrapper): Vector3[] {
		let result: Vector3[];

		switch (a.shape.type) {
			case "box":
				switch (b.shape.type) {
					case "box":
						result = SAT.box_box_axes(a, b);
						break;
					case "sphere":
						result = SAT.box_sphere_axes(a, b);
						break;
					case "cylinder":
						result = SAT.box_cylinder_axes(a, b);
						break;
					case "triangle":
						result = SAT.box_triangle_axes(a, b);
						break;
					default:
						throw new Error("Unknown shape type: " + b.shape.type);
				}
				break;
			case "sphere":
				switch (b.shape.type) {
					case "box":
						result = SAT.box_sphere_axes(b, a);
						result = result.map(v => v.neg());
						break;
					case "sphere":
						result = SAT.sphere_sphere_axes(a, b);
						break;
					case "cylinder":
						result = SAT.sphere_cylinder_axes(a, b);
						break;
					case "triangle":
						result = SAT.sphere_triangle_axes(a, b);
						break;
					default:
						throw new Error("Unknown shape type: " + b.shape.type);
				}
				break;
			case "cylinder":
				switch (b.shape.type) {
					case "box":
						result = SAT.box_cylinder_axes(b, a);
						result = result.map(v => v.neg());
						break;
					case "sphere":
						result = SAT.sphere_cylinder_axes(b, a);
						result = result.map(v => v.neg());
						break;
					case "cylinder":
						result = SAT.cylinder_cylinder_axes(a, b);
						break;
					case "triangle":
						result = SAT.cylinder_triangle_axes(a, b);
						break;
					default:
						throw new Error("Unknown shape type: " + b.shape.type);
				}
				break;
			default:
				throw new Error("Unknown shape type: " + a.shape.type);
		}

		// remove zero-length axes
		result = result.filter(a => !a.isZero());

		// normalize all axes
		result = result.map(a => a.normalize());

		return result;
	}

	static test (a: ShapeWrapper, b: ShapeWrapper, avel: Vector3, bvel: Vector3): Collision | null {
		const vel = VecPool.alloc().copy(avel).sub(bvel);

		const testAxes = SAT.collect_axes(a, b);

		let tEnter: number = -Infinity;
		let tExit: number = Infinity;
		let bestAxisIndex: number = -1;
		let bestAxisPenetration: number = Infinity;

		for (let i=0; i<testAxes.length; i++) {
			const axis = testAxes[i];
			const aInterval = a.shape.projectOnAxis(a.parentOffset, axis);
			const bInterval = b.shape.projectOnAxis(b.parentOffset, axis);
			const vproj = vel.dot(axis);

			const intersection = SAT.swept_interval_test(aInterval[0], aInterval[1], bInterval[0], bInterval[1], vproj);

			if (intersection === null) return null;

			if (intersection[0] === tEnter) {
				if (bestAxisPenetration > intersection[2]) {
					bestAxisIndex = i;
					bestAxisPenetration = intersection[2];	
				}
			} else if (intersection[0] > tEnter) {
				tEnter = intersection[0];
				bestAxisIndex = i;
				bestAxisPenetration = intersection[2];
			}

			if (intersection[1] < tExit) {
				tExit = intersection[1];
			}

			if (tEnter > tExit || tExit < 0) return null;
		}

		if (tExit <= 0 || tEnter > 1) return null;
		if (bestAxisIndex === -1) return null;

		return {
			normal: testAxes[bestAxisIndex],
			tEnter: tEnter,
			tExit: tExit,
			depth: bestAxisPenetration
		}
	}

	static testAABB (a: AABB, b: AABB): boolean {
		const testAxes = [
			VecPool.alloc().copy(Vector3.XAxis),
			VecPool.alloc().copy(Vector3.YAxis),
			VecPool.alloc().copy(Vector3.ZAxis)
		];

		let tEnter = -Infinity;
		let tExit = Infinity;

		for (let i=0; i<testAxes.length; i++) {
			const axis = testAxes[i];

			const ax = a.max.x - a.min.x;
			const ay = a.max.y - a.min.y;
			const az = a.max.z - a.min.z;
			const ac = VecPool.alloc().copy(a.min).add(a.max);
			ac.x /= 2;
			ac.y /= 2;
			ac.z /= 2;
			const ar = Math.abs(axis.x) * (ax/2) + Math.abs(axis.y) * (ay/2) + Math.abs(axis.z) * (az/2);
			const aCenter = ac.dot(axis);

			const bx = b.max.x - b.min.x;
			const by = b.max.y - b.min.y;
			const bz = b.max.z - b.min.z;
			const bc = VecPool.alloc().copy(b.min).add(b.max);
			bc.x /= 2;
			bc.y /= 2;
			bc.z /= 2;
			const br = Math.abs(axis.x) * (bx/2) + Math.abs(axis.y) * (by/2) + Math.abs(axis.z) * (bz/2);
			const bCenter = bc.dot(axis);

			const intersection = SAT.swept_interval_test(aCenter - ar, aCenter + ar, bCenter - br, bCenter + br, 0);

			if (intersection === null) return false;

			if (intersection[0] > tEnter) {
				tEnter = intersection[0];
			}

			if (intersection[1] < tExit) {
				tExit = intersection[1];
			}

			if (tEnter > tExit || tExit < 0) return false;
		}

		if (tEnter < 0 || tEnter > 1) return false;

		return true;
	}

	// for raycast
	// all methods return surface normal or null

	static ray_aabb (shape: AABB, from: Vector3, to: Vector3): RayTestResult | null {
		const dir = VecPool.alloc().copy(to).sub(from);

		let tEnter: number = -Infinity;
		let tExit: number = Infinity;
		let enterNormal = VecPool.alloc().set(0,0,0);

		for (let i=0; i<3; i++) {
			const axis = i === 0 ? "x" : i === 1 ? "y" : "z";
			const origin = from[axis];
			const direction = dir[axis];
			const min = shape.min[axis];
			const max = shape.max[axis];

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

	static ray_box (shape: ShapeWrapper, from: Vector3, to: Vector3): RayTestResult | null {
		const aabb = AABBPool.alloc().copy((shape.shape as Box).aabb).translate(shape.parentOffset);

		return SAT.ray_aabb(aabb, from, to);
	}

	static ray_sphere (shape: ShapeWrapper, from: Vector3, to: Vector3): RayTestResult | null {
		const dir = VecPool.alloc().copy(to).sub(from);
		const center = VecPool.alloc().copy((shape.shape as Sphere).offset).add(shape.parentOffset);

		const oc = VecPool.alloc().copy(from).sub(center);

		const a = dir.dot(dir);
		const b = 2 * dir.dot(oc);
		const c = oc.dot(oc);

		const D = b*b - 4 * a * c;
		if (D < 0) return null;

		const t1 = (-b - Math.sqrt(D)) / (2 * a);
		const t2 = (-b + Math.sqrt(D)) / (2 * a);

		let t = Infinity;

		if (t1 >= 0 && t1 <= 1) t = t1;
		else if (t2 >= 0 && t2 <= 1) t = t2;

		if (t === Infinity) return null;

		const hitPoint = VecPool.alloc().copy(dir).scale(t).add(from);
		const normal = VecPool.alloc().copy(hitPoint).sub(center).normalize();
		const distance = VecPool.alloc().copy(hitPoint).sub(from).length() | 0;

		return { t, normal, hitPoint, distance };
	}

	static ray_cylinder (shape: ShapeWrapper, from: Vector3, to: Vector3): RayTestResult | null {
		const dir = VecPool.alloc().copy(to).sub(from);
		const center = VecPool.alloc().copy((shape.shape as Cylinder).offset).add(shape.parentOffset);
		const height = (shape.shape as Cylinder).height;
		const r = (shape.shape as Sphere).radius;

		let bestT = Infinity;
		let bestNormal: Vector3 | null = null;

		// side intersections

		const a = dir.x*dir.x + dir.z*dir.z;
		if (a > 0) {
			const b = 2 * (dir.x * (from.x - center.x) + dir.z * (from.z - center.z));
			const c = (from.x - center.x)*(from.x - center.x) + (from.z - center.z)*(from.z - center.z) - r*r;
			const D = b*b - 4*a*c;

			if (D < 0) return null;

			const t1 = (-b - Math.sqrt(D)) / (2 * a);
			const t2 = (-b + Math.sqrt(D)) / (2 * a);

			// check both sides intersections

			if (t1 >= 0 && t1 <= 1) {
				const py = from.y + dir.y * t1;

				if ((py >= center.y - height/2 || py <= center.y + height/2) &&
					(t1 < bestT))
				{
					bestT = t1;
					const hitX = from.x - center.x + dir.x * t1;
                    const hitZ = from.z - center.z + dir.z * t1;
                    bestNormal = VecPool.alloc().set(hitX, 0, hitZ).normalize();
				}
			}

			if (t2 >= 0 && t2 <= 1) {
				const py = from.y + dir.y * t2;

				if ((py >= center.y - height/2 || py <= center.y + height/2) &&
					(t2 < bestT))
				{
					bestT = t2;
					const hitX = from.x - center.x + dir.x * t2;
                    const hitZ = from.z - center.z + dir.z * t2;
                    bestNormal = VecPool.alloc().set(hitX, 0, hitZ).normalize();
				}
			}
		}

		// top cap intersection
		if (dir.y !== 0) {
			const t = (center.y + height/2 - from.y) / dir.y;
	        if (t < 0 || t > 1) return null;

	        const px = from.x + dir.x * t;
	        const pz = from.z + dir.z * t;

	        const dxCap = px - center.x;
	        const dzCap = pz - center.z;

	        if (dxCap*dxCap + dzCap*dzCap <= r*r) {
	            if (t < bestT) {
	                bestT = t;
	                bestNormal = VecPool.alloc().copy(Vector3.YAxis);
	            }
	        }
		}

		// bottom cap intersection
		if (dir.y !== 0) {
			const t = (center.y - height/2 - from.y) / dir.y;
	        if (t < 0 || t > 1) return null;

	        const px = from.x + dir.x * t;
	        const pz = from.z + dir.z * t;

	        const dxCap = px - center.x;
	        const dzCap = pz - center.z;

	        if (dxCap*dxCap + dzCap*dzCap <= r*r) {
	            if (t < bestT) {
	                bestT = t;
	                bestNormal = VecPool.alloc().copy(Vector3.YAxis).neg();
	            }
	        }
		}

		if (bestT === Infinity || bestNormal === null) return null;

		const hitPoint = VecPool.alloc().copy(dir).scale(bestT).add(from);
		const distance = VecPool.alloc().copy(hitPoint).sub(from).length() | 0;

		return {
			t: bestT,
			normal: bestNormal,
			hitPoint: hitPoint,
			distance: distance
		}
	}

	static ray_triangle (shape: ShapeWrapper, from: Vector3, to: Vector3): RayTestResult | null {
		const triangle = shape.shape as Triangle;
		const dir = VecPool.alloc().copy(to).sub(from);
		const maxT = dir.length();
		dir.x /= maxT;
		dir.y /= maxT;
		dir.z /= maxT;

		const e0 = VecPool.alloc().copy(triangle.b).sub(triangle.a);
		const e1 = VecPool.alloc().copy(triangle.c).sub(triangle.b);
		const e2 = VecPool.alloc().copy(triangle.a).sub(triangle.c);

		const n = VecPool.alloc().copy(e0).cross(e1).normalize();
		
		const det = dir.dot(n);

		if (det > -1e-8 && det < 1e-8) return null;

		const H = VecPool.alloc().copy(triangle.a).sub(from);
		const t = n.dot(H)/det;

		if (t <= 0 || t > maxT) return null;

		const P = VecPool.alloc().copy(dir);
		P.x *= t;
		P.y *= t;
		P.z *= t;
		P.add(from);

		// first edge
		let toP = VecPool.alloc().copy(P).sub(triangle.a);
		let edge = VecPool.alloc().copy(e0);
		edge.cross(toP);
		let side = n.dot(edge);

		if (side < 0) return null;

		// second edge
		toP.copy(P).sub(triangle.b);
		edge.copy(e1);
		edge.cross(toP);
		side = n.dot(edge);

		if (side < 0) return null;

		// third edge
		toP.copy(P).sub(triangle.c);
		edge.copy(e2);
		edge.cross(toP);
		side = n.dot(edge);

		if (side < 0) return null;

		const hitPoint = P;
	    const normal = n;
	    const distance = VecPool.alloc().copy(hitPoint).sub(from).length();

	    return { t, hitPoint, normal, distance };
	}
}