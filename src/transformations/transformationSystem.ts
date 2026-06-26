import Vector3 from "../math/vector3.js"
import Quaternion from "../math/quaternion.js"
import { Transformation } from "./transformation.js"
import { VecPool } from "../utils/pool.js"
import Scheduler from "../scheduler.js"

export interface ActionData {
	duration: number;
	startTick: number;
	step: number[];
	remainder: number[];
	error: number[];
}

export interface RotationData {
	endTick: number;
	startTick: number;
	startQ: Quaternion;
	endQ: Quaternion;
}

export type EndCallback = () => void;

export default class TransformationSystem {
	private _scheduler!: Scheduler;
	private body: any;
	private transformations: Map<number, Transformation>= new Map();
	private rotation?: RotationData;
	private rotationCallback: EndCallback | null = null;
	private counter: number = 0;
	public TICKRATE: number = 20;

	constructor (targetBody: any) {
		this.body = targetBody;
	}

	add (data: Vector3[], duration: number, endCallback: EndCallback | null = null, relative: boolean = true, loop: boolean = false) {
		const startTick = this._scheduler.tick + 1;
		const endTick = startTick + Math.max(1, Math.round(duration/1000 * this.TICKRATE));
		const transformationId = this.counter++;

		if (!relative) {
			// recalculate data vectors
			const resData: Vector3[] = [];
			const pos = VecPool.alloc().copy(this.body.position);

			for (const v of data) {
				const diff = new Vector3();
				diff.copy(v).sub(pos);
				resData.push(diff);
				pos.copy(v);
			}

			if (loop) {
				const diff = new Vector3();
				diff.copy(this.body.position).sub(pos);
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

	rotateBy (q: Quaternion, duration: number, endCallback: EndCallback | null = null) {
		if (this.rotationCallback !== null) this.rotationCallback();

		const startTick = this._scheduler.tick + 1;
		const endTick = startTick + Math.max(1, Math.round(duration/1000 * this.TICKRATE));
		const startQ = this.body.quaternion;
		const endQ = startQ.clone().multiply(q);

		this.rotation = {
			startTick,
			endTick,
			startQ,
			endQ
		};
		this.rotationCallback = endCallback;
	}

	step (currentTick: number) {
		const posVec = VecPool.alloc().copy(this.body.position);
		const ended: Set<number> = new Set();
		const runAfter: EndCallback[] = [];

		if (this.rotation !== undefined) {
			if (this.rotation.endTick === currentTick) {
				this.body.setQuaternion(this.rotation.endQ);
				if (this.rotationCallback !== null) runAfter.push(this.rotationCallback);
				this.rotationCallback = null;
				this.rotation = undefined;
			} else {
				const q = new Quaternion();
				q.copy(this.rotation.startQ);
				q.slerp(this.rotation.endQ, (currentTick - this.rotation.startTick)/(this.rotation.endTick - this.rotation.startTick));
				this.body.setQuaternion(q);
			}

			this.body.dirty = true;
		}

		let modified = false;

		for (const [tId, t] of this.transformations.entries()) {
			modified = true;
			const isOver = t.currentStep(currentTick, posVec);
			if (isOver) {
				if (t.endCallback !== null) runAfter.push(t.endCallback);
				ended.add(tId);
			}
		}

		for (const endedId of ended) {
			this.transformations.delete(endedId);
		}

		if (modified) this.body.scriptPos = posVec;

		for (const cb of runAfter) {
			if (cb !== null) cb();
		}
	}

	get tick (): number {
		return this._scheduler.tick;
	}

	set scheduler (val: Scheduler) {
		this._scheduler = val;
	}
}