import Vector3 from "../math/vector3.js"
import AABB from "../math/aabb.js"
import StaticBody from "./staticBody.js"

export default class KinematicBody extends StaticBody {
	protected readonly _kind: string = "kinematic";
	protected _scriptMove: boolean = false;
	protected _scriptPos: Vector3 = new Vector3();
	protected _prevPos: Vector3 = new Vector3();
	protected _motionDelta: Vector3 = new Vector3();
	protected _sweptAABB: AABB = new AABB(new Vector3(), new Vector3());

	get scriptMove (): boolean {
		return this._scriptMove;
	}

	get scriptPos (): Vector3 {
		return this._scriptPos;
	}

	set scriptPos (val: Vector3) {
		this._scriptPos = val;
		this._scriptMove = true;
	}

	get motionDelta (): Vector3 {
		return this._motionDelta;
	}

	get sweptAABB (): AABB {
		return this._sweptAABB;
	}

	preStep () {
		if (!this._scriptMove) {
			this._motionDelta.set(0, 0, 0);
			return;
		}

		this._motionDelta.copy(this._scriptPos).sub(this._prevPos);

		this._sweptAABB.copy(this._aabb).expand(this._motionDelta);

		this._aabb.translate(this._motionDelta);
		this._position.add(this._motionDelta);
	}

	postStep (tick: number) {
		this._anchorTick = tick;
	    this._anchorPos.copy(this._position);
		this._prevPos.copy(this._position);
		this._scriptMove = false;
		this._sweptAABB.copy(this._aabb);
	}
}