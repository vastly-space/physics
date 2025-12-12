import Vector3 from "./math/vector3.js"
import AABB from "./math/aabb.js"
import { Octree } from "./math/octree.js"
import type { OctItem } from "./math/octree.js"
import StaticBody from "./physics/staticBody.js"
import KinematicBody from "./physics/kinematicBody.js"
import DynamicBody from "./physics/dynamicBody.js"
import type Shape from "./physics/shape.js"
import { SAT } from "./physics/sat.js"
import type { Collision } from "./physics/sat.js"
import { divTrunc } from "./math/utils.js"
import { VecPool, AABBPool } from "./utils/pool.js"
import Trimesh from "./physics/shapes/trimesh.js"

interface CollisionCandidate {
	body: StaticBody | KinematicBody | DynamicBody;
	shape?: Shape;
	triangleIndex?: number;
}

type CollisionEventType = 0 | 1 | 2;

const CollisionEventTypeMap = {
	"triggerEnter": 0,
	"triggerExit": 1,
	"collide": 2
}

interface CollisionEvent {
	type: CollisionEventType;
	body1: DynamicBody;
	body2: StaticBody | KinematicBody | DynamicBody;
	normal: Vector3;
}

function broadphase (dynamicId: number, staticOctree: Octree, statics: Map<number, StaticBody>, kinematics: Map<number, KinematicBody>, dynamics: Map<number, DynamicBody>): CollisionCandidate[] {
	const result: CollisionCandidate[] = [];

	const body = dynamics.get(dynamicId) as DynamicBody;

	const candidates: OctItem[] = [];
	staticOctree.queryAABB(body.sweptAABB, candidates, body.mask);

	for (let i=0; i<candidates.length; i++) {
		const id = candidates[i].id;
		const sBody = statics.get(id) as StaticBody;
		const shape = sBody.shapes[candidates[i].shapeIndex];

		result.push({
			body: sBody,
			shape: shape,
			triangleIndex: candidates[i].triangleIndex
		});
	}

	for (const [id, candidate] of kinematics.entries()) {
		if (body.mask !== 0 && candidate.layer !== 0 && ((body.mask & candidate.layer) === 0)) continue;

		const intersects = SAT.testAABB(body.sweptAABB, candidate.sweptAABB);

		if (intersects) {
			result.push({
				body: candidate
			})
		}
	}

	for (const [id, candidate] of dynamics.entries()) {
		if (id === dynamicId || (body.mask !== 0 && candidate.layer !== 0 && ((body.mask & candidate.layer) === 0))) continue;

		const intersects = SAT.testAABB(body.sweptAABB, candidate.sweptAABB);

		if (intersects) {
			result.push({
				body: candidate
			})
		}
	}

	return result;
}

function narrowPhase (sourceBody: DynamicBody, candidates: CollisionCandidate[]): { desiredPosition: Vector3; events: CollisionEvent[] } {
	const result: CollisionEvent[] = [];
	const sourcePosition = VecPool.alloc().copy(sourceBody.position);
	const sourceVelocity = VecPool.alloc().copy(sourceBody.velocity);
	let realCollisions: { candidate: CollisionCandidate, collision: Collision }[] = [];

	while (sourceVelocity.lengthSquared() >= 1) {
		for (const candidate of candidates) {
			for (const shape of sourceBody.shapes) {
				if (candidate.triangleIndex) {
					// test agains triangle
					const collision = SAT.test(
						{ parentOffset: sourcePosition, shape: shape },
						{ parentOffset: candidate.body.position, shape: (candidate.shape as Trimesh).triangles[candidate.triangleIndex] },
						sourceVelocity,
						Vector3.Zero
					);

					if (collision !== null) realCollisions.push({
						candidate,
						collision
					});
				} else {
					for (const cShape of candidate.body.shapes) {
						const collision = SAT.test(
							{ parentOffset: sourcePosition, shape: shape },
							{ parentOffset: candidate.body.position, shape: cShape },
							sourceVelocity,
							candidate.body.kind === "kinematic" ? (candidate.body as KinematicBody).motionDelta : (candidate.body as DynamicBody).velocity
						);

						if (collision !== null) realCollisions.push({
							candidate,
							collision
						});
					}
				}
			}
		}

		if (realCollisions.length === 0) {
			sourcePosition.add(sourceVelocity);
			break;
		} else {
			let toRemove: CollisionCandidate[] = [];
			// sort out by time
			realCollisions.sort((a, b) => a.collision.tEnter - b.collision.tEnter);
			// skip all trigger bodies events
			while (realCollisions[0] !== undefined && realCollisions[0].candidate.body.isTrigger) {
				const c = realCollisions.shift() as { candidate: CollisionCandidate, collision: Collision };

				if (c.collision.tEnter >= 0) {
					result.push({
						type: 0,
						body1: sourceBody,
						body2: c.candidate.body,
						normal: c.collision.normal
					});
				}

				if (c.collision.tExit <= 1) {
					result.push({
						type: 1,
						body1: sourceBody,
						body2: c.candidate.body,
						normal: c.collision.normal
					});
				}
			}

			if (realCollisions.length === 0) {
				sourcePosition.add(sourceVelocity);
				break;
			} else {
				// move to tEnter
				sourcePosition.addScaled(sourceVelocity, realCollisions[0].collision.tEnter);
				// clip speed by normal
				const vn = sourceVelocity.dot(realCollisions[0].collision.normal);
				if (vn < 0) {
					sourceVelocity.addScaled(realCollisions[0].collision.normal, -vn);
				}

				toRemove.push(realCollisions[0].candidate)
			}

			candidates = candidates.filter(c => toRemove.includes(c));
		}
	}

	return {
		desiredPosition: sourcePosition,
		events: result
	}
}

function solve (sourceBody: DynamicBody, staticOctree: Octree, statics: Map<number, StaticBody>, kinematics: Map<number, KinematicBody>, dynamics: Map<number, DynamicBody>): { desiredPosition: Vector3; events: CollisionEvent[] } {
	AABBPool.reset();
	VecPool.reset();

	let candidates = broadphase(sourceBody.id, staticOctree, statics, kinematics, dynamics);
	return narrowPhase(sourceBody, candidates);
}

export {
	solve,
	CollisionEventTypeMap
}

export type {
	CollisionEventType,
	CollisionEvent
}