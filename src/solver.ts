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
import { MAX_DEPENETRATION_ITERATIONS, STEP_UP_HEIGHT, TICKRATE, GROUND_PROBE } from "./constants.js"

const COS_60 = -0.5;

interface CollisionCandidate {
	body: StaticBody | KinematicBody | DynamicBody;
	shape?: Shape;
	triangleIndex?: number;
}

interface CollisionEvent {
	body1: DynamicBody;
	body2: StaticBody | KinematicBody | DynamicBody;
	normal: Vector3;
	exitFlag: boolean;
}

interface SolveResult {
	desiredPosition: Vector3;
	locked: boolean;
	events: CollisionEvent[]; 
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

function depenetrationPhase (sourceBody: DynamicBody, candidates: CollisionCandidate[], sourcePosition: Vector3): [boolean, CollisionEvent[]] {
	let locked: boolean = false;
	const depPos: Vector3 = VecPool.alloc().copy(sourcePosition);

	let iterations = 0;
	let hasPenetration = false;

	do {
		hasPenetration = false;
		let biggestPenetration: Vector3 | null = null;
		let biggestPenetrationDepth: number = -Infinity;

		for (const candidate of candidates) {
			for (const shape of sourceBody.shapes) {
				if (candidate.triangleIndex !== undefined) {
					const res = SAT.test(
						{ parentOffset: depPos, shape: shape },
						{ parentOffset: candidate.body.position, shape: (candidate.shape as Trimesh).triangles[candidate.triangleIndex] },
						Vector3.Zero,
						Vector3.Zero
					);

					if (res !== null && res.depth >= 2 && res.depth > biggestPenetrationDepth) {
						hasPenetration = true;
						biggestPenetration = VecPool.alloc().copy(res.normal).scale(res.depth)
					}
				} else {
					for (const cShape of candidate.body.shapes) {
						const res = SAT.test(
							{ parentOffset: depPos, shape: shape },
							{ parentOffset: candidate.body.position, shape: cShape },
							Vector3.Zero,
							Vector3.Zero
						);

						if (res !== null && res.depth >= 2 && res.depth > biggestPenetrationDepth) {
							hasPenetration = true;
							biggestPenetration = VecPool.alloc().copy(res.normal).scale(res.depth)
						}
					}
				}
			}
		}

		// move out by biggest penetration
		if (hasPenetration) {
			depPos.add(biggestPenetration!);
		}

		iterations++;
	} while (hasPenetration && iterations < MAX_DEPENETRATION_ITERATIONS);

	if (hasPenetration) {
		let events: CollisionEvent[] = [];

		for (const candidate of candidates) {
			for (const shape of sourceBody.shapes) {
				if (candidate.triangleIndex !== undefined) {
					const res = SAT.test(
						{ parentOffset: sourcePosition, shape: shape },
						{ parentOffset: candidate.body.position, shape: (candidate.shape as Trimesh).triangles[candidate.triangleIndex] },
						Vector3.Zero,
						Vector3.Zero
					);

					if (res !== null) {
						events.push({
							body1: sourceBody,
							body2: candidate.body,
							normal: res.normal,
							exitFlag: false
						});
					}
				} else {
					for (const cShape of candidate.body.shapes) {
						const res = SAT.test(
							{ parentOffset: sourcePosition, shape: shape },
							{ parentOffset: candidate.body.position, shape: cShape },
							Vector3.Zero,
							Vector3.Zero
						);

						if (res !== null) {
							events.push({
								body1: sourceBody,
								body2: candidate.body,
								normal: res.normal,
								exitFlag: false
							});
						}
					}
				}
			}
		}

		return [true, events];
	} else {
		sourcePosition.copy(depPos);

		return [false, []];
	}
}

function narrowPhase (sourceBody: DynamicBody, candidates: CollisionCandidate[], applyStepUp: boolean = false): SolveResult {
	const result: CollisionEvent[] = [];
	const sourcePosition = VecPool.alloc().copy(sourceBody.position);
	if (applyStepUp) {
		sourcePosition.y += STEP_UP_HEIGHT;
	}
	const sourceVelocity = sourceBody.velocity.scale(TICKRATE/1000);

	/*
		DEPENETRATION
	*/
	const depResult = depenetrationPhase(sourceBody, candidates, sourcePosition);
	if (depResult[0]) {
		return {
			desiredPosition: sourcePosition,
			events: depResult[1],
			locked: true
		}
	}

	/*
		NARROWPHASE
	*/
	while (sourceVelocity.lengthSquared() >= 100) {
		let realCollisions: { candidate: CollisionCandidate, collision: Collision }[] = [];

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
					let cVel: Vector3 = Vector3.Zero;

					switch (candidate.body.kind) {
						case "kinematic":
							cVel = (candidate.body as KinematicBody).motionDelta;
							break;
						case "dynamic":
							cVel = (candidate.body as DynamicBody).velocity;
							break;
					}

					for (const cShape of candidate.body.shapes) {
						const collision = SAT.test(
							{ parentOffset: sourcePosition, shape: shape },
							{ parentOffset: candidate.body.position, shape: cShape },
							sourceVelocity,
							cVel
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
			// sort out by time
			realCollisions.sort((a, b) => a.collision.tEnter - b.collision.tEnter);
			// skip all trigger bodies events
			while (realCollisions[0] !== undefined && realCollisions[0].candidate.body.isTrigger) {
				const c = realCollisions.shift() as { candidate: CollisionCandidate, collision: Collision };

				if (c.collision.tEnter >= 0) {
					result.push({
						body1: sourceBody,
						body2: c.candidate.body,
						normal: c.collision.normal,
						exitFlag: false
					});
				}

				if (c.collision.tExit <= 1) {
					result.push({
						body1: sourceBody,
						body2: c.candidate.body,
						normal: c.collision.normal,
						exitFlag: true
					});
				}
			}

			if (realCollisions.length === 0 || sourceBody.kinematicBehavior) {
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

				result.push({
					body1: sourceBody,
					body2: realCollisions[0].candidate.body,
					normal: realCollisions[0].collision.normal,
					exitFlag: true
				});
			}
		}
	}

	return {
		desiredPosition: sourcePosition,
		locked: false,
		events: result
	}
}

function solve (sourceBody: DynamicBody, staticOctree: Octree, statics: Map<number, StaticBody>, kinematics: Map<number, KinematicBody>, dynamics: Map<number, DynamicBody>): SolveResult {
	AABBPool.reset();
	VecPool.reset();

	let candidates = broadphase(sourceBody.id, staticOctree, statics, kinematics, dynamics);
	let result = narrowPhase(sourceBody, candidates, false);

	if (!sourceBody.kinematicBehavior && !result.locked) {
		/*
			STEP UP STRATEGY
		*/
		let needStepUp = false;
		const velocity = sourceBody.velocity;
		velocity.y = 0;

		if (!velocity.isZero()) {
			velocity.normalize();

			for (const event of result.events) {
				if (event.body2.isTrigger) continue;

				if (event.normal.dot(velocity) >= COS_60) continue;

				needStepUp = true;
				break;
			}

			if (needStepUp) {
				const afterStepUp = narrowPhase(sourceBody, candidates, true);

				if (!afterStepUp.locked) {
					// compare positions with/without step up along velocity axis

					const first = result.desiredPosition.dot(velocity);
					const second = afterStepUp.desiredPosition.dot(velocity);

					if (second > first) {
						result = afterStepUp;
					}
				}
			}
		}
	}

	return result;
}

/*
	GROUND CHECKING
*/
function groundBroadphase (dynamicId: number, staticOctree: Octree, statics: Map<number, StaticBody>, kinematics: Map<number, KinematicBody>, dynamics: Map<number, DynamicBody>): CollisionCandidate[] {
	const result: CollisionCandidate[] = [];

	const body = dynamics.get(dynamicId) as DynamicBody;
	const testAABB = AABBPool.alloc().copy(body.aabb);
	testAABB.min.y -= GROUND_PROBE;

	const candidates: OctItem[] = [];
	staticOctree.queryAABB(testAABB, candidates, body.mask);

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

		const intersects = SAT.testAABB(testAABB, candidate.aabb);

		if (intersects) {
			result.push({
				body: candidate
			})
		}
	}

	for (const [id, candidate] of dynamics.entries()) {
		if (id === dynamicId || (body.mask !== 0 && candidate.layer !== 0 && ((body.mask & candidate.layer) === 0))) continue;

		const intersects = SAT.testAABB(testAABB, candidate.aabb);

		if (intersects) {
			result.push({
				body: candidate
			})
		}
	}

	return result;
}

function groundCheck (sourceBody: DynamicBody, staticOctree: Octree, statics: Map<number, StaticBody>, kinematics: Map<number, KinematicBody>, dynamics: Map<number, DynamicBody>) {
	const candidates = groundBroadphase(sourceBody.id, staticOctree, statics, kinematics, dynamics);
	sourceBody.supportedBy = -1;
	sourceBody.groundNormal.set(0, 0, 0);
	const groundProbe = VecPool.alloc();
	groundProbe.y -= GROUND_PROBE;

	for (const candidate of candidates) {
		if (candidate.triangleIndex !== undefined) {
			for (const shape of sourceBody.shapes) {
				const result = SAT.test(
					{ parentOffset: sourceBody.position, shape: shape },
					{ parentOffset: candidate.body.position, shape: (candidate.shape as Trimesh).triangles[candidate.triangleIndex] },
					groundProbe,
					Vector3.Zero
				);

				if (result !== null && result.normal.y > sourceBody.groundNormal.y) {
					sourceBody.supportedBy = candidate.body.id;
					sourceBody.groundNormal = result.normal;
				}
			}
		} else {
			for (const cShape of candidate.body.shapes) {
				for (const shape of sourceBody.shapes) {
					const result = SAT.test(
						{ parentOffset: sourceBody.position, shape: shape },
						{ parentOffset: candidate.body.position, shape: cShape },
						groundProbe,
						Vector3.Zero
					);

					if (result !== null && result.normal.y > sourceBody.groundNormal.y) {
						sourceBody.supportedBy = candidate.body.id;
						sourceBody.groundNormal = result.normal;
					}
				}
			}
		}
	}
}

export {
	solve,
	groundCheck
}

export type {
	CollisionEvent,
	SolveResult
}