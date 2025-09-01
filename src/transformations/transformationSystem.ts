import Vector3 from "../math/vector3.js"
import { Transformation } from "./transformation.js"
import type { TransformationKind } from "./transformation.js"
import KinematicBody from "../physics/kinematicBody.js"
import DynamicBody from "../physics/dynamicBody.js"

export default class TransformationSystem {
	private _tick: number;
	private tickrate: number;
	private transformations: Map<number, Transformation[]> = new Map();

	constructor (currentTick: number, tickrate: number) {
		this._tick = currentTick;
		this.tickrate = tickrate;
	}

	addTransformation (bodyId: number, kind: TransformationKind, data: Vector3 | Vector3[], duration: number) {
		if (!this.transformations.has(bodyId)) {
			this.transformations.set(bodyId, []);
		}

		const tr = this.transformations.get(bodyId);
		const startTick = this._tick + 1;
		const endTick = startTick + Math.max(1, Math.round(duration/1000 * this.tickrate));

	}

	clearTransformationsForBody (bodyId: number) {
		this.transformations.delete(bodyId);
	}

	step (currentTick: number, kinematics: Map<number, KinematicBody>, dynamics: Map<number, DynamicBody>) {
		const toDelete: Set<number> = new Set();

		const posVec = new Vector3();
		const ended: Set<Transformation> = new Set();

		for (const [id, tArr] of this.transformations) {
			posVec.set(0, 0, 0);
			ended.clear();

			let body: KinematicBody | DynamicBody | undefined = kinematics.get(id);
			if (!body) body = dynamics.get(id);

			let skip = body === undefined || (body instanceof DynamicBody && !(body as DynamicBody).kinematicBehavior);

			if (!skip) {
				for (const t of tArr) {
					const isOver = t.currentStep(currentTick, posVec);
					if (isOver) {
						ended.add(t);
					}
				}

				body!.scriptPos.copy(posVec);
			} else {
				toDelete.add(id);
			}
		}

		for (const id of toDelete) {
			this.transformations.delete(id);
		}
	}

	set tick (val: number) {
		this._tick = val;
	}
}