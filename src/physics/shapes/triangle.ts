import Vector3 from "../../math/vector3.js"
import AABB from "../../math/aabb.js"
import { divTrunc } from "../../math/utils.js"
import type Shape from "../shape.js"

export default class Triangle implements Shape {
	public readonly type: string = "triangle";
	public readonly offset: Vector3;
	public readonly aabb: AABB;
	public a: Vector3;
	public b: Vector3;
	public c: Vector3;

	constructor (a: Vector3, b: Vector3, c: Vector3) {
		this.offset = new Vector3();
		this.a = a;
		this.b = b;
		this.c = c;

		this.aabb = new AABB(this.a, this.b);
		this.aabb.expandVector(this.c);
	}

	projectOnAxis (parentOffset: Vector3, axis: Vector3): [number, number] {
		const a = this.a.dot(axis);
		const b = this.b.dot(axis);
		const c = this.c.dot(axis);

		return [
			Math.min(a,b,c),
			Math.max(a,b,c)
		]
	}

	setRotation (rotation: Vector3) {
		// do nothing
	}
}