import Vector3 from "../../math/vector3.js"
import AABB from "../../math/aabb.js"
import { divTrunc } from "../../math/utils.js"
import type Shape from "../shape.js"

import { VecPool } from "../../utils/pool.js"

export default class Box implements Shape {
	public readonly type: string = "box";
	private originalWidth: number;
	private originalOffset: Vector3;
	private originalHeight: number;
	private originalDepth: number;
	public offset: Vector3;
	public width: number;
	public height: number;
	public depth: number;
	public readonly aabb: AABB;

	constructor (offset: Vector3, width: number, height: number, depth: number) {
		this.originalOffset = offset;
		this.offset = offset.clone();
		this.width = width;
		this.originalWidth = width;
		this.height = height;
		this.originalHeight = height;
		this.depth = depth;
		this.originalDepth = depth;
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

	setRotation (rotation: Vector3) {
		const rx = rotation.x;
		const ry = rotation.y;
		const rz = rotation.z;

		const xv = VecPool.alloc().set(divTrunc(this.originalWidth, 2), 0, 0).rotate(rx, ry, rz);
		const yv = VecPool.alloc().set(0, divTrunc(this.originalHeight, 2), 0).rotate(rx, ry, rz);
		const zv = VecPool.alloc().set(0, 0, divTrunc(this.originalDepth, 2)).rotate(rx, ry, rz);

		const halfWidth =
			Math.abs(xv.x) +
			Math.abs(yv.x) +
			Math.abs(zv.x);

		const halfHeight =
			Math.abs(xv.y) +
			Math.abs(yv.y) +
			Math.abs(zv.y);

		const halfDepth =
			Math.abs(xv.z) +
			Math.abs(yv.z) +
			Math.abs(zv.z);

		this.width = divTrunc(halfWidth * 2, 1);
		this.height = divTrunc(halfHeight * 2, 1);
		this.depth = divTrunc(halfDepth * 2, 1);

		this.offset = this.originalOffset.clone();
		this.offset.rotate(rx, ry, rz);

		this.aabb.min.set(
			-divTrunc(this.width, 2),
			-divTrunc(this.height, 2),
			-divTrunc(this.depth, 2)
		);

		this.aabb.max.set(
			divTrunc(this.width, 2),
			divTrunc(this.height, 2),
			divTrunc(this.depth, 2)
		);

		this.aabb.translate(this.offset);
	}
}