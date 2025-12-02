import Vector3 from "../../math/vector3.js"
import AABB from "../../math/aabb.js"
import { divTrunc } from "../../math/utils.js"
import type Shape from "../shape.js"

import { VecPool } from "../../utils/pool.js"

export default class Cylinder implements Shape {
	public readonly type: string = "cylinder";
	public readonly offset: Vector3;
	public readonly aabb: AABB;
	public readonly height: number;
	public readonly radius: number;

	constructor (offset: Vector3, height: number, radius: number) {
		this.offset = offset;
		this.height = height;
		this.radius = radius;

		const hh = divTrunc(this.height, 2);

		this.aabb = new AABB(
			new Vector3(-this.radius, -hh, -this.radius),
			new Vector3(this.radius, hh, this.radius)
		);

		this.aabb.translate(this.offset);
	}

	projectOnAxis (parentOffset: Vector3, axis: Vector3): [number, number] {
		const center = (VecPool.alloc().copy(this.offset).add(parentOffset)).dot(axis);
		const cAxis = VecPool.alloc().copy(Vector3.YAxis);
		const cos = cAxis.dot(axis);
		const circleProjection = this.radius * Math.sqrt(1 - cos*cos);

		return [
			center - circleProjection,
			center + circleProjection
		];
	}
}