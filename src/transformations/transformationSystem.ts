import Vector3 from "../math/vector3.js"
import Transformation from "./transformation.js"

export class TransformationSystem {
	private _tick: number;
	private tickrate: number;
	private transformations: Map<number, Transformation[]> = new Map();

	constructor (currentTick: number, tickrate: number) {
		this._tick = currentTick;
		this.tickrate = tickrate;
	}

	addTransformation (bodyId: number, kind: TransfomationKind, data: Vector3 | Vector3[], duration: number) {
		if (!this.transformations.has(bodyId)) {
			this.transformations.set(bodyId, {
				poseTransformations: [],
				steerTransformations: []
			});
		}

		const tr = this.transformations.get(bodyId);
		const startTick = this._tick + 1;
		const endTick = startTick + Math.max(1, Math.round(duration/1000 * this.tickrate));

	}

	clearTransformationsForBody (bodyId: number) {

	}

	step (currentTick: number, kinematics: Map<number, KinematicBody>, dynamics: Map<number, DynamicBody>) {

	}

	set tick (val: number) {
		this._tick = val;
	}
}