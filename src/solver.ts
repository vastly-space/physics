import Vector3 from "./math/vector3.js"
import AABB from "./math/aabb.js"
import { Octree } from "./math/octree.js"
import StaticBody from "./physics/staticBody.js"
import KinematicBody from "./physics/kinematicBody.js"
import DynamicBody from "./physics/dynamicBody.js"
import type Shape from "./physics/shape.js"
import Intersections from "./physics/shapes/intersections.js"
import { divTrunc } from "./math/utils.js"

interface StaticsCollision {
	body: StaticBody;
	shape: Shape;
	triangleIndex?: number;
	aabb: AABB;
}

interface DynamicsCollision {
	body: KinematicBody | DynamicBody;
	aabb: AABB;
}

type Collision = StaticsCollision | DynamicsCollision;

export interface CollisionEvent {
	body1: StaticBody;
	body2: StaticBody;
	collisionVolume: AABB;
}

function broadphase (dynamicId: number, staticOctree: Octree, statics: Map<number, StaticBody>, kinematics: Map<number, KinematicBody>, dynamics: Map<number, DynamicBody>) {
	const result: Collision[] = [];

	const body = dynamics.get(dynamicId) as DynamicBody;

	const candidates = staticOctree.queryAABB(body.sweptAABB, body.mask);

	for (let i=0; i<candidates.length; i++) {
		const id = candidates[i].id;
		const sBody = statics.get(id) as StaticBody;
		const shape = sBody.shapes[candidates[i].shapeIndex];

		result.push({
			body: sBody,
			shape: shape,
			triangleIndex: candidates[i].triangleIndex,
			aabb: fuck
		});
	}

	for (const [id, candidate] of kinematics.entries()) {
		if (body.mask !== 0 && candidate.layer !== 0 && ((body.mask & candidate.layer) === 0)) continue;

		const intersectionAABB = Intersections.broad_box_box(body.sweptAABB, candidate.sweptAABB);

		if (intersectionAABB !== null) {
			result.push({
				body: candidate,
				aabb: intersectionAABB
			})
		}
	}

	for (const [id, candidate] of dynamics.entries()) {
		if (id === dynamicId || (body.mask !== 0 && candidate.layer !== 0 && ((body.mask & candidate.layer) === 0))) continue;

		const intersectionAABB = Intersections.broad_box_box(body.sweptAABB, candidate.sweptAABB);

		if (intersectionAABB !== null) {
			result.push({
				body: candidate,
				aabb: intersectionAABB
			})
		}
	}

	return result;
}

function sortByDistance (sourceBody: DynamicBody, candidates: Collision[]): Collision[] {
	const sorted: { dist: number; candidate: Collision }[] = [];
	const sourceBodyPosition = sourceBody.position;

	for (const intersection of candidates) {
		const center = intersection.aabb.min.clone().add(intersection.aabb.max);

		center.x = divTrunc(center.x, 2);
		center.y = divTrunc(center.y, 2);
		center.z = divTrunc(center.z, 2);

		const dist = (center.x - sourceBodyPosition.x) * (center.x - sourceBodyPosition.x) + 
			(center.y - sourceBodyPosition.y) * (center.y - sourceBodyPosition.y) + 
			(center.z - sourceBodyPosition.z) * (center.z - sourceBodyPosition.z);

		const index = 0;

		while (index < sorted.length && sorted[index].dist < dist) index++;

		if (index === sorted.length) {
			sorted.push({ dist: dist, candidate: intersection });
		} else {
			sorted.splice(index + 1, 0, { dist: dist, candidate: intersection });
		}
	}

	return sorted.map(s => s.candidate);
}

function narrowPhase (sourceBody: DynamicBody, candidates: Collision[]): CollisionEvent[] {
	const result: CollisionEvent[] = [];

	for (const candidate of candidates) {
		if (candidate.body.kind === "static") {
			if ((candidate as StaticsCollision).triangleIndex !== undefined) {
				// check triangle collision
			} else {
				// get the biggest penetration along movement
			}
		} else {
			// get the biggest penetration along movement
		}
	}
}

export function solve (staticOctree: Octree, statics: Map<number, StaticBody>, kinematics: Map<number, KinematicBody>, dynamics: Map<number, DynamicBody>): CollisionEvent[] {
	AABBPool.reset();
	VecPool.reset();

	const result: CollisionEvent[] = [];

	for (const [id, body] of dynamics) {
		let candidates = broadphase(staticOctree, statics, kinematics, dynamics);
		candidates = sortByDistance(body, candidates);
		result = result.concat(narrowPhase(body, candidates));
	}

	return result;
}