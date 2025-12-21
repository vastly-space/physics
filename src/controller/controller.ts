import Vector3 from '../math/vector3.js'
import { divTrunc } from "../math/utils.js"
import DynamicBody from "../physics/dynamicBody.js"
import { getVelocityFromDir } from "./directionsTable.js"
import { GLOBAL_SPEED } from "../constants.js"

export interface ControllerState {
	forward: boolean;
	backward: boolean;
	left: boolean;
	right: boolean;
}

export class Controller {
	private _body: DynamicBody;
	private _speedMultiplier: number = 1;
	private _state: ControllerState = {
		forward: false,
		backward: false,
		left: false,
		right: false
	}
	private _direction: number = 0;
	private _pitchAngle: number = 0;

	constructor (body: DynamicBody) {
		this._body = body;
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

	get pitchAngle (): number {
		return this._pitchAngle;
	}

	set pitchAngle (val: number) {
		this._pitchAngle = val;
		this.updateSpeed();
	}

	private getRotationAngle () {
		let result = 0;

		let fm = Number(this._state.forward) - Number(this._state.backward);
		let lm = Number(this._state.left) - Number(this._state.right);

		if (fm != 0) {
			if (fm < 0) {
				result -= 180;
				if (lm != 0) result -= 45 * lm;
			} else {
				if (lm != 0) result += 45 * lm;
			}
		} else {
			if (lm != 0) result += 90 * lm;
		}

		return result;
	}

	updateSpeed () {
		if (this._state.forward || this._state.backward || this._state.left || this._state.right) {
			let dir = {
				direction: this._direction,
				rotationAngle: this.getRotationAngle()
			}

	    	getVelocityFromDir(dir, this._pitchAngle, GLOBAL_SPEED * this._speedMultiplier, this._body.controllerVelocity);
	    } else {
	    	this._body.controllerVelocity.set(0,0,0);
	    }
	}
}