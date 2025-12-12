import Vector3 from "../math/vector3.js"
import AABB from "../math/aabb.js"
import KinematicBody from "./kinematicBody.js"

import { VecPool } from "../utils/pool.js"

export default class DynamicBody extends KinematicBody {
	protected readonly _kind: string = "dynamic";
	protected _supportedBy: number = -1;
	protected _groundNormal: Vector3 = new Vector3();
	protected _controllerVelocity: Vector3 = new Vector3();
	protected _environmentalVelocity: Vector3 = new Vector3();
	protected _kinematicBehavior: boolean = false;
	protected _mask: number = 0;
	protected _gravityMultiplier: number = 1;

	get supportedBy (): number {
		return this._supportedBy;
	}

	set supportedBy (val: number) {
		this._supportedBy = val;
		if (val === -1) {
			this._groundNormal.set(0, 0, 0);
		}
	}

	get groundNormal (): Vector3 {
		return this._groundNormal;
	}

	set groundNormal (val: Vector3) {
		this._groundNormal.copy(val);
	}

	get controllerVelocity (): Vector3 {
		return this._controllerVelocity;
	}

	set controllerVelocity (val: Vector3) {
		this._controllerVelocity.copy(val);
	}

	get environmentalVelocity (): Vector3 {
		return this._environmentalVelocity;
	}

	set environmentalVelocity (val: Vector3) {
		this._environmentalVelocity.copy(val);
	}

	get velocity (): Vector3 {
		return (new Vector3()).copy(this._controllerVelocity).add(this._environmentalVelocity);
	}

	get kinematicBehavior (): boolean {
		return this._kinematicBehavior;
	}

	set kinematicBehavior (val: boolean) {
		this._kinematicBehavior = val;

		if (val) {
			this._prevPos.copy(this._position);
		} else {
			this._scriptMove = false;
		}
	}

	get mask (): number {
		return this._mask;
	}

	set mask (val: number) {
		this._mask = val;
	}

	get gravityMultiplier (): number {
		return this._gravityMultiplier;
	}

	set gravityMultiplier (val: number) {
		this._gravityMultiplier = val;
	}

	moveBy (vec: Vector3) {
		this._position.add(vec);
		this._aabb.translate(vec);
	}

	preStep () {
		if (this._kinematicBehavior) {
			super.preStep();
		} else {
			this._sweptAABB.copy(this._aabb).expand(this.velocity);
		}
	}

	postStep (tick: number) {
		if (this._kinematicBehavior) {
			super.postStep(tick);
		} else {
			this._anchorTick = tick;
			this._anchorPos.copy(this._position);
		}
	}

	set position (val: Vector3) {
		const diff = VecPool.alloc().copy(val).sub(this._position);
		this.moveBy(diff);
	}
}