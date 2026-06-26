import Vector3 from "../../math/vector3.js"
import AABB from "../../math/aabb.js"
import type Shape from "../shape.js"

import { VecPool } from "../../utils/pool.js"

export default class Sphere implements Shape {
	public readonly type: string = "sphere";
	public offset: Vector3;
	public readonly radius: number;
	public readonly aabb: AABB;
	private originalOffset: Vector3;

	constructor (offset: Vector3, radius: number) {
		this.originalOffset = offset;
		this.offset = offset.clone();
		this.radius = radius;
		const min = this.offset.clone();
		min.set(min.x - radius, min.y - radius, min.z - radius);
		const max = this.offset.clone();
		max.set(max.x + radius, max.y + radius, max.z + radius);
		this.aabb = new AABB(min, max);
	}

	projectOnAxis (parentOffset: Vector3, axis: Vector3): [number, number] {
		const center = (VecPool.alloc().copy(this.offset).add(parentOffset)).dot(axis);

		return [
			center - this.radius,
			center + this.radius
		];
	}

	setRotation (rotation: Vector3) {
		const rx = rotation.x;
		const ry = rotation.y;
		const rz = rotation.z;
		
		this.offset.copy(this.originalOffset).rotate(rx, ry, rz);

		this.aabb.min.set(
			this.offset.x - this.radius,
			this.offset.y - this.radius,
			this.offset.z - this.radius
		);

		this.aabb.max.set(
			this.offset.x + this.radius,
			this.offset.y + this.radius,
			this.offset.z + this.radius
		);
	}
}