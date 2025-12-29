import Vector3 from "../math/vector3.js"
import AABB from "../math/aabb.js"
import KinematicBody from "./kinematicBody.js"
import { MAX_SLOPE, TICKRATE } from "../constants.js"

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
	protected _canStepUp: boolean = false;
	protected _triggerIntersections: Set<number> = new Set();

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

	get canStepUp (): boolean {
		return this._canStepUp;
	}

	set canStepUp (val: boolean) {
		this._canStepUp = val;
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

	get triggerIntersections (): Set<number> {
		return this._triggerIntersections;
	}

	get velocity (): Vector3 {
		const result = VecPool.alloc().copy(this._controllerVelocity).add(this._environmentalVelocity);

		if (this._supportedBy !== -1) {
			if (this._groundNormal.y >= MAX_SLOPE) {
				// needs clipping
				let slopeFactor = (this.groundNormal.y - MAX_SLOPE)/(1 - MAX_SLOPE);
				slopeFactor = Math.min(1, slopeFactor);
				slopeFactor = Math.max(0, slopeFactor);

				const vDot = result.dot(this._groundNormal);
				const vNormal = VecPool.alloc().copy(this._groundNormal);
				vNormal.x *= vDot;
				vNormal.y *= vDot;
				vNormal.z *= vDot;
				result.sub(vNormal);

				if (vDot > 0) {
					result.add(vNormal);
				}
			}
		}
		
		return result;
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
			const tickV = this.velocity.scale(TICKRATE/1000);

			this._sweptAABB.copy(this._aabb).sweep(tickV);
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

	get position (): Vector3 {
		return super.position;
	}
}