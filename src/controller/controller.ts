import Vector3 from '../math/vector3.js'
import { divTrunc } from "../math/utils.js"
import DynamicBody from "../physics/dynamicBody.js"
import DirectionsTable from "./directionsTable.js"

export interface ControllerState {
	forward: boolean;
	backward: boolean;
	left: boolean;
	right: boolean;
}

export class Controller {
	private _body: DynamicBody;
	private _speedMultiplier: number;
	private _state: ControllerState = {
		forward: false,
		backward: false,
		left: false,
		right: false
	}
	private _direction: number = 0;

	constructor (body: DynamicBody, speedMultiplier: number) {
		this._body = body;
		this._speedMultiplier = speedMultiplier;
	}

	get body (): DynamicBody {
		return this._body;
	}

	get state (): ControllerState {
		return this._state;
	}

	set state (val: ControllerState) {
		this._state = val;
		this.updateSpeed();
	}

	get speedMultiplier (): number {
		return this._speedMultiplier;
	}

	set speedMultiplier (val: number) {
		this._speedMultiplier = val;
		this.updateSpeed();
	}

	get direction (): number {
		return this._direction;
	}

	set direction (val: number) {
		this._direction = val;
		this.updateSpeed();
	}

	updateSpeed () {
		const dirLen = DirectionsTable.Directions.length;
		const q90 = dirLen >> 2;
		const q180 = dirLen >> 1;

		const vy = this.body.velocity.y;
		this._body.velocity.set(0, vy, 0);

		const f = (this._state.forward ? 1 : 0) - (this._state.backward ? 1 : 0);
		const r = (this._state.right   ? 1 : 0) - (this._state.left     ? 1 : 0);

		if (f === 0 && r === 0) {
			return;
		}

		let vx = 0, vz = 0;

		if (f !== 0) {
			const dId = f > 0 ? this._direction : DirectionsTable.inverse(this._direction);
			const dr = DirectionsTable.Directions[dId];
			vx += dr.x;
			vz += dr.z;
		}

		if (r !== 0) {
			const dId = r > 0 ? DirectionsTable.right(this._direction) : DirectionsTable.left(this._direction);
			const dr = DirectionsTable.Directions[dId];
			vx += dr.x;
			vz += dr.z;
		}

		// normalize if both active
		if (f !== 0 && r !== 0) {
			vx = Math.trunc((vx * DirectionsTable.INV_SQRT2) / DirectionsTable.FP);
			vz = Math.trunc((vz * DirectionsTable.INV_SQRT2) / DirectionsTable.FP);
		}

		vx = Math.trunc((vx * this._speedMultiplier) / DirectionsTable.FP);
	    vz = Math.trunc((vz * this._speedMultiplier) / DirectionsTable.FP);

	    this._body.velocity.set(vx, vy, vz);
	}
}