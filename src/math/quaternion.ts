import Vector3 from "./vector3.js"

export default class Quaternion {
	x: number;
	y: number;
	z: number;
	w: number;

	constructor(
		x = 0,
		y = 0,
		z = 0,
		w = 1
	) {
		this.x = x;
		this.y = y;
		this.z = z;
		this.w = w;
	}

	set(x: number, y: number, z: number, w: number): this {
		this.x = x;
		this.y = y;
		this.z = z;
		this.w = w;

		return this;
	}

	identity(): this {
		return this.set(0, 0, 0, 1);
	}

	copy(q: Quaternion): this {
		return this.set(q.x, q.y, q.z, q.w);
	}

	clone(): Quaternion {
		return new Quaternion(this.x, this.y, this.z, this.w);
	}

	lengthSquared(): number {
		return (
			this.x * this.x +
			this.y * this.y +
			this.z * this.z +
			this.w * this.w
		);
	}

	length(): number {
		return Math.sqrt(this.lengthSquared());
	}

	normalize(): this {
		const length = this.length();

		if (length === 0) {
			return this.identity();
		}

		const inverseLength = 1 / length;

		this.x *= inverseLength;
		this.y *= inverseLength;
		this.z *= inverseLength;
		this.w *= inverseLength;

		return this;
	}

	dot(q: Quaternion): number {
		return (
			this.x * q.x +
			this.y * q.y +
			this.z * q.z +
			this.w * q.w
		);
	}

	invert(): this {
		const lengthSquared = this.lengthSquared();

		if (lengthSquared === 0) {
			return this.identity();
		}

		this.x = -this.x / lengthSquared;
		this.y = -this.y / lengthSquared;
		this.z = -this.z / lengthSquared;
		this.w = this.w / lengthSquared;

		return this;
	}

	conjugate(): this {
		this.x = -this.x;
		this.y = -this.y;
		this.z = -this.z;

		return this;
	}

	multiply(q: Quaternion): this {
		return this.multiplyQuaternions(this, q);
	}

	premultiply(q: Quaternion): this {
		return this.multiplyQuaternions(q, this);
	}

	multiplyQuaternions(a: Quaternion, b: Quaternion): this {
		const ax = a.x;
		const ay = a.y;
		const az = a.z;
		const aw = a.w;

		const bx = b.x;
		const by = b.y;
		const bz = b.z;
		const bw = b.w;

		this.x = aw * bx + ax * bw + ay * bz - az * by;
		this.y = aw * by - ax * bz + ay * bw + az * bx;
		this.z = aw * bz + ax * by - ay * bx + az * bw;
		this.w = aw * bw - ax * bx - ay * by - az * bz;

		return this;
	}

	setFromAxisAngle(axis: Vector3, angle: number): this {
		const halfAngle = angle * 0.5;
		const sine = Math.sin(halfAngle);

		this.x = axis.x * sine;
		this.y = axis.y * sine;
		this.z = axis.z * sine;
		this.w = Math.cos(halfAngle);

		return this;
	}

	setFromEuler(euler: Vector3): this {
		const halfX = euler.x * 0.5;
		const halfY = euler.y * 0.5;
		const halfZ = euler.z * 0.5;

		const cx = Math.cos(halfX);
		const cy = Math.cos(halfY);
		const cz = Math.cos(halfZ);

		const sx = Math.sin(halfX);
		const sy = Math.sin(halfY);
		const sz = Math.sin(halfZ);

		this.x = sx * cy * cz + cx * sy * sz;
		this.y = cx * sy * cz - sx * cy * sz;
		this.z = cx * cy * sz + sx * sy * cz;
		this.w = cx * cy * cz - sx * sy * sz;

		return this;
	}

