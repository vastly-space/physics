import Vector3 from "./math/vector3.js"
import AABB from "./math/aabb.js"
import { Octree } from "./math/octree.js"
import type { OctItem } from "./math/octree.js"
import StaticBody from "./physics/staticBody.js"
import KinematicBody from "./physics/kinematicBody.js"
import DynamicBody from "./physics/dynamicBody.js"
import { Tester } from "./physics/tester.js"
import type { Intersection, RayTestResult } from "./physics/tester.js"
import { divTrunc } from "./math/utils.js"
import { VecPool, AABBPool } from "./utils/pool.js"

import type Shape from "./physics/shape.js"
import Trimesh from "./physics/shapes/trimesh.js"
import Box from "./physics/shapes/box.js"
import Sphere from "./physics/shapes/sphere.js"
import Capsule from "./physics/shapes/capsule.js"
import Triangle from "./physics/shapes/triangle.js"

import { MAX_DEPENETRATION_ITERATIONS, STEP_UP_HEIGHT, TICKRATE, GROUND_PROBE, MAX_SLOPE } from "./constants.js"

const CEILING_COS = -0.8;
const SLOP = 5;
let SLOPE_FLOAT = Math.cos(MAX_SLOPE * Math.PI/180);

export function recalcSlope () {
	SLOPE_FLOAT = Math.cos(MAX_SLOPE * Math.PI/180);
}

interface CollisionCandidate {
	body: StaticBody | KinematicBody | DynamicBody;
	shape?: Shape;
	triangleIndex?: number;
}

interface CollisionEvent {
	body1: DynamicBody;
	body2: StaticBody | KinematicBody | DynamicBody;
	trigger: boolean;
}

interface MovementResult {
	desiredPosition: Vector3;
	tryStepUp: boolean;
	events: CollisionEvent[];
}

interface SolveResult {
	desiredPosition: Vector3;
	locked: boolean;
	events: CollisionEvent[]; 
}

type FormattedIntersection = { type: 'trigger' | 'ground' | 'xz' | 'ceiling'; candidate: CollisionCandidate; data: Intersection };

function broadphase (body: DynamicBody, staticOctree: Octree, statics: Map<number, StaticBody>, kinematics: Map<number, KinematicBody>, dynamics: Map<number, DynamicBody>): CollisionCandidate[] {
	const result: CollisionCandidate[] = [];

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

		if (body.sweptAABB.overlaps(candidate.aabb)) {
			result.push({
				body: candidate
			})
		}
	}

	for (const [id, candidate] of dynamics.entries()) {
		if (id === body.id || (body.mask !== 0 && candidate.layer !== 0 && ((body.mask & candidate.layer) === 0))) continue;

		if (body.sweptAABB.overlaps(candidate.sweptAABB)) {
			result.push({
				body: candidate
			})
		}
	}

	return result.filter(c => c.body.canCollide);
}

function gatherIntersections (sourceBody: DynamicBody, sourcePosition: Vector3, candidate: CollisionCandidate): FormattedIntersection[] {
	const intersections: FormattedIntersection[] = [];

	for (const shape of sourceBody.shapes) {
		if (candidate.triangleIndex !== undefined) {
			const data = Tester.test(
				{ parentOffset: sourcePosition, shape: shape },
				{ parentOffset: Vector3.Zero, shape: (candidate.shape as Trimesh).triangles[candidate.triangleIndex] }
			);
			if (data !== null) {
				if (candidate.body.isTrigger) {
					intersections.push({
						type: "trigger",
						candidate: candidate,
						data: data
					});
				} else if (data.normal.y >= SLOPE_FLOAT) {
					intersections.push({
						type: "ground",
						candidate: candidate,
						data: data
					});
				} else if (data.normal.y <= CEILING_COS) {
					intersections.push({
						type: "ceiling",
						candidate: candidate,
						data: data
					});
				} else {
					intersections.push({
						type: "xz",
						candidate: candidate,
						data: data
					});
				}
			}
		} else {
			for (const cShape of candidate.body.shapes) {
				const data = Tester.test(
					{ parentOffset: sourcePosition, shape: shape },
					{ parentOffset: candidate.body.position, shape: cShape }
				);
				if (data !== null) {
					if (candidate.body.isTrigger) {
						intersections.push({
							type: "trigger",
							candidate: candidate,
							data: data
						});
					} else if (data.normal.y >= SLOPE_FLOAT) {
						intersections.push({
							type: "ground",
							candidate: candidate,
							data: data
						});
					} else if (data.normal.y <= CEILING_COS) {
						intersections.push({
							type: "ceiling",
							candidate: candidate,
							data: data
						});
					} else {
						intersections.push({
							type: "xz",
							candidate: candidate,
							data: data
						});
					}
				}
			}
		}
	}

	return intersections;
}

