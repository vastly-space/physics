import Vector3 from '../math/vector3.js'
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
		this.body.velocity.set(0, this.body.velocity.y, 0);
		const dirLength = DirectionsTable.Directions.length;
		const indexOffset = Math.round(dirLength/4);

		if (this.state.forward) {
			this.body.velocity.add(DirectionsTable.Directions[this._direction]);
		}
		if (this.state.right) {
			this.body.velocity.add(DirectionsTable.Directions[(this._direction + indexOffset) % dirLength]);
		}
		if (this.state.left) {
			this.body.velocity.add(DirectionsTable.Directions[Math.abs((this._direction - indexOffset) % dirLength)]);
		}
		if (this.state.backward) {
			this.body.velocity.add(DirectionsTable.Directions[(this._direction + 2 * indexOffset) % dirLength]);
		}

		if (this.body.velocity.x !== 0 || this.body.velocity.z !== 0) {
			// normalize speed
			const maxComp = Math.max(this.body.velocity.x, this.body.velocity.y, this.body.velocity.z);
		}
	}
}