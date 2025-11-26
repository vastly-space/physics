import Vector3 from "../../math/vector3.js"
import AABB from "../../math/aabb.js"
import Box from "./box.js"
import Sphere from "./sphere.js"
import Cylinder from "./cylinder.js"
import Trimesh from "./trimesh.js"
import Triangle from "./triangle.js"

type Intersection = AABB | null;

export default class Intersections {
	static broad_box_box (a: Box, b: Box): Intersection {
		const min = new Vector3(
			Math.max(a.aabb.min.x, b.aabb.min.x),
			Math.max(a.aabb.min.y, b.aabb.min.y),
			Math.max(a.aabb.min.z, b.aabb.min.z)
		);
		const max = new Vector3(
			Math.min(a.aabb.max.x, b.aabb.max.x),
			Math.min(a.aabb.max.y, b.aabb.max.y),
			Math.min(a.aabb.max.z, b.aabb.max.z)
		);

		if (min.x > max.x || min.y > max.y || min.z > max.z) return null;
		else return new AABB(min, max);
	}

	static box_box (a: Box, b: Box) {

	}

	static box_sphere (b: Box, s: Sphere): Intersection {
		const qx = Math.max(b.aabb.min.x, Math.max(s.center.x, b.aabb.max.x));
		const qy = Math.max(b.aabb.min.y, Math.max(s.center.y, b.aabb.max.y));
		const qz = Math.max(b.aabb.min.z, Math.max(s.center.z, b.aabb.max.z));

		const dx = qx - s.center.x;
		const dy = qy - s.center.y;
		const dz = qz - s.center.z;

		if (dx*dx + dy*dy + dz*dz > s.radius*s.radius) {
			return null;
		}

		return new AABB(
			new Vector3(
				Math.max(b.aabb.min.x, s.center.x - s.radius),
				Math.max(b.aabb.min.y, s.center.y - s.radius),
				Math.max(b.aabb.min.z, s.center.z - s.radius)
			),
			new Vector3(
				Math.min(b.aabb.max.x, s.center.x + s.radius),
				Math.min(b.aabb.max.y, s.center.y + s.radius),
				Math.min(b.aabb.max.z, s.center.z + s.radius)
			)
		);
	}

	static box_cylinder (b: Box, c: Cylinder): Intersection {
		
	}

	static box_triangle (b: Box, t: Triangle): Intersection {
		const halfExtents = b.halfExtents;
		const bCenter = b.offset;

		const tv0 = new Vector3(
			t.a.x - bCenter.x,
			t.a.y - bCenter.y,
			t.a.z - bCenter.z
		);
		const tv1 = new Vector3(
			t.b.x - bCenter.x,
			t.b.y - bCenter.y,
			t.b.z - bCenter.z
		);
		const tv2 = new Vector3(
			t.c.x - bCenter.x,
			t.c.y - bCenter.y,
			t.c.z - bCenter.z
		);

		const e0 = new Vector3(
			tv1.x - tv0.x,
			tv1.y - tv0.y,
			tv1.z - tv0.z
		);
		const e1 = new Vector3(
			tv2.x - tv1.x,
			tv2.y - tv1.y,
			tv2.z - tv1.z
		);
		const e2 = new Vector3(
			tv0.x - tv2.x,
			tv0.y - tv2.y,
			tv0.z - tv2.z
		);

		if (Math.max(tv0.x, tv1.x, tv2.x) < -halfExtents.x || Math.min(tv0.x, tv1.x, tv2.x) > halfExtents.x) return null;
		if (Math.max(tv0.y, tv1.y, tv2.y) < -halfExtents.y || Math.min(tv0.y, tv1.y, tv2.y) > halfExtents.y) return null;
		if (Math.max(tv0.z, tv1.z, tv2.z) < -halfExtents.z || Math.min(tv0.z, tv1.z, tv2.z) > halfExtents.z) return null;

		function axisTest(ax, ay, az, e, ex, ey, ez) {
			// Project triangle points
			const p0 = tv0.x * ax + tv0.y * ay + tv0.z * az;
			const p1 = tv1.x * ax + tv1.y * ay + tv1.z * az;
			const p2 = tv2.x * ax + tv2.y * ay + tv2.z * az;

			const minP = Math.min(p0, p1, p2);
			const maxP = Math.max(p0, p1, p2);

			// Project AABB extents onto axis
			const r =
			halfExtents.x * Math.abs(ax) +
			halfExtents.y * Math.abs(ay) +
			halfExtents.z * Math.abs(az);

			return !(minP > r || maxP < -r);
		}

		const edges = [e0, e1, e2];
		const axes = [Vector3.XAxis, Vector3.YAxis, Vector3.ZAxis];

		for (const e of edges) {
			for (const a of axes) {
				const ax = e.y * a.z - e.z * a.y;
				const ay = e.z * a.x - e.x * a.z;
				const az = e.x * a.y - e.y * a.x;

				if (ax === 0 && ay === 0 && az === 0) continue;

				if (!axisTest(ax, ay, az, e, ex, ey, ez)) return null;
			}
		}

		const nx = t.plane[0];
		const ny = t.plane[1];
		const nz = t.plane[2];

		const d = tv0.x * nx + tv0.y * ny + tv0.z * nz;

		const r =
			halfExtents.x * Math.abs(nx) +
			halfExtents.y * Math.abs(ny) +
			halfExtents.z * Math.abs(nz);

		if (Math.abs(d) > r) return null;

		const triMin = new Vector3(
			Math.min(t.a.x, t.b.x, t.c.x),
			Math.min(t.a.y, t.b.y, t.c.y),
			Math.min(t.a.z, t,b.z, t.c.z)
		);
		const triMax = new Vector3(
			Math.max(t.a.x, t.b.x, t.c.x),
			Math.max(t.a.y, t.b.y, t.c.y),
			Math.max(t.a.z, t.b.z, t.c.z)
		);

		const outMin = new Vector3(
			Math.max(b.aabb.min.x, triMin.x),
			Math.max(b.aabb.min.y, triMin.y),
			Math.max(b.aabb.min.z, triMin.z)
		);

		const outMax = new Vector3(
			Math.min(b.aabb.max.x, triMax.x),
			Math.min(b.aabb.max.y, triMax.y),
			Math.min(b.aabb.max.z, triMax.z)
		);

		if (outMin.x > outMax.x ||
			outMin.y > outMax.y ||
			outMin.z > outMax.z) return null;

		return new AABB(outMin, outMax);
	}

	static sphere_cylinder (s: Sphere, c: Cylinder): Intersection {

	}

	static sphere_triangle (s: Sphere, t: Triangle): Intersection {

	}

	static cylinder_triangle (c: Cylinder, t: Triangle): Intersection {

	}
}