function depenetrate (sourceBody: DynamicBody, resPosition: Vector3, candidates: CollisionCandidate[]): CollisionEvent[] | null {
	if (candidates.length === 0) return null;

	const depPos = VecPool.alloc().copy(resPosition);

	let hasIntersection: boolean = true;
	let iterations = 0;

	while (iterations < MAX_DEPENETRATION_ITERATIONS && hasIntersection) {
		hasIntersection = false;
		let currentIntersections: FormattedIntersection[] = [];

		for (const candidate of candidates) {
			currentIntersections = currentIntersections.concat(gatherIntersections(sourceBody, depPos, candidate));
		}

		if (currentIntersections.length === 0) break;

		hasIntersection = true;

		const groundIntersections = currentIntersections.filter(i => i.type === "ground" && i.data.depth > SLOP);
		if (groundIntersections.length > 0) {
			let bestY: number = -Infinity;

			for (const intersection of groundIntersections) {
				bestY = Math.max(intersection.data.depth * intersection.data.normal.y, bestY);
			}

			depPos.y += bestY;
			iterations++;
			continue;
		}

		const xzIntersections = currentIntersections.filter(i => (i.type === "xz" || i.type === "ceiling") && i.data.depth > SLOP);
		if (xzIntersections.length > 0) {
			let bestDepth: number = -Infinity;
			let bestNormal: Vector3 | null = null;

			for (const intersection of xzIntersections) {
				if (intersection.data.depth > bestDepth) {
					bestDepth = intersection.data.depth;
					bestNormal = intersection.data.normal;
				}
			}

			depPos.set(
				depPos.x + bestNormal!.x * bestDepth,
				depPos.y,
				depPos.z + bestNormal!.z * bestDepth
			);
			iterations++;
			continue;
		}

		hasIntersection = false;
	}

	resPosition.set(
		depPos.x | 0,
		depPos.y | 0,
		depPos.z | 0
	);

	if (hasIntersection) {
		let events: CollisionEvent[] = [];

		let currentIntersections: FormattedIntersection[] = [];

		for (const candidate of candidates) {
			currentIntersections = currentIntersections.concat(gatherIntersections(sourceBody, resPosition, candidate));
		}

		for (const intersection of currentIntersections) {
			events.push({
				body1: sourceBody,
				body2: intersection.candidate.body,
				trigger: intersection.candidate.body.isTrigger
			});
		}

		return events;
	} else {
		return null;
	}
}

