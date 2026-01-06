import { Octree } from "./math/octree.js"
import AABB from "./math/aabb.js"
import Vector3 from "./math/vector3.js"
import { divTrunc } from "./math/utils.js"
import StaticBody from "./physics/staticBody.js"
import KinematicBody from "./physics/kinematicBody.js"
import DynamicBody from "./physics/dynamicBody.js"
import { Controller } from "./controller/controller.js"
import { generateDirectionsTable } from "./controller/directionsTable.js"
import { solve, groundCheck } from "./solver.js"
import type { SolveResult } from "./solver.js"
import { VecPool } from "./utils/pool.js"
import Scheduler from "./scheduler.js"
import { TICKRATE, GLOBAL_GRAVITY, MAX_DOWN_SPEED, STEP_UP_HEIGHT } from "./constants.js"

const MaxWorldBox = 2147483647 * 2;

export interface WorldOptions {
	worldCubeSize?: number;
	mode: "server" | "client" | "standalone";
	tick: number;
}

type Body = StaticBody | KinematicBody | DynamicBody;
type TickEventNumeric = 0 | 1 | 2;

export interface TickEvent {
	type: TickEventNumeric;
	body1: Body;
	body2: Body;
}

export class World {
	public static readonly TickEventTypes: Record<TickEventNumeric, string> = {
		0: "triggerEnter",
		1: "triggerExit",
		2: "collide"
	}

	public static readonly rTickEventTypes: Record<string, TickEventNumeric> = {
		triggerEnter: 0,
		triggerExit: 1,
		collide: 2
	}

	private bodyCounter: number = 0;
	private localBodyCounter: number = -1;
	private statics: Map<number, StaticBody> = new Map();
	private octree: Octree;
	private kinematics: Map<number, KinematicBody> = new Map();
	private dynamics: Map<number, DynamicBody> = new Map();
	private locals: Map<number, DynamicBody> = new Map();
	private controllers: Map<number, Controller> = new Map();
	public scheduler: Scheduler;

	constructor (options: WorldOptions) {
		generateDirectionsTable();

		if (options.worldCubeSize !== undefined && options.worldCubeSize > MaxWorldBox) throw new Error("World cube size extending the limit");

		const halfSize = divTrunc(options.worldCubeSize || MaxWorldBox, 2);
		this.octree = new Octree(new AABB(
			new Vector3(-halfSize, -halfSize, -halfSize),
			new Vector3(halfSize, halfSize, halfSize)
		));
		this.scheduler = new Scheduler(options.mode, options.tick);

		this.scheduler.tickListener = this.step.bind(this);
	}

	get tick (): number {
		return this.scheduler.tick;
	}

	set tick (val: number) {
		this.scheduler.tick = val;
	}

