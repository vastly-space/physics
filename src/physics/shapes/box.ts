import Vector3 from "../../math/vector3.js"
import AABB from "../../math/aabb.js"
import { divTrunc } from "../../math/utils.js"
import type Shape from "../shape.js"

export default class Box implements Shape {
	public readonly type: string = "box";
	public readonly offset: Vector3;
	public readonly halfExtents: Vector3;
	public readonly aabb: AABB;

	constructor (offset: Vector3, width: number, height: number, depth: number) {
		this.offset = offset;
		this.halfExtents = new Vector3(
			divTrunc(width, 2),
			divTrunc(height, 2),
			divTrunc(depth, 2)
		);
		this.aabb = new AABB(this.halfExtents.clone().neg(), this.halfExtents);
		this.aabb.translate(this.offset);
	}
}