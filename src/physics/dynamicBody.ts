import Vector3 from "../math/vector3.js"
import AABB from "../math/aabb.js"
import KinematicBody from "./kinematicBody.js"

import { VecPool } from "../utils/pool.js"

export default class DynamicBody extends KinematicBody {
	protected readonly _kind: string = "dynamic";
	protected _scriptMove: boolean = false;
	protected _scriptPos: Vector3 = new Vector3();
	protected _supportedBy: number = -1;
	protected _velocity: Vector3 = new Vector3();
	protected _kinematicBehavior: boolean = false;
	protected _mask: number = 0;

	get supportedBy (): number {
		return this._supportedBy;
	}

	set supportedBy (val: number) {
		this._supportedBy = val;
	}

	get velocity (): Vector3 {
		return this._velocity;
	}

	set velocity (val: Vector3) {
		this.velocity = val;
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

	moveBy (vec: Vector3) {
		this._position.add(vec);
		this._aabb.translate(vec);
	}

	preStep () {
		if (this._kinematicBehavior) {
			super.preStep();
		} else {
			this._sweptAABB.copy(this._aabb).expand(this._velocity);
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