function moveCCD (sourceBody: DynamicBody, resPosition: Vector3, velocity: Vector3, candidates: CollisionCandidate[]): MovementResult {
	const sphere = sourceBody.shapes[0] as Sphere;
	const intentPosition = VecPool.alloc().copy(resPosition);
	const intentVelocity = VecPool.alloc().copy(velocity);

	let triggersTouched: Set<StaticBody> = new Set();
	let nonTriggersTouched: Set<StaticBody> = new Set();

	let baseVelocityY = intentVelocity.y;
	let clippedXZ = false;

	let iterations = 0;

	const checkCandidates = sourceBody.kinematicBehavior ? candidates.filter(c => c.body.isTrigger) : candidates;

	while (intentVelocity.lengthSquared() > 100) {
		const fromVec = VecPool.alloc().copy(intentPosition).add(sphere.offset);
		const toVec = VecPool.alloc().copy(fromVec).add(intentVelocity);

		let collision: RayTestResult | null = null;
		let collisionBody: StaticBody | null = null;

		let clipped = false;

		for (const candidate of checkCandidates) {
			if (candidate.triangleIndex !== undefined) {
				const lRes = Tester.swept_sphere_triangle(
					{ parentOffset: Vector3.Zero, shape: (candidate.shape as Trimesh).triangles[candidate.triangleIndex]! },
					fromVec,
					toVec,
					sphere.radius
				);

				if (lRes !== null) {
					if (candidate.body.isTrigger) {
						triggersTouched.add(candidate.body);
					} else if (Math.abs(lRes.normal.dot(intentVelocity)) < 1e-8 && (collision === null || lRes.t < collision.t)) {
						collision = lRes;
						collisionBody = candidate.body;
						clippedXZ = lRes.normal!.y <= SLOPE_FLOAT;
						clipped = true;
					}
				}
			} else {
				for (const cShape of candidate.body.shapes) {
					let lRes: RayTestResult | null = null;

					switch (cShape.type) {
						case "box":
							lRes = Tester.ray_box(
								{ parentOffset: candidate.body.position, shape: cShape },
								fromVec,
								toVec,
								sphere.radius
							);
							break;
						case "sphere":
							lRes = Tester.ray_sphere(
								{ parentOffset: candidate.body.position, shape: cShape },
								fromVec,
								toVec,
								sphere.radius
							);
							break;
						case "capsule":
							lRes = Tester.ray_capsule(
								{ parentOffset: candidate.body.position, shape: cShape },
								fromVec,
								toVec,
								sphere.radius
							);
							break;
					}

					if (lRes !== null) {
						if (candidate.body.isTrigger) {
							triggersTouched.add(candidate.body);
						} else if (Math.abs(lRes.normal.dot(intentVelocity)) < 1e-8 && (collision === null || lRes.t < collision.t)) {
							collision = lRes;
							collisionBody = candidate.body;
							clippedXZ = lRes.normal!.y <= SLOPE_FLOAT;
							clipped = true;
						}
					}
				}
			}
		}

		if (collision === null) {
			intentPosition.add(intentVelocity);

			break;
		} else {
			nonTriggersTouched.add(collisionBody!);

			intentPosition.x += intentVelocity.x * collision.t;
			intentPosition.y += intentVelocity.y * collision.t;
			intentPosition.z += intentVelocity.z * collision.t;

			const vn = intentVelocity.dot(collision.normal);
			if (vn < 0) {
				intentVelocity.x += collision.normal.x * (-vn);
				intentVelocity.y += collision.normal.y * (-vn);
				intentVelocity.z += collision.normal.z * (-vn);
			}
		}
	}

	const events: CollisionEvent[] = [];

	for (const t of triggersTouched) {
		events.push({
			body1: sourceBody,
			body2: t,
			trigger: true
		});
	}

	for (const b of nonTriggersTouched) {
		events.push({
			body1: sourceBody,
			body2: b,
			trigger: false
		});
	}

	return {
		desiredPosition: intentPosition,
		tryStepUp: sourceBody.canStepUp && clippedXZ && baseVelocityY <= 0 && !sourceBody.kinematicBehavior,
		events: events
	}
}

