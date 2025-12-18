import Vector3 from "../math/vector3.js"
import { Transformation } from "./transformation.js"
import type { TransformationKind } from "./transformation.js"
import KinematicBody from "../physics/kinematicBody.js"
import DynamicBody from "../physics/dynamicBody.js"
import { TICKRATE } from "../constants.js"

export default class TransformationSystem {
	private _tick: number;
	private transformations: Map<number, { counter: number; transformations: Map<number, Transformation> }> = new Map();

	constructor (currentTick: number) {
		this._tick = currentTick;
	}

	addTransformation (bodyId: number, kind: TransformationKind, data: Vector3 | Vector3[], duration: number): number {
		if (!this.transformations.has(bodyId)) {
			this.transformations.set(bodyId, { counter: 0, transformations: new Map() });
		}

		const tr = this.transformations.get(bodyId);
		const startTick = this._tick + 1;
		const endTick = startTick + Math.max(1, Math.round(duration/1000 * TICKRATE));
		const transformationId = tr!.counter++;
		tr!.transformations.set(transformationId, new Transformation(kind, data, this._tick, startTick, endTick));

		return transformationId;
	}

	removeTransformation (bodyId: number, transformationId: number) {
		const tr = this.transformations.get(bodyId);

		if (tr !== undefined) {
			tr.transformations.delete(transformationId);
		}
	}

	clearTransformationsForBody (bodyId: number) {
		this.transformations.delete(bodyId);
	}

	step (currentTick: number, kinematics: Map<number, KinematicBody>, dynamics: Map<number, DynamicBody>) {
		const toDelete: Set<number> = new Set();

		const posVec = new Vector3();
		const ended: Set<number> = new Set();

		for (const [bodyId, container] of this.transformations) {
			posVec.set(0, 0, 0);
			ended.clear();

			let body: KinematicBody | DynamicBody | undefined = kinematics.get(bodyId);
			if (!body) body = dynamics.get(bodyId);

			let skip = body === undefined || (body instanceof DynamicBody && !(body as DynamicBody).kinematicBehavior);

			if (!skip) {
				for (const [tId, t] of container.transformations) {
					const isOver = t.currentStep(currentTick, posVec);
					if (isOver) {
						ended.add(tId);
					}
				}

				for (const endedId of ended) {
					container.transformations.delete(endedId);
				}
				body!.scriptPos.copy(posVec);
			} else {
				toDelete.add(bodyId);
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