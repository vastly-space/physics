import Vector3 from "../math/vector3.js"
import { divTrunc } from "../math/utils.js"

export type TransformationKind = 'pose' | 'steer' | 'poseSequence' | 'steerSequence';

export interface ActionData {
	duration: number;
	startTick: number;
	step: Vector3;
	remaining: Vector3;
	error_phase: Vector3;
}

export class Transformation {
	private _startTick: number;
	private _endTick: number;
	public readonly kind: TransformationKind;
	private actionData: ActionData | ActionData[];
	private currentAction: number = 0;

	constructor (kind: TransformationKind, data: Vector3 | Vector3[], currentTick: number, startTick: number, endTick: number) {
		this._startTick = startTick;
		this._endTick = endTick;
		this.kind = kind;

		switch (this.kind) {
			case "pose":
			case "steer":
				const tickDuration = endTick - startTick;
				this.actionData = buildAction(data as Vector3, startTick, tickDuration);
				break;
			case "poseSequence":
			case "steerSequence":
				const totalTicks = endTick - startTick;
				const vectors = data as Vector3[];
				const lengths = vectors.map(v => { return Math.floor(Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z)); });
				const totalLength = lengths.reduce((acc, val) => acc + val, 0);
				
				const base = lengths.map(l => Math.floor(totalTicks * l/totalLength));
				const remNum = base.map((b, index) => totalTicks * lengths[index] - base[index] * totalLength);
				let e = 0;
				const segTicks: number[] = [];

				for (let i=0; i<base.length; i++) {
					e += remNum[i];
					segTicks[i] = base[i];
					if (e >= totalLength) {
						e -= totalLength;
						segTicks[i] += 1;
					}
				}

				const result: ActionData[] = [];
				let tickOffset = this._startTick;

				for (let i=0; i<vectors.length; i++) {
					result.push(Transformation.buildAction(vectors[i], tickOffset, segTicks[i]));
					tickOffset += base[i];
				}

				break;
		}
	}

	get startTick (): number {
		return this._startTick;
	}

	get endTick (): number {
		return this._endTick;
	}

	currentStep (tick: number, out: Vector3): boolean {
		switch (this.kind) {
			case "pose":
			case "steer":
				const action = this.actionData as ActionData;

				if (action.duration === 0 && action.startTick === tick) {
					out.set(
						out.x + action.step.x,
						out.y + action.step.y,
						out.z + action.step.z
					);
					return true;
				}

				if (action.startTick + action.duration <= tick) {
					return true;
				} else {
					const k = tick - action.startTick;
					out.set(
						out.x + action.step.x + Transformation.calcExtra(action.error_phase.x, k, action.remaining.x, action.duration),
						out.y + action.step.y + Transformation.calcExtra(action.error_phase.y, k, action.remaining.y, action.duration),
						out.z + action.step.z + Transformation.calcExtra(action.error_phase.z, k, action.remaining.z, action.duration)
					);
					return false;
				}
				break;
			case "poseSequence":
			case "steerSequence":
				// for client, unshift all actions that already passed
				const data = this.actionData as ActionData[];
				let action = data[this.currentAction];

				while (action.startTick + action.duration <= tick) {
					this.currentAction++;
					if (this.currentAction === data.length) return false;
					else action = data[this.currentAction];
				}

				// now we know our current action
				if (action.startTick + action.duration <= tick) {
					return true;
				} else {
					const k = tick - action.startTick;
					out.set(
						out.x + action.step.x + Transformation.calcExtra(action.error_phase.x, k, action.remaining.x, action.duration),
						out.y + action.step.y + Transformation.calcExtra(action.error_phase.y, k, action.remaining.y, action.duration),
						out.z + action.step.z + Transformation.calcExtra(action.error_phase.z, k, action.remaining.z, action.duration)
					);
					return false;
				}
				break;
		}
	}

	private static buildAction (vec: Vector3, startTick: number, duration: number): ActionData {
		if (duration === 0) {
			return {
				duration: duration,
				startTick: startTick,
				step: vec,
				remaining: vec,
				error_phase: new Vector3()
			}
		}

		const step = new Vector3(
			divTrunc(vec.x, duration),
			divTrunc(vec.y, duration),
			divTrunc(vec.z, duration)
		);
		const remaining = new Vector3(
			Math.abs(vec.x) - step.x * duration,
			Math.abs(vec.y) - step.y * duration,
			Math.abs(vec.z) - step.z * duration
		);

		return {
			duration: duration,
			startTick: startTick,
			step: step,
			remaining: remaining,
			error_phase: new Vector3()
		}
	}

	private static calcExtra(phase0: number, k: number, r: number, N: number) {
		return Math.floor((phase0 + (k + 1) * r) / N) - Math.floor((phase0 + k * r) / N);
	}
}