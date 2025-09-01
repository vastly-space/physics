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

			const ax = v[i0],   ay = v[i0+1],   az = v[i0+2];
			const bx = v[i1],   by = v[i1+1],   bz = v[i1+2];
			const cx = v[i2],   cy = v[i2+1],   cz = v[i2+2];

			const abx = bx - ax, aby = by - ay, abz = bz - az;
			const acx = cx - ax, acy = cy - ay, acz = cz - az;
			const nx = aby*acz - abz*acy;
			const ny = abz*acx - abx*acz;
			const nz = abx*acy - aby*acx;

			const D = -(nx*ax + ny*ay + nz*az);

			const len = Math.hypot(nx, ny, nz) || 1;
			const A = nx/len, B = ny/len, C = nz/len, d = D/len;

			this.triangles.push(new Triangle(
				new Vector3(v[i0], v[i0+1], v[i0+2]),
				new Vector3(v[i1], v[i1+1], v[i1+2]),
				new Vector3(v[i2], v[i2+1], v[i2+2]),
				[A, B, C, d]
			));
		}
	}
}