import Vector3 from "../math/vector3.js"
import AABB from "../math/aabb.js"
import type Shape from "./shape.js"
import { VecPool } from "../utils/pool.js"

import Box from "./shapes/box.js"
import Sphere from "./shapes/sphere.js"
import Capsule from "./shapes/capsule.js"
import Trimesh from "./shapes/trimesh.js"
import Triangle from "./shapes/triangle.js"

import { Octree } from "../math/octree.js"
import type { OctItem } from "../math/octree.js"
import StaticBody from "./staticBody.js"
import KinematicBody from "./kinematicBody.js"
import DynamicBody from "./dynamicBody.js"

import { SAT } from "./sat.js"
import type { RayTestResult } from "./sat.js"

type Body = StaticBody | KinematicBody | DynamicBody;

export interface RaycastResult {
	body: Body;
	distance: number;
	normal: Vector3;
	hitPoint: Vector3;
}

interface RaycastCandidate {
	body: Body;
	shapeIndex?: number;
	triangleIndex?: number;
}

export class Raycaster {
	private static test_static (from: Vector3, to: Vector3, candidate: RaycastCandidate): RaycastResult | null {
		const baseShape = (candidate.body as StaticBody).shapes[candidate.shapeIndex!];

		let rayTest: RayTestResult | null = null;

		switch (baseShape.type) {
			case "box":
				rayTest = SAT.ray_box({ parentOffset: VecPool.alloc(), shape: baseShape }, from, to);
				break;
			case "sphere":
				rayTest = SAT.ray_sphere({ parentOffset: VecPool.alloc(), shape: baseShape }, from, to);
				break;
			case "capsule":
				rayTest = SAT.ray_capsule({ parentOffset: VecPool.alloc(), shape: baseShape }, from, to);
				break;
			case "trimesh":
				rayTest = SAT.ray_triangle({ parentOffset: VecPool.alloc(), shape: (baseShape as Trimesh).triangles[candidate.triangleIndex!]! }, from, to);
				break;
		}

		if (rayTest === null) {
			return null;
		} else {
			return {
				body: candidate.body,
				distance: rayTest.distance,
				normal: rayTest.normal,
				hitPoint: rayTest.hitPoint
			}
		}
	}

	private static test_non_static (from: Vector3, to: Vector3, candidate: RaycastCandidate): RaycastResult | null {
		const body = candidate.body;

		let bestRayTest: RayTestResult | null = null;

		for (const shape of body.shapes) {
			let rayTest: RayTestResult | null = null;
			switch (shape.type) {
				case "box":
					rayTest = SAT.ray_box({ parentOffset: body.position, shape: shape }, from, to);
					break;
				case "sphere":
					rayTest = SAT.ray_sphere({ parentOffset: body.position, shape: shape }, from, to);
					break;
				case "capsule":
					rayTest = SAT.ray_capsule({ parentOffset: body.position, shape: shape }, from, to);
					break;
			}

			if (rayTest !== null) {
				if (bestRayTest === null || bestRayTest.t > rayTest.t) {
					bestRayTest = rayTest;
				}
			}
		}

		if (bestRayTest === null) {
			return null;
		} else {
			return {
				body: candidate.body,
				distance: bestRayTest.distance,
				normal: bestRayTest.normal,
				hitPoint: bestRayTest.hitPoint
			}
		}
	}

	static test (from: Vector3, to: Vector3, mask: number, statics: Map<number, StaticBody>, octree: Octree, kinematics: Map<number, KinematicBody>, dynamics: Map<number, DynamicBody>): RaycastResult[] {
		// broadphase
		const candidates: RaycastCandidate[] = [];

		const octreeCollection: OctItem[] = [];
		octree.queryRay(from, to, octreeCollection, mask);

		for (const c of octreeCollection) {
			candidates.push({
				body: statics.get(c.id) as Body,
				shapeIndex: c.shapeIndex,
				triangleIndex: c.triangleIndex
			});
		}

		for (const [id, kBody] of kinematics) {
			if (mask !== 0 && kBody.layer !== 0 && ((mask & kBody.layer) === 0)) continue;

			if (SAT.ray_aabb(kBody.aabb, from, to)) {
				candidates.push({ body: kBody });
			}
		}

		for (const [id, dBody] of dynamics) {
			if (mask !== 0 && dBody.layer !== 0 && ((mask & dBody.layer) === 0)) continue;

			if (SAT.ray_aabb(dBody.aabb, from, to)) {
				candidates.push({ body: dBody });
			}
		}

		// narrowphase
		let intersections: RaycastResult[] = [];

		for (const candidate of candidates) {
			const body = candidate.body;
			const result = body.kind === "static" ? Raycaster.test_static(from, to, candidate) : Raycaster.test_non_static(from, to, candidate);

			if (result !== null) {
				intersections.push(result);
			}
		}

		// sort intersections
		intersections.sort((a, b) => a.distance - b.distance);

		return intersections;
	}
}