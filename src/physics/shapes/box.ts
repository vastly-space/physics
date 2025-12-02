import Vector3 from "../../math/vector3.js"
import AABB from "../../math/aabb.js"
import { divTrunc } from "../../math/utils.js"
import type Shape from "../shape.js"

import { VecPool } from "../../utils/pool.js"

export default class Box implements Shape {
	public readonly type: string = "box";
	public readonly offset: Vector3;
	private readonly width: number;
	private readonly height: number;
	private readonly depth: number;
	public readonly aabb: AABB;

	constructor (offset: Vector3, width: number, height: number, depth: number) {
		this.offset = offset;
		this.width = width;
		this.height = height;
		this.depth = depth;
		this.aabb = new AABB(
			new Vector3(
				-divTrunc(this.width, 2),
				-divTrunc(this.height, 2),
				-divTrunc(this.depth, 2)
			),
			new Vector3(
				divTrunc(this.width, 2),
				divTrunc(this.height, 2),
				divTrunc(this.depth, 2)
			)
		);
		this.aabb.translate(this.offset);
	}

	projectOnAxis (parentOffset: Vector3, axis: Vector3): [number, number] {
		const r = Math.abs(axis.x) * (this.width/2) + Math.abs(axis.y) * (this.height/2) + Math.abs(axis.z) * (this.depth/2);
		const center = (VecPool.alloc().copy(this.offset).add(parentOffset)).dot(axis);

		return [
			center - r,
			center + r
		];
	}
}