import Vector3 from "../math/vector3.js"
import AABB from "../math/aabb.js"
import StaticBody from "./staticBody.js"

import { VecPool } from "../utils/pool.js"

import TransformationSystem from "../transformations/transformationSystem.js"

export default class KinematicBody extends StaticBody {
	protected readonly _kind: string = "kinematic";
	protected _scriptMove: boolean = false;
	protected _scriptPos: Vector3 = new Vector3();
	protected _prevPos: Vector3 = new Vector3();
	protected _motionDelta: Vector3 = new Vector3();
	public transformations: TransformationSystem = new TransformationSystem(this.position);

	moveBy (vec: Vector3) {
		this._position.add(vec);
		this._aabb.translate(vec);
	}

	get position (): Vector3 {
		return super.position;
	}

	set position (val: Vector3) {
		const diff = VecPool.alloc().copy(val).sub(this._position);
		this.moveBy(diff);
	}

	get scriptMove (): boolean {
		return this._scriptMove;
	}

	get scriptPos (): Vector3 {
		return this._scriptPos;
	}

	set scriptPos (val: Vector3) {
		this._scriptPos = val;
		this._scriptMove = !this._scriptPos.isZero();
	}

	get motionDelta (): Vector3 {
		return this._motionDelta;
	}

	preStep () {
		if (!this._scriptMove) {
			this._motionDelta.set(0, 0, 0);
			return;
		}

		this.dirty = true;
		this._prevPos.copy(this._position);
		this._motionDelta.copy(this._scriptPos).sub(this._prevPos);
		this._position.copy(this._scriptPos);
		this._aabb.translate(this._motionDelta);
	}

	postStep (tick: number) {
		this._scriptMove = false;
	}
}