import Vector3 from "../../math/vector3.js"
import AABB from "../../math/aabb.js"
import { divTrunc } from "../../math/utils.js"

export default class Triangle {
	public a: Vector3;
	public b: Vector3;
	public c: Vector3;
	public plane: number[];

	constructor (a: Vector3, b: Vector3, c: Vector3, plane: number[]) {
		this.a = a;
		this.b = b;
		this.c = c;
		this.plane = plane;
	}

	getAABB (): AABB {
		const result = new AABB(this.a, this.b);
		return result.expandVector(this.c);
	}
}