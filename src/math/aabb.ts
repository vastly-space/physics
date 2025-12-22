import Vector3 from "./vector3.js"

export default class AABB {
	private _min: Vector3;
	private _max: Vector3;

	constructor (min: Vector3, max: Vector3) {
		this._min = min.clone();
		this._max = max.clone();

		this._normalize();
	}

	static fromMinMax(min: Vector3, max: Vector3): AABB {
		return new AABB(min, max);
	}

	static fromCenterHalfSize(center: Vector3, half: Vector3): AABB {
		return new AABB(
			center.clone().sub(half),
			center.clone().add(half),
		);
	}

	private _normalize(): void {
		const minX = Math.min(this._min.x, this._max.x);
		const minY = Math.min(this._min.y, this._max.y);
		const minZ = Math.min(this._min.z, this._max.z);
		const maxX = Math.max(this._min.x, this._max.x);
		const maxY = Math.max(this._min.y, this._max.y);
		const maxZ = Math.max(this._min.z, this._max.z);
		this._min.set(minX, minY, minZ);
		this._max.set(maxX, maxY, maxZ);
	}

	get min (): Vector3 { return this._min; }
	get max (): Vector3 { return this._max; }

	get size (): Vector3 {
		return this._max.clone().sub(this._min);
	}

	translate (offset: Vector3): AABB {
		this._min.add(offset);
		this._max.add(offset);

		return this;
	}

	expand (delta: Vector3): AABB {
		this._min.sub(delta);
		this._max.add(delta);

		return this;
	}

	expandAABB (other: AABB): AABB {
		this._min.minComp(other.min);
		this._max.maxComp(other.max);
		return this;
	}

	expandVector (vec: Vector3): AABB {
		this._min.minComp(vec);
		this._max.maxComp(vec);
		return this;
	}

	containsPoint (p: Vector3): boolean {
		return (
			p.x >= this._min.x && p.x < this._max.x &&
			p.y >= this._min.y && p.y < this._max.y &&
			p.z >= this._min.z && p.z < this._max.z
		);
	}

	containsAABB (other: AABB): boolean {
		return (
			this._min.x <= other.min.x && this._max.x >= other.max.x &&
			this._min.y <= other.min.y && this._max.y >= other.max.y &&
			this._min.z <= other.min.z && this._max.z >= other.max.z
		);
	}

	overlaps (other: AABB): boolean {
		return !(
			this._max.x <= other.min.x || this._min.x >= other.max.x ||
			this._max.y <= other.min.y || this._min.y >= other.max.y ||
			this._max.z <= other.min.z || this._min.z >= other.max.z
		);
	}

	clone (): AABB {
		return new AABB(this._min, this._max);
	}

	sweepX (dx: number): AABB {
		const minX = dx >= 0 ? this._min.x : this._min.x + dx;
	    const maxX = dx >= 0 ? this._max.x + dx : this._max.x;

	    this._min.set(minX, this._min.y, this._min.z);
	    this._max.set(maxX, this._max.y, this._max.z);

	    return this;
	}

	sweepY (dy: number): AABB {
		const minY = dy >= 0 ? this._min.y : this._min.y + dy;
	    const maxY = dy >= 0 ? this._max.y + dy : this._max.y;

	    this._min.set(this._min.x, minY, this._min.z);
	    this._max.set(this._max.x, maxY, this._max.z);

	    return this;
	}

	sweepZ (dz: number): AABB {
		const minZ = dz >= 0 ? this._min.z : this._min.z + dz;
	    const maxZ = dz >= 0 ? this._max.z + dz : this._max.z;

	    this._min.set(this._min.x, this._min.y, minZ);
	    this._max.set(this._max.x, this._max.y, maxZ);

	    return this;
	}

	sweep (vec: Vector3) {
		this.sweepX(vec.x);
		this.sweepY(vec.y);
		this.sweepZ(vec.z);
	}

	copy (other: AABB): AABB {
		this._min.copy(other.min);
		this._max.copy(other.max);

		return this;
	}
}