import Vector3 from "../../math/vector3.js"
import AABB from "../../math/aabb.js"
import { divTrunc } from "../../math/utils.js"
import type Shape from "../shape.js"
import Triangle from "./triangle.js"

export default class Trimesh implements Shape {
	public readonly type: string = "trimesh";
	public readonly offset: Vector3;
	public readonly aabb: AABB;
	public readonly triangles: Triangle[];

	constructor (offset: Vector3, vertices: Int32Array | number[], indices: Uint32Array | number[]) {
		this.offset = offset;
		const v = vertices instanceof Int32Array ? vertices : Int32Array.from(vertices);
	    const i = indices  instanceof Uint32Array ? indices  : Uint32Array.from(indices);

	    if (v.length % 3 !== 0) throw new Error("Trimesh: vertices length must be multiple of 3");
	    if (i.length % 3 !== 0) throw new Error("Trimesh: indices length must be multiple of 3");

	    let minX =  2147483647, minY =  2147483647, minZ =  2147483647;
	    let maxX = -2147483648, maxY = -2147483648, maxZ = -2147483648;
	    for (let k = 0; k < v.length; k += 3) {
			const x = v[k], y = v[k+1], z = v[k+2];
			if (x < minX) minX = x; if (y < minY) minY = y; if (z < minZ) minZ = z;
			if (x > maxX) maxX = x; if (y > maxY) maxY = y; if (z > maxZ) maxZ = z;
	    }
	    this.aabb = new AABB(new Vector3(minX, minY, minZ), new Vector3(maxX, maxY, maxZ));

		const numTris = i.length / 3;
		this.triangles = [];

		for (let t = 0; t < numTris; t++) {
			const i0 = i[3*t+0]*3, i1 = i[3*t+1]*3, i2 = i[3*t+2]*3;

			this.triangles.push(new Triangle(
				new Vector3(v[i0], v[i0+1], v[i0+2]),
				new Vector3(v[i1], v[i1+1], v[i1+2]),
				new Vector3(v[i2], v[i2+1], v[i2+2]),
			));
		}
	}

	projectOnAxis (parentOffset: Vector3, axis: Vector3): [number, number] {
		throw new Error("Trimesh should not be projected on axis, use its triangles");
	}
}