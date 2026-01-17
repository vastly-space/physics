import Vector3 from "../math/vector3.js"
import { divTrunc } from "../math/utils.js"

export type EndCallback = () => void;

export interface ActionData {
	duration: number;
	startTick: number;
	step: number[];
	remainder: number[];
	error: number[];
}

export class Transformation {
	private _loop: boolean;
	private _startTick: number;
	private _endTick: number;
	private actionData: ActionData[] = [];
	private currentAction: number = 0;
	private currentTick: number;
	public endCallback: EndCallback | null;

	constructor (data: Vector3[], startTick: number, endTick: number, endCallback: EndCallback | null, loop: boolean) {
		this._startTick = startTick;
		this.currentTick = startTick;
		this._endTick = endTick;
		this.endCallback = endCallback;
		this._loop = loop;

		const duration = endTick - startTick;
		const lengths = data.map(v => v.length());
		const totalLength = lengths.reduce((acc, val) => acc + val, 0);
		const times = lengths.map(l => Math.floor((l * duration) / totalLength));
		const remainder = duration - times.reduce((acc, val) => acc + val, 0);

		if (remainder > 0) {
			const delta = (remainder + 1)/(duration + 1);
			let error = 0;

			for (let i=0; i<times.length; i++) {
				error += times[i] * delta;

				if (error >= 1) {
					let diff = error - 1;
					error = error - diff;
					times[i] += 1;
				}
			}
		}

		let tick = startTick;
		for (let i=0; i<data.length; i++) {
			this.actionData.push(Transformation.buildAction(data[i], tick, times[i] as number));
			tick += times[i] as number;
		}
	}

	get startTick (): number {
		return this._startTick;
	}

	get endTick (): number {
		return this._endTick;
	}

	get loop (): boolean {
		return this._loop;
	}

	currentStep (dstTick: number, out: Vector3): boolean {
		while (this.currentTick <= dstTick) {
			this.currentTick++;

			const action = this.actionData[this.currentAction];

			if (action.startTick > this.currentTick) continue;

			if (action.duration === 0 && action.startTick === this.currentTick) {
				out.set(
					out.x + action.step[0],
					out.y + action.step[1],
					out.z + action.step[2]
				);
				this.currentAction++;
			} else {
				out.set(
					out.x + action.step[0] + Transformation.calcExtra(0, action),
					out.y + action.step[1] + Transformation.calcExtra(1, action),
					out.z + action.step[2] + Transformation.calcExtra(2, action)
				);

				if (this.currentTick === action.startTick + action.duration) {
					this.currentAction++;
				}
			}
		}

		if (this.currentAction === this.actionData.length) {
			if (this.loop) {
				this.rewind();
			} else {
				return true;
			}
		}

		return false;
	}

	rewind () {
		this.currentAction = 0;

		let tick = this.currentTick;

		for (let i=0; i<this.actionData.length; i++) {
			this.actionData[i].startTick = tick;
			this.actionData[i].error[0] = 0;
			this.actionData[i].error[1] = 0;
			this.actionData[i].error[2] = 0;
			tick += this.actionData[i].duration;
		}
	}

	private static buildAction (vec: Vector3, startTick: number, duration: number): ActionData {
		if (duration === 0) {
			return {
				duration: duration,
				startTick: startTick,
				step: [vec.x, vec.y, vec.z],
				remainder: [0,0,0],
				error: [0,0,0]
			}
		}

		const step = [
			divTrunc(vec.x, duration),
			divTrunc(vec.y, duration),
			divTrunc(vec.z, duration)
		];
		const remainder = [
			vec.x - step[0] * duration,
			vec.y - step[1] * duration,
			vec.z - step[2] * duration
		];

		return {
			duration: duration,
			startTick: startTick,
			step: step,
			remainder: remainder,
			error: [0,0,0]
		}
	}

	private static calcExtra (index: number, action: ActionData): number {
		if (action.remainder[index] === 0) return 0;

		action.error[index] += Math.abs(action.remainder[index]) + 1;

		if (action.error[index] >= action.duration + 1) {
			action.error[index] -= action.duration + 1;
			return Math.sign(action.remainder[index]);
		} else {
			return 0;
		}
	}
}