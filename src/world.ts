import { Octree } from "./math/octree.js"
import AABB from "./math/aabb.js"
import Vector3 from "./math/vector3.js"
import { divTrunc } from "./math/utils.js"
import StaticBody from "./physics/staticBody.js"
import KinematicBody from "./physics/kinematicBody.js"
import DynamicBody from "./physics/dynamicBody.js"
import Solver from "./solver.js"
import type { SolveResult } from "./solver.js"
import { VecPool } from "./utils/pool.js"
import Scheduler from "./scheduler.js"
import DirectionsTable from "./controller/directionsTable.js"
import Constants from "./constants.js"

import PacketProcessor from "./network/packetProcessor.js"
import type { InitialPacket } from "./network/packetProcessor.js"
import SnapshotBuffer from "./network/snapshotBuffer.js"
import type { Snapshot } from "./network/snapshotBuffer.js"

const MaxWorldBox = 2147483647 * 2;

export interface WorldOptions {
	worldCubeSize?: number;
	tick: number;
	constants?: Constants;
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

	public constants: Constants = new Constants();
	private solver: Solver;
	private bodyCounter: number = 0;
	private localBodyCounter: number = -1;
	private statics: Map<number, StaticBody> = new Map();
	private octree: Octree;
	private kinematics: Map<number, KinematicBody> = new Map();
	private dynamics: Map<number, DynamicBody> = new Map();
	private locals: Map<number, DynamicBody> = new Map();
	public scheduler: Scheduler;
	public snapshotBuffer: SnapshotBuffer = new SnapshotBuffer();

	constructor (options: WorldOptions) {
		if (options.constants !== undefined) this.constants = options.constants;

		this.solver = new Solver(this.constants);

		if (options.worldCubeSize !== undefined && options.worldCubeSize > MaxWorldBox) throw new Error("World cube size extending the limit");

		const halfSize = divTrunc(options.worldCubeSize || MaxWorldBox, 2);
		this.octree = new Octree(new AABB(
			new Vector3(-halfSize, -halfSize, -halfSize),
			new Vector3(halfSize, halfSize, halfSize)
		));

		this.scheduler = new Scheduler(this.constants, options.tick);

		if (this.constants.WORLD_MODE === "client") {
			this.snapshotBuffer.onSnapshot = this.processSnapshot.bind(this);
			this.snapshotBuffer.onServerTick = this.processServerTick.bind(this);
		}
	}

	get tick (): number {
		return this.scheduler.tick;
	}

	set tick (val: number) {
		this.scheduler.tick = val;
	}

