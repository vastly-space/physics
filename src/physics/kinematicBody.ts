import Vector3 from "../math/vector3.js"
import AABB from "../math/aabb.js"
import StaticBody from "./staticBody.js"

import { VecPool } from "../utils/pool.js"

import TransformationSystem from "../transformations/transformationSystem.js"

export interface SnapshotAnchor {
	tick: number;
	pos: Vector3;
}

export default class KinematicBody extends StaticBody {
	protected readonly _kind: string = "kinematic";
	protected _scriptMove: boolean = false;
	protected _scriptPos: Vector3 = new Vector3();
	protected _prevPos: Vector3 = new Vector3();
	protected _motionDelta: Vector3 = new Vector3();
	public transformations: TransformationSystem = new TransformationSystem(this);
	protected anchors: SnapshotAnchor[] = [];

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
		this._scriptMove = !(this._scriptPos.equals(this._position));
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

	applySnapshot (tick: number, pos: Vector3, vel: Vector3) {
		this._anchorVelocity.copy(vel);
		const anchor = { tick, pos };
		let index = 0;
		while (index < this.anchors.length && this.anchors[index].tick < anchor.tick) index++;

		this.anchors.splice(index, 0, anchor);
	}

	getNextAnchor (tick: number): SnapshotAnchor | null {
		while (this.anchors.length > 1 && this.anchors[0].tick < tick) {
			const prev = this.anchors.shift();
			this._prevPos.copy(prev!.pos);
			this._prevTick = prev!.tick;
		}

		return this.anchors[0] || null;
	}

	setConstants (val: any) {
		super.setConstants(val);

		this.transformations.TICKRATE = val.TICKRATE;
	}
}