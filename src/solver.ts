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
import { MAX_DEPENETRATION_ITERATIONS, STEP_UP_HEIGHT, TICKRATE, GROUND_PROBE, MAX_SLOPE } from "./constants.js"

const FLOOR_COS = 0.5;
const CEILING_COS = -0.8;

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

type FormattedCollision = { type: 'trigger' | 'ground' | 'xz' | 'ceiling'; candidate: CollisionCandidate; collision: Collision };

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

function gatherCollisions (sourceBody: DynamicBody, sourcePosition: Vector3, candidate: CollisionCandidate, sourceVelocity: Vector3, candidateVelocity: Vector3): FormattedCollision[] {
	const collisions: Collision[] = [];

	if (candidate.triangleIndex !== undefined) {
		for (const shape of sourceBody.shapes) {
			const res = SAT.test(
				{ parentOffset: sourcePosition, shape: shape },
				{ parentOffset: candidate.body.position, shape: (candidate.shape as Trimesh).triangles[candidate.triangleIndex] },
				sourceVelocity,
				candidateVelocity
			);

			if (res !== null) collisions.push(res);
		}
	} else {
		for (const shape of sourceBody.shapes) {
			for (const cShape of candidate.body.shapes) {
				const res = SAT.test(
					{ parentOffset: sourcePosition, shape: shape },
					{ parentOffset: candidate.body.position, shape: cShape },
					sourceVelocity,
					candidateVelocity
				);

				if (res !== null) collisions.push(res);
			}
		}
	}

	if (candidate.body.isTrigger) {
		return collisions.map(collision => {
			return {
				type: "trigger",
				candidate: candidate,
				collision: collision
			};
		});
	} else {
		return collisions.map(collision => {
			if (!sourceVelocity.isZero() && sourceVelocity.dot(collision.normal) === 0) return null;

			if (collision.normal.y >= FLOOR_COS) {
				return {
					type: "ground",
					candidate: candidate,
					collision: collision
				};
			} else if (collision.normal.y <= CEILING_COS) {
				return {
					type: "ceiling",
					candidate: candidate,
					collision: collision
				};
			} else {
				return {
					type: "xz",
					candidate: candidate,
					collision: collision
				};
			}
		}).filter(c => c !== null) as FormattedCollision[];
	}
}

