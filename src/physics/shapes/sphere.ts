import Vector3 from "../../math/vector3.js"
import AABB from "../../math/aabb.js"
import type Shape from "../shape.js"

export default class Sphere implements Shape {
	public readonly type: string = "sphere";
	public readonly offset: Vector3;
	public readonly radius: number;
	public readonly aabb: AABB;

	constructor (offset: Vector3, radius: number) {
		this.offset = offset;
		this.radius = radius;
		const min = this.offset.clone();
		min.set(min.x - radius, min.y - radius, min.z - radius);
		const max = this.offset.clone();
		max.set(max.x + radius, max.y + radius, max.z + radius);
		this.aabb = new AABB(min, max);
	}
}