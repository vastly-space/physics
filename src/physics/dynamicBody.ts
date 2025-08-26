import Vector3 from "../math/vector3.js"
import AABB from "../math/aabb.js"
import StaticBody from "./staticBody.js"

export default class DynamicBody extends StaticBody {
	protected readonly _kind: string = "dynamic";
	protected _scriptMove: boolean = false;
	protected _scriptPos: Vector3 = new Vector3();
	protected _supportedBy: number = -1;
	protected _velocity: Vector3 = new Vector3();

	get scriptMove (): boolean {
		return this._scriptMove;
	}

	set scriptMove (val: boolean) {
		this._scriptMove = val;
	}

	get scriptPos (): Vector3 {
		return this._scriptPos;
	}

	set scriptPos (val: Vector3) {
		this._scriptPos = val;
	}

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

	moveBy (vec: Vector3) {
		this._position.add(vec);
		this._aabb.translate(vec);
	}

	preStep() {
		this._aabb.translate(this._velocity);
		this._position.add(this._velocity);
	}

	postStep(tick: number) {
		this._anchorTick = tick;
		this._anchorPos.copy(this._position);
	}
}