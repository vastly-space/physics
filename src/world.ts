import { Octree } from "./math/octree.js"
import AABB from "./math/aabb.js"
import Vector3 from "./math/vector3.js"
import { divTrunc } from "./math/utils.js"
import StaticBody from "./physics/staticBody.js"
import KinematicBody from "./physics/kinematicBody.js"
import DynamicBody from "./physics/dynamicBody.js"
import Controller from "./controller/controller.js"
import DirectionsTable from "./controller/directionsTable.js"

type Body = StaticBody | KinematicBody | DynamicBody;

export interface WorldOptions {
	worldCubeSize: number;
	movementDirections: number;
	gravity: number;
}

export class World {
	private _tick: number = 0;
	private _gravity: number;
	private bodyCounter: number = 0;
	private statics: Octree;
	private kinematics: Map<number, KinematicBody> = new Map();
	private dynamics: Map<number, DynamicBody> = new Map();
	private controllers: Map<number, Controller> = new Map();

	constructor (options: WorldOptions) {
		const halfSize = divTrunc(options.worldCubeSize, 2);
		this.static = new Octree(new AABB(
			new Vector3(-halfSize, -halfSize, -halfSize),
			new Vector3(halfSize, halfSize, halfSize)
		));
		DirectionsTable.generateDirectionsTable(options.movementDirections);
		this._gravity = options.gravity;
	}

	get tick (): number {
		return this._tick;
	}

	set tick (val: number) {
		this._tick = val;
	}

	get gravity (): number {
		return this._gravity;
	}

	set gravity (val: number) {
		this._gravity = val;
	}

	step () {
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
				// put into octree
				break;
			case "kinematic":
				this.kinematics.set(body.id, body as KinematicBody);
				break;
			case "dynamic":
				this.dynamics.set(body.id, body as DynamicBody);
				this.controllers.set(body.id, new Controller())
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

	get nextBodyId (): number {
		return this.bodyCounter++;
	}
}