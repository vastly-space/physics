import Vector3 from "../math/vector3.js"
import AABB from "../math/aabb.js"
import type Shape from "./shape.js"
import { VecPool } from "../utils/pool.js"

import Box from "./shapes/box.js"
import Sphere from "./shapes/sphere.js"
import Cylinder from "./shapes/cylinder.js"
import Triangle from "./shapes/triangle.js"

export interface Collision {
	normal: Vector3;
	tEnter: number;
	tExit: number;
}

export interface ShapeWrapper {
	parentOffset: Vector3;
	shape: Shape;
}

export class SAT {
	private static swept_interval_test (aMin: number, aMax: number, bMin: number, bMax: number, vel: number): [number, number] | null {
		if (vel === 0) {
			if (aMin > bMax || aMax < bMin) {
				return null;
			}

			return [0, 1];
		} else {
			const t1 = (bMin - aMax) / vel;
			const t2 = (bMax - aMin) / vel;

			const enter = Math.min(t1, t2);
			const exit = Math.max(t1, t2);

			return [enter, exit];
		}
	}

	private static box_box_axes (a: ShapeWrapper, b: ShapeWrapper): Vector3[] {
		return [
			VecPool.alloc().copy(Vector3.XAxis),
			VecPool.alloc().copy(Vector3.YAxis),
			VecPool.alloc().copy(Vector3.ZAxis),
		]
	}

	private static box_sphere_axes (a: ShapeWrapper, b: ShapeWrapper): Vector3[] {
		return [
			VecPool.alloc().copy(Vector3.XAxis),
			VecPool.alloc().copy(Vector3.YAxis),
			VecPool.alloc().copy(Vector3.ZAxis),
		]
	}

	private static box_cylinder_axes (a: ShapeWrapper, b: ShapeWrapper): Vector3[] {
		return [
			VecPool.alloc().copy(Vector3.XAxis),
			VecPool.alloc().copy(Vector3.YAxis),
			VecPool.alloc().copy(Vector3.ZAxis),
		]
	}

	private static box_triangle_axes (a: ShapeWrapper, b: ShapeWrapper): Vector3[] {
		const result = [
			VecPool.alloc().copy(Vector3.XAxis),
			VecPool.alloc().copy(Vector3.YAxis),
			VecPool.alloc().copy(Vector3.ZAxis),
		]

		const box = a.shape as Box;
		const triangle = b.shape as Triangle;

		const e0 = VecPool.alloc().copy(triangle.b).sub(triangle.a);
		const e1 = VecPool.alloc().copy(triangle.c).sub(triangle.b);
		const e2 = VecPool.alloc().copy(triangle.a).sub(triangle.c);

		result.push(VecPool.alloc().copy(Vector3.XAxis).cross(e0));
		result.push(VecPool.alloc().copy(Vector3.XAxis).cross(e1));
		result.push(VecPool.alloc().copy(Vector3.XAxis).cross(e2));
		result.push(VecPool.alloc().copy(Vector3.YAxis).cross(e0));
		result.push(VecPool.alloc().copy(Vector3.YAxis).cross(e1));
		result.push(VecPool.alloc().copy(Vector3.YAxis).cross(e2));
		result.push(VecPool.alloc().copy(Vector3.ZAxis).cross(e0));
		result.push(VecPool.alloc().copy(Vector3.ZAxis).cross(e1));
		result.push(VecPool.alloc().copy(Vector3.ZAxis).cross(e2));
		result.push(VecPool.alloc().copy(e0).cross(e1));

		return result;
	}

	private static sphere_sphere_axes (a: ShapeWrapper, b: ShapeWrapper): Vector3[] {
		const s1 = a.shape as Sphere;
		const s2 = b.shape as Sphere;

		const c1 = VecPool.alloc().copy(s1.offset).add(a.parentOffset);
		const c2 = VecPool.alloc().copy(s2.offset).add(b.parentOffset);

		return [
			c2.sub(c1)
		]
	}

	private static sphere_cylinder_axes (a: ShapeWrapper, b: ShapeWrapper): Vector3[] {
		const result = [
			VecPool.alloc().copy(Vector3.YAxis)
		];

		const s = a.shape as Sphere;
		const c = b.shape as Cylinder;

		const sc = VecPool.alloc().copy(s.offset).add(a.parentOffset);
		const dist = sc.dot(Vector3.YAxis);
		const closestOnY = VecPool.alloc().copy(Vector3.YAxis);
		closestOnY.x *= dist;
		closestOnY.y *= dist;
		closestOnY.z *= dist;
		const secondAxis = sc.sub(closestOnY);

		result.push(secondAxis);
		result.push(VecPool.alloc().copy(Vector3.YAxis).cross(secondAxis));

		return result;
	}

	private static sphere_triangle_axes (a: ShapeWrapper, b: ShapeWrapper): Vector3[] {
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

	private static cylinder_cylinder_axes (a: ShapeWrapper, b: ShapeWrapper): Vector3[] {
		const result: Vector3[] = [
			VecPool.alloc().copy(Vector3.YAxis)
		];

		const ca = VecPool.alloc().copy((a.shape as Cylinder).offset).add(a.parentOffset);
		const cb = VecPool.alloc().copy((b.shape as Cylinder).offset).add(b.parentOffset);
		ca.y = 0;
		cb.y = 0;
		result.push(cb.sub(ca));

		return result;
	}

	private static cylinder_triangle_axes (a: ShapeWrapper, b: ShapeWrapper): Vector3[] {
		const result: Vector3[] = [
			VecPool.alloc().copy(Vector3.YAxis)
		];

		const triangle = b.shape as Triangle;

		const e0 = VecPool.alloc().copy(triangle.b).sub(triangle.a);
		const e1 = VecPool.alloc().copy(triangle.c).sub(triangle.b);
		const e2 = VecPool.alloc().copy(triangle.a).sub(triangle.c);

		result.push(e0);
		result.push(e1);
		result.push(e2);
		result.push(VecPool.alloc().copy(e0).cross(e1));
		result.push(VecPool.alloc().copy(Vector3.YAxis).cross(e0));
		result.push(VecPool.alloc().copy(Vector3.YAxis).cross(e1));
		result.push(VecPool.alloc().copy(Vector3.YAxis).cross(e2));

		return result;
	}

	private static collect_axes (a: ShapeWrapper, b: ShapeWrapper): Vector3[] {
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
						break;
					case "sphere":
						result = SAT.sphere_cylinder_axes(b, a);
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
		const vel = VecPool.alloc().copy(bvel).sub(avel);

		const testAxes = SAT.collect_axes(a, b);

		let tEnter: number = -Infinity;
		let tExit: number = Infinity;
		let bestAxisIndex: number = -1;

		for (let i=0; i<testAxes.length; i++) {
			const axis = testAxes[i];
			const aInterval = a.shape.projectOnAxis(a.parentOffset, axis);
			const bInterval = b.shape.projectOnAxis(b.parentOffset, axis);
			const vproj = vel.dot(axis);

			const intersection = SAT.swept_interval_test(aInterval[0], aInterval[1], bInterval[0], bInterval[1], vproj);

			if (intersection === null) return null;

			if (intersection[0] > tEnter) {
				tEnter = intersection[0];
				bestAxisIndex = i;
			}

			if (intersection[1] < tExit) {
				tExit = intersection[1];
			}

			if (tEnter > tExit || tExit < 0) return null;
		}

		if (tEnter < 0 || tEnter > 1) return null;
		if (bestAxisIndex === -1) return null;

		return {
			normal: testAxes[bestAxisIndex],
			tEnter: tEnter,
			tExit: tExit
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
}