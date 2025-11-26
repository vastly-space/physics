import { Octree } from "./math/octree.js"
import AABB from "./math/aabb.js"
import Vector3 from "./math/vector3.js"
import { divTrunc } from "./math/utils.js"
import StaticBody from "./physics/staticBody.js"
import KinematicBody from "./physics/kinematicBody.js"
import DynamicBody from "./physics/dynamicBody.js"
import { Controller } from "./controller/controller.js"
import DirectionsTable from "./controller/directionsTable.js"
import TransformationSystem from "./transformations/transformationSystem.js"

type Body = StaticBody | KinematicBody | DynamicBody;

export interface WorldOptions {
	worldCubeSize: number;
	movementDirections: number;
	gravity: number;
	defaultSpeed: number;
	tickrate: number;
}

export class World {
	private bodyCounter: number = 0;
	private _tick: number = 0;
	private _tickrate: number;
	private _gravity: number;
	private defaultSpeed: number;
	private statics: Map<number, StaticBody> = new Map();
	private octree: Octree;
	private kinematics: Map<number, KinematicBody> = new Map();
	private dynamics: Map<number, DynamicBody> = new Map();
	private controllers: Map<number, Controller> = new Map();
	private transformationSystem: TransformationSystem;

	constructor (options: WorldOptions) {
		const halfSize = divTrunc(options.worldCubeSize, 2);
		this.octree = new Octree(new AABB(
			new Vector3(-halfSize, -halfSize, -halfSize),
			new Vector3(halfSize, halfSize, halfSize)
		));
		DirectionsTable.generateDirectionsTable(options.movementDirections);
		this._gravity = options.gravity;
		this.defaultSpeed = options.defaultSpeed;
		this._tickrate = options.tickrate;
		this.transformationSystem = new TransformationSystem(this._tick, this._tickrate);
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

		for (const [id, d] of this.dynamics.entries()) {
			if (d.supportedBy !== -1) {
				const platform = this.kinematics.get(d.supportedBy) as KinematicBody;
				d.moveBy(platform.motionDelta);
			}

			// collision detection and movement clipping
			d.preStep();
		}

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
	}

	getController (id: number): Controller | undefined {
		return this.controllers.get(id);
	}

	get nextBodyId (): number {
		return this.bodyCounter++;
	}
}