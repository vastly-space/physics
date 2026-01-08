import Vector3 from "../math/vector3.js"
import AABB from "../math/aabb.js"
import KinematicBody from "./kinematicBody.js"
import { TICKRATE } from "../constants.js"

import { VecPool } from "../utils/pool.js"

export interface Impulse {
	direction: Vector3;
	decay: boolean;
	startTick: number;
	endTick: number;
}

export default class DynamicBody extends KinematicBody {
	protected readonly _kind: string = "dynamic";
	protected _supportedBy: number = -1;
	protected _groundNormal: Vector3 = new Vector3();
	protected _controllerVelocity: Vector3 = new Vector3();
	protected _environmentalVelocity: Vector3 = new Vector3();
	protected _velocity: Vector3 = new Vector3();
	protected _kinematicBehavior: boolean = false;
	protected _mask: number = 0;
	protected _gravityMultiplier: number = 255;
	protected _canStepUp: boolean = false;
	protected _triggerIntersections: Set<number> = new Set();
	protected _sweptAABB: AABB = new AABB(new Vector3(), new Vector3());
	protected _impulses: Impulse[] = [];

	get supportedBy (): number {
		return this._supportedBy;
	}

	set supportedBy (val: number) {
		this._supportedBy = val;
		if (val === null) {
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
		return this._velocity;
	}

	get kinematicBehavior (): boolean {
		return this._kinematicBehavior;
	}

	set kinematicBehavior (val: boolean) {
		this._kinematicBehavior = val;

		if (val) {
			this._prevPos.copy(this._position);
			this.transformations.clear();
			this._impulses = [];
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

	get sweptAABB (): AABB {
		return this._sweptAABB;
	}

	preStep () {
		if (this._kinematicBehavior) {
			super.preStep();
		} else {
			this._velocity.copy(this._controllerVelocity).add(this._environmentalVelocity);

			for (const impulse of this._impulses) {
				if (impulse.decay) {
					let duration = impulse.endTick - impulse.startTick;

					let decayFactor = duration === 0 ?
						1 :
						((impulse.endTick - impulse.startTick)/(this.transformations.tick - impulse.startTick))/(impulse.endTick - impulse.startTick);

					this._velocity.addScaled(impulse.direction, decayFactor);
				} else {
					this._velocity.add(impulse.direction);
				}
			}

			if (!this._velocity.isZero()) this.dirty = true;

			const tickV = VecPool.alloc().copy(this.velocity).scale(TICKRATE/1000);

			this._sweptAABB.copy(this._aabb).sweep(tickV);
		}
	}

	postStep (tick: number) {
		super.postStep(tick);

		this._impulses = this._impulses.filter(i => i.endTick > tick);
	}

	get position (): Vector3 {
		return super.position;
	}

	set position (val: Vector3) {
		super.position = val;
	}

	addImpulse (direction: Vector3, duration: number, decay: boolean) {
		this._impulses.push({
			startTick: this.transformations.tick,
			direction: direction,
			endTick: this.transformations.tick + duration,
			decay: decay
		})
	}

	clearImpulses () {
		this._impulses = [];
	}
}