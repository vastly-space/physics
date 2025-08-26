import Vector3 from "../../math/vector3.js"
import AABB from "../../math/aabb.js"
import { divTrunc } from "../../math/utils.js"
import type Shape from "../shape.js"

export default class Trimesh implements Shape {
	public readonly type: string = "trimesh";
	public readonly offset: Vector3;
	public readonly aabb: AABB;
	public readonly vertices: Int32Array;
	public readonly indices: Uint32Array;
	public readonly planes: Float32Array;

	constructor (offset: Vector3, vertices: Int32Array | number[], indices: Uint32Array | number[]) {
		this.offset = offset;
		const v = vertices instanceof Int32Array ? vertices : Int32Array.from(vertices);
	    const i = indices  instanceof Uint32Array ? indices  : Uint32Array.from(indices);

	    if (v.length % 3 !== 0) throw new Error("Trimesh: vertices length must be multiple of 3");
	    if (i.length % 3 !== 0) throw new Error("Trimesh: indices length must be multiple of 3");

	    this.vertices = v;
	    this.indices = i;

	    let minX =  2147483647, minY =  2147483647, minZ =  2147483647;
	    let maxX = -2147483648, maxY = -2147483648, maxZ = -2147483648;
	    for (let k = 0; k < v.length; k += 3) {
			const x = v[k], y = v[k+1], z = v[k+2];
			if (x < minX) minX = x; if (y < minY) minY = y; if (z < minZ) minZ = z;
			if (x > maxX) maxX = x; if (y > maxY) maxY = y; if (z > maxZ) maxZ = z;
	    }
	    this.aabb = new AABB(new Vector3(minX, minY, minZ), new Vector3(maxX, maxY, maxZ));

		const numTris = i.length / 3;
		const planes = new Float32Array(numTris * 4);
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

			planes[4*t+0] = A;
			planes[4*t+1] = B;
			planes[4*t+2] = C;
			planes[4*t+3] = d;
		}
		this.planes = planes;
	}

	getTriangle(t: number, outA: Vector3, outB: Vector3, outC: Vector3) {
		const i = this.indices;
		const v = this.vertices;
		const i0 = i[3*t+0]*3, i1 = i[3*t+1]*3, i2 = i[3*t+2]*3;
		outA.set(v[i0], v[i0+1], v[i0+2]);
		outB.set(v[i1], v[i1+1], v[i1+2]);
		outC.set(v[i2], v[i2+1], v[i2+2]);
	}
}