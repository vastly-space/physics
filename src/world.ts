import { Octree } from "./math/octree.js"
import AABB from "./math/aabb.js"
import Vector3 from "./math/vector3.js"
import { divTrunc } from "./math/utils.js"
import StaticBody from "./physics/staticBody.js"
import KinematicBody from "./physics/kinematicBody.js"
import DynamicBody from "./physics/dynamicBody.js"
import { Controller } from "./controller/controller.js"
import TransformationSystem from "./transformations/transformationSystem.js"
import { solve } from "./solver.js"
import { ReliableChannel } from "./channels/reliableChannel.js"
import SyncChannel from "./channels/syncChannel.js"
import { VecPool } from "./utils/pool.js"

type Body = StaticBody | KinematicBody | DynamicBody;

export interface WorldOptions {
	worldCubeSize: number;
	gravity: number;
	defaultSpeed: number;
	tickrate: number;
	serverMode: boolean;
	maxDownSpeed: number;
}

export class World {
	private bodyCounter: number = 0;
	private _tick: number = 0;
	private _tickrate: number;
	private _gravity: number;
	private maxDownSpeed: number;
	private defaultSpeed: number;
	private statics: Map<number, StaticBody> = new Map();
	private octree: Octree;
	private kinematics: Map<number, KinematicBody> = new Map();
	private dynamics: Map<number, DynamicBody> = new Map();
	private controllers: Map<number, Controller> = new Map();
	private transformationSystem: TransformationSystem;
	private serverMode: boolean;
	public reliableChannel: ReliableChannel = new ReliableChannel();
	public syncChannel: SyncChannel = new SyncChannel();

	constructor (options: WorldOptions) {
		const halfSize = divTrunc(options.worldCubeSize, 2);
		this.octree = new Octree(new AABB(
			new Vector3(-halfSize, -halfSize, -halfSize),
			new Vector3(halfSize, halfSize, halfSize)
		));
		this._gravity = options.gravity;
		this.maxDownSpeed = options.maxDownSpeed;
		this.defaultSpeed = options.defaultSpeed;
		this._tickrate = options.tickrate;
		this.transformationSystem = new TransformationSystem(this._tick, this._tickrate);
		this.serverMode = options.serverMode;
	}

	get tick (): number {
		return this._tick;
	}

	set tick (val: number) {
		this._tick = val;
	}

	get tickrate (): number {
		return this._tickrate;
	}

	get gravity (): number {
		return this._gravity;
	}

	set gravity (val: number) {
		this._gravity = val;
	}

	step () {
		this._tick++;

		this.transformationSystem.step(this._tick, this.kinematics, this.dynamics);

		for (const [id, k] of this.kinematics.entries()) {
			k.preStep();
		}

		let deps: Record<number, number> = {};

		for (const [id, d] of this.dynamics.entries()) {
			let envVelocity = VecPool.alloc().set(0, 0, 0);
			// update environmental speed
			if (!d.kinematicBehavior) {
				if (d.supportedBy !== -1) {
					// we have a platform that carries body
					if (this.kinematics.has(d.supportedBy)) {
						envVelocity.add(this.kinematics.get(d.supportedBy)!.motionDelta);
					} else if (this.dynamics.has(d.supportedBy)) {
						deps[id] = d.supportedBy;
					}
				} else {
					envVelocity.y = d.environmentalVelocity.y - this._gravity;

					if (envVelocity.y < this.maxDownSpeed) envVelocity.y = this.maxDownSpeed;
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

		const tickEvents = solve(this.octree, this.statics, this.kinematics, this.dynamics);

		this.reliableChannel.flush(tickEvents);

		for (const k of this.kinematics.values()) k.postStep(this.tick);
	    for (const dyn of this.dynamics.values()) dyn.postStep(this.tick);

	    this.tick++;
	}

	addBody (body: Body) {
		switch (body.kind) {
			case "static":
				this.statics.set(body.id, body as StaticBody);
				body.octreeInsert(this.octree);
				break;
			case "kinematic":
				this.kinematics.set(body.id, body as KinematicBody);
				break;
			case "dynamic":
				this.dynamics.set(body.id, body as DynamicBody);
				this.controllers.set(body.id, new Controller(body as DynamicBody, this.defaultSpeed));
				break;
		}
	}

	deleteBody (id: number) {
		if (this.kinematics.has(id)) this.kinematics.delete(id);
		if (this.dynamics.has(id)) {
			this.dynamics.delete(id);
			this.controllers.delete(id);
		}
		for (const body of this.dynamics.values()) {
			if (body.supportedBy === id) {
				body.supportedBy = -1;
			}
		}
		this.transformationSystem.clearTransformationsForBody(id);
	}

	getController (id: number): Controller | undefined {
		return this.controllers.get(id);
	}

	get nextBodyId (): number {
		return this.bodyCounter++;
	}
}