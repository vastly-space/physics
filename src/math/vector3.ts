import { divTrunc } from "./utils.js"

export default class Vector3 {
	private _x: number;
	private _y: number;
	private _z: number;

	public static readonly XAxis = new Vector3(1, 0, 0);
	public static readonly YAxis = new Vector3(0, 1, 0);
	public static readonly ZAxis = new Vector3(0, 0, 1);

	constructor (x: number = 0, y: number = 0, z: number = 0) {
		this._x = x;
		this._y = y;
		this._z = z;
	}

	get x (): number {
		return this._x;
	}

	get y (): number {
		return this._y;
	}

	get z (): number {
		return this._z;
	}

	add (v: Vector3): Vector3 {
		this._x += v.x;
		this._y += v.y;
		this._z += v.z;

		return this;
	}

	sub (v: Vector3): Vector3 {
		this._x -= v.x;
		this._y -= v.y;
		this._z -= v.z;

		return this;
	}

	scale (factor: number): Vector3 {
		this._x = divTrunc(this._x * factor, 1);
		this._y = divTrunc(this._y * factor, 1);
		this._z = divTrunc(this._z * factor, 1);

		return this;
	}

	neg (): Vector3 {
		this._x = -this._x;
		this._y = -this._y;
		this._z = -this._z;

		return this;
	}

	abs (): Vector3 {
		this._x = Math.abs(this._x);
		this._y = Math.abs(this._y);
		this._z = Math.abs(this._z);

		return this;
	}

	equals (v: Vector3): boolean {
		return this._x === v.x && this._y === v.y && this._z === v.z;
	}

	dot (v: Vector3): number {
		return this._x * v.x + this._y * v.y + this._z * v.z;
	}

	minComp (v: Vector3): Vector3 {
		this._x = Math.min(this._x, v.x);
		this._y = Math.min(this._y, v.y);
		this._z = Math.min(this._z, v.z);

		return this;
	}

	maxComp (v: Vector3): Vector3 {
		this._x = Math.max(this._x, v.x);
		this._y = Math.max(this._y, v.y);
		this._z = Math.max(this._z, v.z);

		return this;
	}

	clampComp (min: Vector3, max: Vector3): Vector3 {
		this._x = Math.min(Math.max(this._x, min.x), max.x);
		this._y = Math.min(Math.max(this._y, min.y), max.y);
		this._z = Math.min(Math.max(this._z, min.z), max.z);

		return this;
	}

	set (x: number, y: number, z: number): Vector3 {
		this._x = x;
		this._y = y;
		this._z = z;

		return this;
	}

	clone (): Vector3 {
		return new Vector3(this._x, this._y, this._z);
	}

	copy (v: Vector3): Vector3 {
		this._x = v.x;
		this._y = v.y;
		this._z = v.z;

		return this;
	}

	addScaled (v: Vector3, k: number): Vector3 {
		this._x += divTrunc(v.x * k, 1);
		this._y += divTrunc(v.y * k, 1);
		this._z += divTrunc(v.z * k, 1);

		return this;
	}
}