import Vector3 from "../math/vector3.js"
import Quaternion from "../math/quaternion.js"
import AABB from "../math/aabb.js"
import { Octree } from "../math/octree.js"
import type { OctItem } from "../math/octree.js"
import type Shape from "./shape.js"
import Trimesh from "./shapes/trimesh.js"
import Constants from "../constants.js"

export type CalculationMode = 'SIMULATE' | 'SNAPSHOT';

export default class StaticBody {
	protected readonly _kind: string = "static";

	private _id: number;
	protected _position: Vector3;
	protected _quaternion: Quaternion;
	protected _anchorPos: Vector3;
	protected _anchorVelocity: Vector3;
	protected _anchorTick: number;
	protected _prevPos: Vector3;
	protected _prevTick: number;
	protected _aabb: AABB;
	protected _shapes: Shape[];
	protected _isTrigger: boolean;
	protected _canCollide: boolean = true;
	protected _layer: number;
	public _mode: CalculationMode = 'SIMULATE';
	public dirty: boolean = false;
	protected _constants!: Constants;

	constructor (id: number, shapes: Shape[], position: Vector3, isTrigger: boolean, layer: number = 0) {
		this._id = id;
		this._shapes = shapes;
		this._position = position.clone();
		this._quaternion = new Quaternion();
		this._anchorPos = position.clone();
		this._prevPos = position.clone();
		this._anchorVelocity = new Vector3();
		this._anchorTick = 0;
		this._prevTick = 0;
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

	get prevTick (): number {
		return this._prevTick;
	}

	set prevTick (val: number) {
		this._prevTick = val;
	}

	get anchorPos (): Vector3 {
		return this._anchorPos;
	}

	set anchorPos (val: Vector3) {
		this._anchorPos.copy(val);
	}

	get prevPos (): Vector3 {
		return this._prevPos;
	}

	set prevPos (val: Vector3) {
		this._prevPos.copy(val);
	}

	get anchorVelocity (): Vector3 {
		return this._anchorVelocity;
	}

	set anchorVelocity (val: Vector3) {
		this._anchorVelocity.copy(val);
	}

	get mode (): CalculationMode {
		return this._mode;
	}

	set mode (val: CalculationMode) {
		this._mode = val;
	}

	octreeInsert (tree: Octree) {
		for (let index=0; index<this._shapes.length; index++) {
			const shape = this._shapes[index];
			let item: OctItem;

			switch (shape.type) {
				case "box":
				case "sphere":
				case "capsule":
					const aabb = shape.aabb.clone();
					aabb.translate(this._position);

					item = {
						id: this._id,
						body: this,
						shapeIndex: index,
						aabb: aabb,
						layer: this._layer
					}
					tree.insert(item);
					break;
				case "trimesh":
					if (this.kind !== "static") {
						console.warn("Trimesh is allowed only in static bodies. Skipping");
						continue;
					}

					for (let i=0; i<(shape as Trimesh).triangles.length; i++) {
						tree.insert({
							id: this._id,
							body: this,
							shapeIndex: index,
							triangleIndex: i,
							aabb: (shape as Trimesh).triangles[i].aabb,
							layer: this._layer
						});
					}
					break;
			}
		}
	}

	setRotation (rotation: Vector3) {
		this._quaternion.setFromEuler(rotation);

		for (const shape of this.shapes) {
			shape.setRotation(rotation);
		}

		this.dirty = true;
	}

	setQuaternion (q: Quaternion) {
		this._quaternion.copy(q);

		const euler = this._quaternion.toEuler();

		for (const shape of this.shapes) {
			shape.setRotation(euler);
		}

		this.dirty = true;
	}

	get rotation (): Vector3 {
		return this._quaternion.toEuler();
	}

	get quaternion (): Quaternion {
		return this._quaternion.clone();
	}

	setConstants (val: Constants) {
		this._constants = val;
	}

	get constants (): Constants {
		return this._constants;
	}
}