	step (): TickEvent[] {
		for (const [id, k] of this.kinematics.entries()) {
			k.scriptPos = k.transformations.step(this.scheduler.tick);
			k.preStep();
		}

		let deps: Record<number, number> = {};

		for (const [id, d] of this.dynamics.entries()) {
			let envVelocity = VecPool.alloc().set(0, 0, 0);
			// update environmental speed
			d.transformations.step(this.scheduler.tick);
			d.preStep();
			if (!d.kinematicBehavior) {
				if (d.supportedBy !== -1) {
					// we have a platform that carries body
					if (this.kinematics.has(d.supportedBy)) {
						envVelocity.addScaled(this.kinematics.get(d.supportedBy)!.motionDelta, 1000/TICKRATE);
					} else if (this.dynamics.has(d.supportedBy)) {
						deps[id] = d.supportedBy;
					}
				} else {
					if (d.gravityMultiplier !== 0) {
						envVelocity.y = d.environmentalVelocity.y - (((GLOBAL_GRAVITY/TICKRATE) * d.gravityMultiplier) | 0);

						if (envVelocity.y < MAX_DOWN_SPEED) envVelocity.y = MAX_DOWN_SPEED;
					}
				}
			}

			d.environmentalVelocity = envVelocity;
		}

		// now for those who likes to stand on other's heads
		while (Object.keys(deps).length !== 0) {
			for (const rId in deps) {
				const upId = parseInt(rId);
				const downId = deps[upId];
				if (upId === deps[downId]) throw new Error("Bodies shouldn't support each other, something's wrong");

				if (deps[downId] !== undefined) continue;

				const upBody = this.dynamics.get(upId);
				const downBody = this.dynamics.get(downId);

				if (upBody === undefined) {
					delete deps[upId];
					continue;
				}

				if (downBody === undefined) {
					upBody.supportedBy = -1;
					delete deps[upId];
					delete deps[downId];
					continue;
				}

				upBody.environmentalVelocity.add(downBody.velocity);

				delete deps[upId];
			}
		}

		let tickEvents: TickEvent[] = [];

		for (const [id, d] of this.dynamics.entries()) {
			d.preStep();

			const tickResult = solve(d, this.octree, this.statics, this.kinematics, this.dynamics);

			d.position = tickResult.desiredPosition;

			const prevTriggers = new Set(d.triggerIntersections);
			d.triggerIntersections.clear();

			for (const ev of tickResult.events) {
				if (ev.trigger) {
					if (!prevTriggers.has(ev.body2.id)) {
						tickEvents.push({
							type: World.rTickEventTypes.triggerEnter,
							body1: ev.body1,
							body2: ev.body2
						});
					} else {
						prevTriggers.delete(ev.body2.id);
					}
					d.triggerIntersections.add(ev.body2.id);
				} else {
					tickEvents.push({
						type: World.rTickEventTypes.collide,
						body1: ev.body1,
						body2: ev.body2
					});
				}
			}

			for (const id of prevTriggers) {
				const triggerBody = this.statics.get(id) || this.kinematics.get(id);

				if (triggerBody !== undefined) {
					tickEvents.push({
						type: World.rTickEventTypes.triggerExit,
						body1: d,
						body2: triggerBody!
					});
				}
			}
		}

		// local bodies
		for (const [id, d] of this.locals.entries()) {
			let envVelocity = VecPool.alloc().set(0, 0, 0);
			// update environmental speed
			d.transformations.step(this.scheduler.tick);
			d.preStep();
			if (!d.kinematicBehavior) {
				if (d.supportedBy !== -1) {
					// we have a platform that carries body
					if (this.kinematics.has(d.supportedBy)) {
						envVelocity.addScaled(this.kinematics.get(d.supportedBy)!.motionDelta, 1000/TICKRATE);
					} else if (this.dynamics.has(d.supportedBy)) {
						envVelocity.add(d.velocity);
					}
				} else {
					if (d.gravityMultiplier !== 0) {
						envVelocity.y = d.environmentalVelocity.y - (((GLOBAL_GRAVITY/TICKRATE) * d.gravityMultiplier) | 0);

						if (envVelocity.y < MAX_DOWN_SPEED) envVelocity.y = MAX_DOWN_SPEED;
					}
				}
			}

			d.environmentalVelocity = envVelocity;
		}

		for (const [id, d] of this.locals.entries()) {
			d.preStep();

			const tickResult = solve(d, this.octree, this.statics, this.kinematics, this.dynamics);

			d.position = tickResult.desiredPosition;

			const prevTriggers = new Set(d.triggerIntersections);
			d.triggerIntersections.clear();

			for (const ev of tickResult.events) {
				if (ev.trigger) {
					if (!prevTriggers.has(ev.body2.id)) {
						tickEvents.push({
							type: World.rTickEventTypes.triggerEnter,
							body1: ev.body1,
							body2: ev.body2
						});
					} else {
						prevTriggers.delete(ev.body2.id);
					}
					d.triggerIntersections.add(ev.body2.id);
				} else {
					tickEvents.push({
						type: World.rTickEventTypes.collide,
						body1: ev.body1,
						body2: ev.body2
					});
				}
			}

			for (const id of prevTriggers) {
				const triggerBody = this.statics.get(id) || this.kinematics.get(id);

				if (triggerBody !== undefined) {
					tickEvents.push({
						type: World.rTickEventTypes.triggerExit,
						body1: d,
						body2: triggerBody!
					});
				}
			}
		}

		for (const k of this.kinematics.values()) k.postStep(this.scheduler.tick);
	    for (const dyn of this.dynamics.values()) dyn.postStep(this.scheduler.tick);
	    for (const loc of this.locals.values()) loc.postStep(this.scheduler.tick);

	    // ground check
    	for (const [id, d] of this.dynamics.entries()) {
	    	groundCheck(d, this.octree, this.statics, this.kinematics, this.dynamics);
	    }

	    for (const [id, d] of this.locals.entries()) {
	    	groundCheck(d, this.octree, this.statics, this.kinematics, this.dynamics);
	    }

		return tickEvents;
	}

	addBody (body: Body) {
		switch (body.kind) {
			case "static":
				this.statics.set(body.id, body as StaticBody);
				body.octreeInsert(this.octree);
				break;
			case "kinematic":
				this.kinematics.set(body.id, body as KinematicBody);
				(body as KinematicBody).transformations.scheduler = this.scheduler;
				break;
			case "dynamic":
				this.dynamics.set(body.id, body as DynamicBody);
				(body as DynamicBody).transformations.scheduler = this.scheduler;
				break;
		}
	}

	addController (bodyId: number, controller: Controller) {
		this.controllers.set(bodyId, controller);
	}

	deleteBody (id: number) {
		if (this.kinematics.has(id)) {
			this.kinematics.delete(id);
		}
		if (this.dynamics.has(id)) {
			this.dynamics.delete(id);
		}
		this.controllers.delete(id);
		for (const body of this.dynamics.values()) {
			if (body.supportedBy === id) {
				body.supportedBy = -1;
			}
		}
	}

	addLocalBody (body: DynamicBody) {
		this.locals.set(body.id, body);
	}

	deleteLocalBody (id: number) {
		this.locals.delete(id);
	}

	deleteController (id: number) {
		this.controllers.delete(id);
	}

	getController (id: number): Controller | undefined {
		return this.controllers.get(id);
	}

	get nextBodyId (): number {
		return this.bodyCounter++;
	}

	get nextLocalBodyId (): number {
		return this.localBodyCounter--;
	}

	raycast (from: Vector3, to:Vector3, distance: number = 0): StaticBody | null {
		return null;
	}
}