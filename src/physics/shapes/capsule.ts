import Vector3 from "../../math/vector3.js"
import AABB from "../../math/aabb.js"
import { divTrunc } from "../../math/utils.js"
import type Shape from "../shape.js"

import { VecPool } from "../../utils/pool.js"

export default class Capsule implements Shape {
	public readonly type: string = "capsule";
	public readonly offset: Vector3;
	public readonly aabb: AABB;
	public readonly height: number;
	public readonly radius: number;
	public readonly halfSegmentLength: number;

	constructor (offset: Vector3, height: number, radius: number) {
		this.offset = offset;
		this.height = height;
		this.radius = radius;
		this.halfSegmentLength = (this.height - 2 * this.radius) / 2;

		const hh = divTrunc(this.height, 2);

		this.aabb = new AABB(
			new Vector3(-this.radius, -hh, -this.radius),
			new Vector3(this.radius, hh, this.radius)
		);

		this.aabb.translate(this.offset);
	}

	projectOnAxis (parentOffset: Vector3, axis: Vector3): [number, number] {
		const center = VecPool.alloc().copy(parentOffset).add(this.offset);
		const centerDot = center.dot(axis);
		const yDot = axis.y * this.halfSegmentLength;

		return [
			centerDot - Math.abs(yDot) - this.radius,
			centerDot + Math.abs(yDot) + this.radius
		];
	}
}