function moveIntent (sourceBody: DynamicBody, resPosition: Vector3, velocity: Vector3, candidates: CollisionCandidate[]): MovementResult {
	const intentPosition = VecPool.alloc().copy(resPosition);
	const intentVelocity = VecPool.alloc().copy(velocity).scale(TICKRATE/1000);

	let contacts: Set<StaticBody> = new Set();

	let baseVelocityY = intentVelocity.y;
	let clippedXZ = false;

	let iterations = 0;

	if (sourceBody.kinematicBehavior) {
		intentPosition.add(intentVelocity);
	} else {
		while (intentVelocity.lengthSquared() > 100 && iterations < MAX_DEPENETRATION_ITERATIONS) {
			intentPosition.add(intentVelocity);

			let currentIntersections: FormattedIntersection[] = [];

			for (const candidate of candidates) {
				currentIntersections = currentIntersections.concat(gatherIntersections(sourceBody, intentPosition, candidate));
			}
			currentIntersections = currentIntersections.filter(i => i.data.depth >= SLOP);

			if (currentIntersections.length === 0) break;

			const groundIntersections = currentIntersections.filter(i => i.type === "ground");
			if (groundIntersections.length > 0) {
				let bestY: number = -Infinity;
				let bestBody: StaticBody | null = null;

				for (const intersection of groundIntersections) {
					const contactY = intersection.data.depth * intersection.data.normal.y;
					if (contactY > bestY) {
						bestY = contactY;
						bestBody = intersection.candidate.body
					}
				}

				intentPosition.y += bestY;
				intentVelocity.y = 0;
				iterations++;

				contacts.add(bestBody!);	
				continue;
			}

			const xzIntersections = currentIntersections.filter(i => (i.type === "xz" || i.type === "ceiling"));
			if (xzIntersections.length > 0) {
				let bestDepth: number = -Infinity;
				let bestNormal: Vector3 | null = null;
				let bestBody: StaticBody | null = null;

				for (const intersection of xzIntersections) {
					if (intersection.data.depth > bestDepth) {
						bestDepth = intersection.data.depth;
						bestNormal = intersection.data.normal;
						bestBody = intersection.candidate.body;
					}
				}

				clippedXZ = bestNormal!.y <= SLOPE_FLOAT;

				const mtv = VecPool.alloc().copy(bestNormal!).scale(bestDepth);
				mtv.y = 0;
				const dir = VecPool.alloc().copy(intentVelocity).normalize();
				dir.y = 0;

				const forward = mtv.dot(dir);

				if (forward > 0) {
					mtv.x -= dir.x * forward;
					mtv.z -= dir.z * forward;
				}

				intentPosition.set(
					intentPosition.x + mtv.x,
					intentPosition.y,
					intentPosition.z + mtv.z
				);

				const vn = intentVelocity.dot(bestNormal!);
				if (vn < 0) {
					intentVelocity.x += bestNormal!.x * (-vn);
					intentVelocity.z += bestNormal!.z * (-vn);
				}
				iterations++;

				contacts.add(bestBody!);
				continue;
			}

			const ceilingIntersections = currentIntersections.filter(i => i.type === "ceiling");
			if (ceilingIntersections.length > 0) {
				let bestY: number = -Infinity;
				let bestDepth: number = -Infinity;
				let bestNormal: Vector3 | null = null;
				let bestBody: StaticBody | null = null;

				for (const intersection of ceilingIntersections) {
					bestY = Math.max(intersection.data.depth * intersection.data.normal.y, bestY);
					bestNormal = intersection.data.normal;
					bestDepth = intersection.data.depth;
					bestBody = intersection.candidate.body;
				}

				const mtv = VecPool.alloc().copy(bestNormal!).scale(bestDepth);
				mtv.y = 0;
				const dir = VecPool.alloc().copy(intentVelocity).normalize();
				dir.y = 0;

				const forward = mtv.dot(dir);

				if (forward > 0) {
					mtv.x -= dir.x * forward;
					mtv.z -= dir.z * forward;
				}

				intentPosition.set(
					intentPosition.x + mtv.x,
					intentPosition.y - bestY,
					intentPosition.z + mtv.z
				);
				
				const vn = intentVelocity.dot(bestNormal!);
				if (vn < 0) {
					intentVelocity.x += bestNormal!.x * (-vn);
					intentVelocity.z += bestNormal!.z * (-vn);
				}
				intentVelocity.y = 0;
				iterations++;

				contacts.add(bestBody!);
				continue;
			}
		}
	}

	let triggerIntersections: FormattedIntersection[] = [];
	for (const candidate of candidates.filter(c => c.body.isTrigger)) {
		triggerIntersections = triggerIntersections.concat(gatherIntersections(sourceBody, intentPosition, candidate));
	}

	const triggerContacts: Set<StaticBody> = new Set();
	for (const intersection of triggerIntersections) {
		triggerContacts.add(intersection.candidate.body);
	}

	let events: CollisionEvent[] = [];

	for (const b of contacts) {
		events.push({
			body1: sourceBody,
			body2: b,
			trigger: false
		});
	}

	for (const t of triggerContacts) {
		events.push({
			body1: sourceBody,
			body2: t,
			trigger: true
		});
	}

	return {
		desiredPosition: intentPosition,
		tryStepUp: sourceBody.canStepUp && clippedXZ && baseVelocityY <= 0 && !sourceBody.kinematicBehavior,
		events: events
	}
}