function depenetrationPhase (sourceBody: DynamicBody, candidates: CollisionCandidate[], sourcePosition: Vector3): [boolean, CollisionEvent[]] {
	const depPos: Vector3 = VecPool.alloc().copy(sourcePosition);

	let iterations = 0;

	while (iterations < MAX_DEPENETRATION_ITERATIONS) {
		let totalCollisions: FormattedCollision[] = [];

		// collect all including ground
		for (const candidate of candidates) {
			const tests = gatherCollisions(sourceBody, depPos, candidate, Vector3.Zero, Vector3.Zero).filter(c => {
				return c.type !== "trigger" && c.collision.depth >= 2;
			});
			totalCollisions = totalCollisions.concat(tests);
		}

		if (totalCollisions.length === 0) break;

		const groundContacts = totalCollisions.filter(c => c.type === "ground");
		if (groundContacts.length > 0) {
			let maxY = -Infinity;
			for (const contact of groundContacts) {
				maxY = Math.max(contact.collision.normal.y * contact.collision.depth, maxY);
			}

			depPos.y += maxY;
			depPos.y | 0;
			iterations++;
			continue;
		} else {
			// collect contacts in XZ plane
			const xzContacts = totalCollisions.filter(c => c.type !== "ground");

			let maxDepth = -Infinity;
			let maxVec: Vector3 | null = null;

			for (const contact of xzContacts) {
				if (contact.collision.depth > maxDepth) {
					maxDepth = contact.collision.depth;
					maxVec = VecPool.alloc().copy(contact.collision.normal).scale(contact.collision.depth);
				}
			}

			depPos.x += maxVec!.x;
			depPos.z += maxVec!.z;
			iterations++;
		}
	}

	// check if we still have penetrations
	let totalCollisions: FormattedCollision[] = [];

	// collect all including ground
	for (const candidate of candidates) {
		const tests = gatherCollisions(sourceBody, depPos, candidate, Vector3.Zero, Vector3.Zero);
		totalCollisions = totalCollisions.concat(tests);
	}

	const finalCollisions = totalCollisions.filter(c => c.type !== "trigger" && c.collision.depth >= 2);

	sourcePosition.copy(depPos);

	if (finalCollisions.length > 0) {
		return [true, finalCollisions.map(c => {
			return {
				body1: sourceBody,
				body2: c.candidate.body,
				normal: c.collision.normal,
				exitFlag: false
			}
		})]
	} else {
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
		let intersections: FormattedCollision[] = [];

		for (const candidate of candidates) {
			let cVel: Vector3 = Vector3.Zero;

			switch (candidate.body.kind) {
				case "kinematic":
					cVel = (candidate.body as KinematicBody).motionDelta;
					break;
				case "dynamic":
					cVel = (candidate.body as DynamicBody).velocity;
					break;
			}

			const tests = gatherCollisions(sourceBody, sourcePosition, candidate, sourceVelocity, cVel);
			intersections = intersections.concat(tests);
		}

		intersections.sort((a, b) => a.collision.tEnter - b.collision.tEnter);

		const groundContacts = intersections.filter(c => c.type === "ground");
		if (groundContacts.length > 0) {
			let maxY = -Infinity;
			let maxContactTEnter = -Infinity;

			for (const contact of groundContacts) {
				let y = sourcePosition.y + sourceVelocity.y * contact.collision.tEnter;

				if (y > maxY) {
					maxY = y;
					maxContactTEnter = contact.collision.tEnter;
				}
			}

			sourcePosition.y = maxY;
			sourceVelocity.y = 0;

			const triggerContacts = intersections.filter(c => c.type === "trigger" && c.collision.tEnter <= maxContactTEnter);
			for (const contact of triggerContacts) {
				result.push({
					body1: sourceBody,
					body2: contact.candidate.body,
					normal: contact.collision.normal,
					exitFlag: contact.collision.tExit <= 1
				});
			}

			continue;
		}

		const xzContacts = intersections.filter(c => c.type === "xz");
		if (xzContacts.length > 0) {
			const contact = xzContacts[0];

			const triggerContacts = intersections.filter(c => c.type === "trigger" && c.collision.tEnter <= contact.collision.tEnter);
			for (const contact of triggerContacts) {
				result.push({
					body1: sourceBody,
					body2: contact.candidate.body,
					normal: contact.collision.normal,
					exitFlag: contact.collision.tExit <= 1
				});
			}

			const moveDelta = VecPool.alloc().copy(sourceVelocity).scale(contact.collision.tEnter);
			sourcePosition.add(moveDelta);

			const vn = sourceVelocity.dot(contact.collision.normal);
			if (vn < 0) {
				sourceVelocity.x += contact.collision.normal.x * (-vn);
				// sourceVelocity.y += contact.collision.normal.y * (-vn);
				sourceVelocity.z += contact.collision.normal.z * (-vn);
				sourceVelocity.x |= 0;
				// sourceVelocity.y |= 0;
				sourceVelocity.z |= 0;
				continue;
			}
		}

		const ceilingContacts = intersections.filter(c => c.type === "ceiling");
		if (ceilingContacts.length > 0) {
			let minY = -Infinity;
			let minContactTEnter = -Infinity;

			for (const contact of ceilingContacts) {
				let y = sourcePosition.y + sourceVelocity.y * contact.collision.tEnter;

				if (y < minY) {
					minY = y;
					minContactTEnter = contact.collision.tEnter;
				}
			}

			sourcePosition.y = minY;
			sourceVelocity.y = 0;

			const triggerContacts = intersections.filter(c => c.type === "trigger" && c.collision.tEnter <= minContactTEnter);
			for (const contact of triggerContacts) {
				result.push({
					body1: sourceBody,
					body2: contact.candidate.body,
					normal: contact.collision.normal,
					exitFlag: contact.collision.tExit <= 1
				});
			}

			continue;
		}

		if (sourceVelocity.lengthSquared() >= 100) {
			const triggerContacts = intersections.filter(c => c.type === "trigger");
			for (const contact of triggerContacts) {
				result.push({
					body1: sourceBody,
					body2: contact.candidate.body,
					normal: contact.collision.normal,
					exitFlag: contact.collision.tExit <= 1
				});
			}

			sourcePosition.add(sourceVelocity);
			break;
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

				if (event.normal.dot(velocity) >= FLOOR_COS) continue;

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

	let bestGround: number = -1;
	let bestGroundT: number = -1;
	let bestGroundNormal: Vector3 | null = null;
	let bestGroundDepth: number = 0;

	for (const candidate of candidates) {
		if (candidate.triangleIndex !== undefined) {
			for (const shape of sourceBody.shapes) {
				const result = SAT.test(
					{ parentOffset: sourceBody.position, shape: shape },
					{ parentOffset: candidate.body.position, shape: (candidate.shape as Trimesh).triangles[candidate.triangleIndex] },
					groundProbe,
					Vector3.Zero
				);

				if (result !== null && result.normal.y >= MAX_SLOPE) {
					if (bestGround === -1 || bestGroundT > result.tEnter || bestGroundDepth < result.depth) {
						bestGround = candidate.body.id;
						bestGroundT = result.tEnter;
						bestGroundNormal = result.normal;
						bestGroundDepth = result.depth;
					}
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

					if (result !== null && result.normal.y >= MAX_SLOPE) {
						if (bestGround === -1 || bestGroundT > result.tEnter || bestGroundDepth < result.depth) {
							bestGround = candidate.body.id;
							bestGroundT = result.tEnter;
							bestGroundNormal = result.normal;
							bestGroundDepth = result.depth;
						}
					}
				}
			}
		}
	}

	if (bestGround !== -1) {
		sourceBody.supportedBy = bestGround;
		sourceBody.groundNormal = bestGroundNormal as Vector3;
		// snap to ground
		const pos = VecPool.alloc().copy(sourceBody.position);

		if (bestGroundDepth === 0) {
			if (bestGroundT > 0) {
				// glue to surface
				const snapVec = VecPool.alloc().copy(Vector3.YAxis).scale(GROUND_PROBE * bestGroundT).neg();
				pos.add(snapVec);
			}
		} else {
			const yDot = (bestGroundNormal as Vector3).dot(Vector3.YAxis);
			const snapVec = VecPool.alloc().copy(Vector3.YAxis).scale(GROUND_PROBE - yDot).neg();
			pos.add(snapVec);
		}

		sourceBody.position = pos;
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