import Vector3 from "../math/vector3.js"
import AABB from "../math/aabb.js"
import type Shape from "./shape.js"

export default class StaticBody {
	protected readonly _kind: string = "static";

	private _id: number;
	protected _position: Vector3;
	protected _anchorPos: Vector3;
	protected _anchorTick: number;
	protected _aabb: AABB;
	protected _shapes: Shape[];
	protected _isTrigger: boolean;
	protected _canCollide: boolean = true;
	protected _layer: number;

	constructor (id: number, shapes: Shape[], position: Vector3, isTrigger: boolean, layer: number = 0) {
		this._id = id;
		this._shapes = shapes;
		this._position = position.clone();
		this._anchorPos = position.clone();
		this._anchorTick = 0;
		this._aabb = new AABB(new Vector3(), new Vector3());
		this._isTrigger = isTrigger;
		this._layer = layer;

		for (const shape of shapes) {
			this._aabb.expandAABB(shape.aabb);
		}

		this._aabb.translate(this._position);
	}

	get kind (): string {
		return this._kind;
	}

	get id (): number {
		return this._id;
	}

	get position (): Vector3 {
		return this._position;
	}

	get anchorPos (): Vector3 {
		return this._anchorPos;
	}

	get aabb (): AABB {
		return this._aabb;
	}

	get shapes (): Shape[] {
		return this._shapes;
	}

	get isTrigger (): boolean {
		return this._isTrigger;
	}

	get canCollide (): boolean {
		return this._canCollide;
	}

	set canCollide (val: boolean) {
		this._canCollide = val;
	}

	get layer (): number {
		return this._layer;
	}

	set layer (val: number) {
		this._layer = val;
	}

	get anchorTick (): number {
		return this._anchorTick;
	}

	set anchorTick (val: number) {
		this._anchorTick = val;
	}

	snapshotAnchor(tick: number) {
		this._anchorPos.copy(this._position);
		this._anchorTick = tick;
	}
}