	private applyEnvVelocity () {
		let deps: Record<number, number> = {};

		for (const [id, d] of this.dynamics.entries()) {
			let envVelocity = VecPool.alloc().set(0, 0, 0);
			// update environmental speed
			d.transformations.step(this.scheduler.tick);
			if (!d.kinematicBehavior) {
				if (d.supportedBy !== -1) {
					// we have a platform that carries body
					if (this.kinematics.has(d.supportedBy)) {
						envVelocity.addScaled(this.kinematics.get(d.supportedBy)!.motionDelta, 1000/this.constants.TICKRATE);
					} else if (this.dynamics.has(d.supportedBy)) {
						deps[id] = d.supportedBy;
					}
				} else {
					if (d.gravityMultiplier !== 0) {
						envVelocity.y = d.environmentalVelocity.y - (((this.constants.GLOBAL_GRAVITY/this.constants.TICKRATE) * (d.gravityMultiplier/255)) | 0);

						if (envVelocity.y < this.constants.MAX_DOWN_SPEED) envVelocity.y = this.constants.MAX_DOWN_SPEED;
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

		for (const [id, d] of this.dynamics.entries()) {
			d.preStep();
		}

		// Local bodies

		for (const [id, d] of this.locals.entries()) {
			let envVelocity = VecPool.alloc().set(0, 0, 0);
			// update environmental speed
			d.transformations.step(this.scheduler.tick);
			if (!d.kinematicBehavior) {
				if (d.supportedBy !== -1) {
					// we have a platform that carries body
					if (this.kinematics.has(d.supportedBy)) {
						envVelocity.addScaled(this.kinematics.get(d.supportedBy)!.motionDelta, 1000/this.constants.TICKRATE);
					} else if (this.dynamics.has(d.supportedBy)) {
						envVelocity.add(d.velocity);
					}
				} else {
					if (d.gravityMultiplier !== 0) {
						envVelocity.y = d.environmentalVelocity.y - (((this.constants.GLOBAL_GRAVITY/this.constants.TICKRATE) * (d.gravityMultiplier/255)) | 0);

						if (envVelocity.y < this.constants.MAX_DOWN_SPEED) envVelocity.y = this.constants.MAX_DOWN_SPEED;
					}
				}
			}

			d.environmentalVelocity = envVelocity;
			d.preStep();
		}
	}

	private solveDynamicBody (body: DynamicBody): TickEvent[] {
		const result:TickEvent[] = [];

		body.preStep();

		const tickResult = this.solver.solve(body, this.octree, this.statics, this.kinematics, this.dynamics);

		body.position = tickResult.desiredPosition;

		const prevTriggers = new Set(body.triggerIntersections);
		body.triggerIntersections.clear();

		for (const ev of tickResult.events) {
			if (ev.trigger) {
				if (!prevTriggers.has(ev.body2.id)) {
					result.push({
						type: World.rTickEventTypes.triggerEnter,
						body1: ev.body1,
						body2: ev.body2
					});
				} else {
					prevTriggers.delete(ev.body2.id);
				}
				body.triggerIntersections.add(ev.body2.id);
			} else {
				result.push({
					type: World.rTickEventTypes.collide,
					body1: ev.body1,
					body2: ev.body2
				});
			}
		}

		for (const id of prevTriggers) {
			const triggerBody = this.statics.get(id) || this.kinematics.get(id);

			if (triggerBody !== undefined) {
				result.push({
					type: World.rTickEventTypes.triggerExit,
					body1: body,
					body2: triggerBody!
				});
			}
		}

		return result;
	}

	private moveBySnapshot (body: KinematicBody | DynamicBody) {
		const anchor = body.getNextAnchor(this.scheduler.tick);
		const pos = VecPool.alloc();
		if (anchor === null || this.scheduler.tick > anchor.tick + this.constants.MAX_INTERPOLATION_TICKS) {
			// do nothing
			pos.copy(body.position);
		} else if (this.scheduler.tick > anchor.tick) {
			// extrapolate
			pos.copy(anchor.pos).addScaled(body.anchorVelocity, this.scheduler.tick - anchor.tick);
		} else {
			// interpolate
			const factor = (this.scheduler.tick - body.prevTick)/(anchor.tick - body.prevTick);
			pos.set(
				(body.prevPos.x + (anchor.pos.x - body.prevPos.x) * factor) | 0,
				(body.prevPos.y + (anchor.pos.y - body.prevPos.y) * factor) | 0,
				(body.prevPos.z + (anchor.pos.z - body.prevPos.z) * factor) | 0
			);
		}
		body.position = pos;
	}

	step (): TickEvent[] {
		for (const [id, k] of this.kinematics.entries()) {
			if (k.mode === "SNAPSHOT") {
				k.transformations.step(this.scheduler.tick);
				this.moveBySnapshot(k);
			} else {
				k.transformations.step(this.scheduler.tick);
				k.preStep();
			}
		}

		this.applyEnvVelocity();

		let tickEvents: TickEvent[] = [];

		for (const [id, d] of this.dynamics.entries()) {
			if (d.mode === "SNAPSHOT") {
				this.moveBySnapshot(d);
			} else {
				tickEvents = tickEvents.concat(this.solveDynamicBody(d));
			}
		}

		for (const [id, d] of this.locals.entries()) {
			tickEvents = tickEvents.concat(this.solveDynamicBody(d));
		}

		for (const k of this.kinematics.values()) k.postStep(this.scheduler.tick);
	    for (const dyn of this.dynamics.values()) dyn.postStep(this.scheduler.tick);
	    for (const loc of this.locals.values()) loc.postStep(this.scheduler.tick);

	    // ground check
    	for (const [id, d] of this.dynamics.entries()) {
	    	this.solver.groundCheck(d, this.octree, this.statics, this.kinematics, this.dynamics);
	    }

	    for (const [id, d] of this.locals.entries()) {
	    	this.solver.groundCheck(d, this.octree, this.statics, this.kinematics, this.dynamics);
	    }

	    this.clampCoordinates();

		return tickEvents;
	}

	clampCoordinates () {
		for (const [id, k] of this.kinematics.entries()) {
			const kPos = k.position;

			if (kPos.x > MaxWorldBox || kPos.x < -MaxWorldBox ||
				kPos.y > MaxWorldBox || kPos.y < -MaxWorldBox ||
				kPos.z > MaxWorldBox || kPos.z < -MaxWorldBox) {

				kPos.x = Math.min(MaxWorldBox, Math.max(-MaxWorldBox, kPos.x));
				kPos.y = Math.min(MaxWorldBox, Math.max(-MaxWorldBox, kPos.y));
				kPos.z = Math.min(MaxWorldBox, Math.max(-MaxWorldBox, kPos.z));

				k.position = kPos;
			}
		}

		for (const [id, d] of this.dynamics.entries()) {
			const dPos = d.position;

			if (dPos.x > MaxWorldBox || dPos.x < -MaxWorldBox ||
				dPos.y > MaxWorldBox || dPos.y < -MaxWorldBox ||
				dPos.z > MaxWorldBox || dPos.z < -MaxWorldBox) {

				dPos.x = Math.min(MaxWorldBox, Math.max(-MaxWorldBox, dPos.x));
				dPos.y = Math.min(MaxWorldBox, Math.max(-MaxWorldBox, dPos.y));
				dPos.z = Math.min(MaxWorldBox, Math.max(-MaxWorldBox, dPos.z));

				d.position = dPos;
			}
		}

		for (const [id, d] of this.locals.entries()) {
			const dPos = d.position;

			if (dPos.x > MaxWorldBox || dPos.x < -MaxWorldBox ||
				dPos.y > MaxWorldBox || dPos.y < -MaxWorldBox ||
				dPos.z > MaxWorldBox || dPos.z < -MaxWorldBox) {

				dPos.x = Math.min(MaxWorldBox, Math.max(-MaxWorldBox, dPos.x));
				dPos.y = Math.min(MaxWorldBox, Math.max(-MaxWorldBox, dPos.y));
				dPos.z = Math.min(MaxWorldBox, Math.max(-MaxWorldBox, dPos.z));

				d.position = dPos;
			}
		}
	}

	addBody (body: Body) {
		body.setConstants(this.constants);

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

		body.anchorTick = this.scheduler.tick;
		body.prevTick = this.scheduler.tick;
	}

	deleteBody (id: number) {
		if (this.kinematics.has(id)) {
			this.kinematics.delete(id);
		}
		if (this.dynamics.has(id)) {
			this.dynamics.delete(id);
		}
		for (const body of this.dynamics.values()) {
			if (body.supportedBy === id) {
				body.supportedBy = -1;
			}
		}
	}

	addLocalBody (body: DynamicBody) {
		body.setConstants(this.constants);
		this.locals.set(body.id, body);
	}

	deleteLocalBody (id: number) {
		this.locals.delete(id);
	}

	getBody (id: number): Body | null {
		return this.statics.get(id) || this.kinematics.get(id) || this.dynamics.get(id) || null;
	}

	getBodies (): Record<number, Body> {
		const result: Record<number, Body> = {};

		for (const [id, b] of this.statics.entries()) {
			result[id] = b;
		}

		for (const [id, b] of this.kinematics.entries()) {
			result[id] = b;
		}

		for (const [id, b] of this.dynamics.entries()) {
			result[id] = b;
		}

		return result;
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

	get snapshot (): Uint8Array[] {
		return PacketProcessor.serializeSnapshot(this.tick, this.kinematics, this.dynamics);
	}

	get initialPacket (): Uint8Array {
		return PacketProcessor.serializeInitialPacket(this.constants, this.tick, this.statics, this.kinematics, this.dynamics);
	}

	processSnapshot (snapshot: Snapshot) {
		for (const [id, state] of snapshot.bodies.entries()) {
			const b = this.kinematics.get(id) || this.dynamics.get(id);

			if (b === undefined) continue;

			b.applySnapshot(
				snapshot.tick,
				new Vector3(state.position[0], state.position[1], state.position[2]),
				new Vector3(state.velocity[0], state.velocity[1], state.velocity[2])
			);
		}

		this.scheduler.snapshotReceived = true;
	}

	processServerTick (tick: number) {
		this.scheduler.adjustSpeed(tick);
	}

	generateDirectionsTable () {
		return new DirectionsTable(this.constants);
	}

	static buildFromInitialPacket (raw: Uint8Array): World {
		const packet = PacketProcessor.deserializeInitialPacket(raw);

		const result = new World({ tick: packet.tick, constants: packet.constants });

		for (const body of packet.bodies) {
			body.mode = "SNAPSHOT";
			if (body.kind === "dynamic") {
				(body as DynamicBody).kinematicBehavior = true;
			}
			result.addBody(body);
		}

		return result;
	}
}