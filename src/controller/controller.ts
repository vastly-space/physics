import Vector3 from '../math/vector3.js'
import { divTrunc } from "../math/utils.js"
import DynamicBody from "../physics/dynamicBody.js"
import { getVelocityFromDir } from "./directionsTable.js"

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
	private _pitchAngle: number = 0;

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

	get pitchAngle (): number {
		return this._pitchAngle;
	}

	set pitchAngle (val: number) {
		this._pitchAngle = val;
		this.updateSpeed();
	}

	updateSpeed () {
	    getVelocityFromDir(this._direction, this._pitchAngle, this._speedMultiplier, this._body.controllerVelocity);
	}
}