function solve (sourceBody: DynamicBody, staticOctree: Octree, statics: Map<number, StaticBody>, kinematics: Map<number, KinematicBody>, dynamics: Map<number, DynamicBody>): SolveResult {
	AABBPool.reset();
	VecPool.reset();

	if (!sourceBody.canCollide) {
		let resPosition = VecPool.alloc().copy(sourceBody.position).add(sourceBody.velocity);

		return {
			desiredPosition: resPosition,
			locked: false,
			events: []
		}
	}

	let candidates = broadphase(sourceBody, staticOctree, statics, kinematics, dynamics);
	let resPosition = VecPool.alloc().copy(sourceBody.position);
	let velocity = VecPool.alloc().copy(sourceBody.velocity);

	const depResult = depenetrate(sourceBody, resPosition, candidates);
	if (depResult) {
		return {
			desiredPosition: resPosition,
			locked: true,
			events: depResult
		}
	}

	let events: CollisionEvent[];

	const shapes = sourceBody.shapes;

	const moveFunction = shapes.length === 1 && shapes[0].type === "sphere" ? moveCCD : moveIntent;

	// movement intent -> depenetration -> clipping
	const beforeStepUp = moveFunction(sourceBody, resPosition, velocity, candidates);

	if (beforeStepUp.tryStepUp) {
		const stepUpVec = VecPool.alloc().copy(resPosition);
		stepUpVec.y += STEP_UP_HEIGHT;
		const afterStepUp = moveFunction(sourceBody, resPosition, velocity, candidates);

		if (beforeStepUp.desiredPosition.dot(velocity) < afterStepUp.desiredPosition.dot(velocity)) {
			resPosition.copy(afterStepUp.desiredPosition);
			events = afterStepUp.events;
		} else {
			resPosition.copy(beforeStepUp.desiredPosition);
			events = beforeStepUp.events;	
		}
	} else {
		resPosition.copy(beforeStepUp.desiredPosition);
		events = beforeStepUp.events;
	}

	resPosition.x |= 0;
	resPosition.y |= 0;
	resPosition.z |= 0;

	return {
		desiredPosition: resPosition,
		locked: false,
		events: events!
	}
}

function groundCheckBroadphase (body: DynamicBody, staticOctree: Octree, statics: Map<number, StaticBody>, kinematics: Map<number, KinematicBody>, dynamics: Map<number, DynamicBody>) {
	const aabb = AABBPool.alloc().copy(body.aabb);
	const groundProbe = VecPool.alloc().set(
		0,
		-GROUND_PROBE,
		0
	);
	aabb.expandVector(groundProbe);

	const result: CollisionCandidate[] = [];

	const candidates: OctItem[] = [];
	staticOctree.queryAABB(aabb, candidates, body.mask);

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

		if (aabb.overlaps(candidate.aabb)) {
			result.push({
				body: candidate
			})
		}
	}

	for (const [id, candidate] of dynamics.entries()) {
		if (id === body.id || (body.mask !== 0 && candidate.layer !== 0 && ((body.mask & candidate.layer) === 0))) continue;

		if (aabb.overlaps(candidate.aabb)) {
			result.push({
				body: candidate
			})
		}
	}

	return result.filter(c => c.body.canCollide);
}

function groundCheck (sourceBody: DynamicBody, staticOctree: Octree, statics: Map<number, StaticBody>, kinematics: Map<number, KinematicBody>, dynamics: Map<number, DynamicBody>) {
	sourceBody.supportedBy = -1;
	sourceBody.groundNormal = VecPool.alloc().set(0,-1,0);

	if (sourceBody.kinematicBehavior || sourceBody.gravityMultiplier === 0) return;

	const candidates = groundCheckBroadphase(sourceBody, staticOctree, statics, kinematics, dynamics).filter(c => !c.body.isTrigger);

	let bestDepth: number = -Infinity;
	let bestNormal: Vector3 | null = null;
	let bestBody: StaticBody | null = null;

	for (const candidate of candidates) {
		const shifted = VecPool.alloc().copy(sourceBody.position);
		shifted.y -= GROUND_PROBE;
		const intersections = gatherIntersections(sourceBody, shifted, candidate).filter(i => i.data.normal.y >= SLOPE_FLOAT);

		for (const intersection of intersections) {
			if (intersection.data.depth > bestDepth) {
				bestDepth = intersection.data.depth;
				bestBody = candidate.body;
				bestNormal = intersection.data.normal;
			}
		}
	}

	if (bestBody !== null && bestDepth >= GROUND_PROBE) {
		sourceBody.supportedBy = bestBody.id;
		sourceBody.groundNormal = bestNormal!;
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