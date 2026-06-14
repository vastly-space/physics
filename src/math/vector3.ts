import { divTrunc } from "./utils.js"

export default class Vector3 {
	private _x: number;
	private _y: number;
	private _z: number;

	public static readonly XAxis = new Vector3(1, 0, 0);
	public static readonly YAxis = new Vector3(0, 1, 0);
	public static readonly ZAxis = new Vector3(0, 0, 1);
	public static readonly Zero = new Vector3();

	constructor (x: number = 0, y: number = 0, z: number = 0) {
		this._x = x;
		this._y = y;
		this._z = z;
	}

	get x (): number {
		return this._x;
	}

	set x (x: number) {
		this._x = x;
	}

	get y (): number {
		return this._y;
	}

	set y (y: number) {
		this._y = y;
	}

	get z (): number {
		return this._z;
	}

	set z (z: number) {
		this._z = z;
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

	cross (v: Vector3): Vector3 {
		this._x = this.y * v.z - this.z * v.y;
		this._y = this.z * v.x - this.x * v.z;
		this._z = this.y * v.x - this.x * v.y;

		return this;
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

	isZero (): boolean {
		return this._x === 0 && this._y === 0 && this.z === 0;
	}

	// float methods, only in local collision check

	length (): number {
		return Math.sqrt(this.lengthSquared());
	}

	lengthSquared (): number {
		return this._x*this._x + this._y*this._y + this._z*this._z;
	}

	normalize (): Vector3 {
		const len = Math.sqrt(this._x*this._x + this._y*this._y + this._z*this.z);
		
		this._x /= len;
		this._y /= len;
		this._z /= len;

		return this;
	}

	rotate (rx: number, ry: number, rz: number): Vector3 {
		let x = this._x;
		let y = this._y;
		let z = this._z;

		// Rotate around global X
		{
			const c = Math.cos(rx);
			const s = Math.sin(rx);

			const ny = y * c - z * s;
			const nz = y * s + z * c;

			y = ny;
			z = nz;
		}

		// Rotate around global Y
		{
			const c = Math.cos(ry);
			const s = Math.sin(ry);

			const nx = x * c + z * s;
			const nz = -x * s + z * c;

			x = nx;
			z = nz;
		}

		// Rotate around global Z
		{
			const c = Math.cos(rz);
			const s = Math.sin(rz);

			const nx = x * c - y * s;
			const ny = x * s + y * c;

			x = nx;
			y = ny;
		}

		this.x = x;
		this.y = y;
		this.z = z;

		return this;
	}
}