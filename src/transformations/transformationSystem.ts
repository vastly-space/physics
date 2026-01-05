import Vector3 from "../math/vector3.js"
import { Transformation } from "./transformation.js"
import type { EndCallback } from "./transformation.js"
import { TICKRATE } from "../constants.js"
import { VecPool } from "../utils/pool.js"
import Scheduler from "../scheduler.js"

export default class TransformationSystem {
	private _scheduler!: Scheduler;
	private bodyPosition: Vector3;
	private transformations: Map<number, Transformation>= new Map();
	private counter: number = 0;

	constructor (originPos: Vector3) {
		this.bodyPosition = originPos;
	}

	add (data: Vector3[], duration: number, endCallback: EndCallback | null = null, relative: boolean = true, loop: boolean = false) {
		const startTick = this._scheduler.tick + 1;
		const endTick = startTick + Math.max(1, Math.round(duration/1000 * TICKRATE));
		const transformationId = this.counter++;

		if (!relative) {
			// recalculate data vectors
			const resData: Vector3[] = [];
			const pos = VecPool.alloc().copy(this.bodyPosition);

			for (const v of data) {
				const diff = new Vector3();
				diff.copy(v).sub(pos);
				resData.push(diff);
				pos.copy(v);
			}

			if (loop) {
				const diff = new Vector3();
				diff.copy(this.bodyPosition).sub(pos);
				resData.push(diff);
			}

			data = resData;
		}

		this.transformations.set(transformationId, new Transformation(data, startTick, endTick, endCallback, loop));

		return transformationId;
	}

	remove (transformationId: number) {
		this.transformations.delete(transformationId);
	}

	clear () {
		this.transformations.clear();
	}

	step (currentTick: number): Vector3 {
		const posVec = VecPool.alloc().copy(this.bodyPosition);
		const ended: Set<number> = new Set();
		const runAfter: EndCallback[] = [];

		for (const [tId, t] of this.transformations) {
			const isOver = t.currentStep(currentTick, posVec);
			if (isOver) {
				if (t.endCallback !== null) runAfter.push(t.endCallback);
				ended.add(tId);
			}
		}

		for (const endedId of ended) {
			this.transformations.delete(endedId);
		}

		for (const cb of runAfter) {
			if (cb !== null) cb();
		}

		return posVec;
	}

	get tick (): number {
		return this._scheduler.tick;
	}

	set scheduler (val: Scheduler) {
		this._scheduler = val;
	}
}