	toEuler(): Vector3 {
		const out = new Vector3();

		const lengthSquared = this.lengthSquared();

		if (lengthSquared === 0) {
			out.x = 0;
			out.y = 0;
			out.z = 0;

			return out;
		}

		const scale = 1 / Math.sqrt(lengthSquared);

		const x = this.x * scale;
		const y = this.y * scale;
		const z = this.z * scale;
		const w = this.w * scale;

		const sinY = 2 * (w * y + x * z);

		const clampedSinY = Math.max(-1, Math.min(1, sinY));

		out.y = Math.asin(clampedSinY);

		if (Math.abs(clampedSinY) < 0.9999999) {
			out.x = Math.atan2(
				2 * (w * x - y * z),
				1 - 2 * (x * x + y * y)
			);

			out.z = Math.atan2(
				2 * (w * z - x * y),
				1 - 2 * (y * y + z * z)
			);
		} else {
			out.x = Math.atan2(
				2 * (x * w + y * z),
				1 - 2 * (x * x + z * z)
			);

			out.z = 0;
		}

		return out;
	}

	setFromUnitVectors(
		from: Vector3,
		to: Vector3
	): this {
		const EPSILON = 1e-8;

		let w =
			from.x * to.x +
			from.y * to.y +
			from.z * to.z +
			1;

		if (w < EPSILON) {
			w = 0;

			if (Math.abs(from.x) > Math.abs(from.z)) {
				this.x = -from.y;
				this.y = from.x;
				this.z = 0;
			} else {
				this.x = 0;
				this.y = -from.z;
				this.z = from.y;
			}
		} else {
			this.x = from.y * to.z - from.z * to.y;
			this.y = from.z * to.x - from.x * to.z;
			this.z = from.x * to.y - from.y * to.x;
		}

		this.w = w;

		return this.normalize();
	}

	slerp(target: Quaternion, t: number): this {
		return this.slerpQuaternions(this, target, t);
	}

	slerpQuaternions(
		from: Quaternion,
		to: Quaternion,
		t: number
	): this {
		if (t <= 0) {
			return this.copy(from);
		}

		if (t >= 1) {
			return this.copy(to);
		}

		const ax = from.x;
		const ay = from.y;
		const az = from.z;
		const aw = from.w;

		let bx = to.x;
		let by = to.y;
		let bz = to.z;
		let bw = to.w;

		let cosine =
			ax * bx +
			ay * by +
			az * bz +
			aw * bw;

		if (cosine < 0) {
			cosine = -cosine;

			bx = -bx;
			by = -by;
			bz = -bz;
			bw = -bw;
		}

		if (cosine > 0.9995) {
			this.x = ax + t * (bx - ax);
			this.y = ay + t * (by - ay);
			this.z = az + t * (bz - az);
			this.w = aw + t * (bw - aw);

			return this.normalize();
		}

		const angle = Math.acos(Math.max(-1, Math.min(1, cosine)));
		const sine = Math.sin(angle);

		const fromScale = Math.sin((1 - t) * angle) / sine;
		const toScale = Math.sin(t * angle) / sine;

		this.x = ax * fromScale + bx * toScale;
		this.y = ay * fromScale + by * toScale;
		this.z = az * fromScale + bz * toScale;
		this.w = aw * fromScale + bw * toScale;

		return this;
	}

	equals(q: Quaternion, epsilon = 1e-8): boolean {
		const direct =
			Math.abs(this.x - q.x) <= epsilon &&
			Math.abs(this.y - q.y) <= epsilon &&
			Math.abs(this.z - q.z) <= epsilon &&
			Math.abs(this.w - q.w) <= epsilon;

		if (direct) {
			return true;
		}

		return (
			Math.abs(this.x + q.x) <= epsilon &&
			Math.abs(this.y + q.y) <= epsilon &&
			Math.abs(this.z + q.z) <= epsilon &&
			Math.abs(this.w + q.w) <= epsilon
		);
	}

	static fromEuler(euler: Vector3): Quaternion {
		return new Quaternion().setFromEuler(euler);
	}

	static fromAxisAngle(
		axis: Vector3,
		angle: number
	): Quaternion {
		return new Quaternion().setFromAxisAngle(axis, angle);
	}

	static multiply(
		a: Quaternion,
		b: Quaternion
	): Quaternion {
		return new Quaternion().multiplyQuaternions(a, b);
	}

	static slerp(
		from: Quaternion,
		to: Quaternion,
		t: number
	): Quaternion {
		return new Quaternion().slerpQuaternions(from, to, t);
	}
}