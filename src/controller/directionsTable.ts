import Vector3 from "../math/vector3.js"

export default class DirectionsTable {
	public static readonly FP: number = 1 << 16;
	public static readonly INV_SQRT2: number = 46341;
	public static Directions: Vector3[] = [];
	private static q90: number = 0;
	private static q180: number = 0;

	static generateDirectionsTable (N: number) {
		const dirs: Vector3[] = [];
		for (let i = 0; i < N; i++) {
			const angle = (2 * Math.PI * i) / N;
			const x = Math.cos(angle);
			const z = Math.sin(angle);

			const fx = Math.round(x * DirectionsTable.FP);
			const fz = Math.round(z * DirectionsTable.FP);

			dirs.push(new Vector3(fx, 0, fz));
		}
		DirectionsTable.Directions = dirs;
		DirectionsTable.q90 = dirs.length >> 2;
		DirectionsTable.q180 = dirs.length >> 1;
	}

	static snapDirection (x: number, z: number): Vector3 {
		if (x === 0 && z === 0) return new Vector3(0, 0, 0);

		const angle = Math.atan2(z, x);
		const angleNorm = angle < 0 ? angle + 2 * Math.PI : angle;
		const idx = Math.round(angleNorm / (2 * Math.PI) * DirectionsTable.Directions.length) % DirectionsTable.Directions.length;

		return DirectionsTable.Directions[idx];
	}

	static snapDirectionDot(x: number, z: number): Vector3 {
		if (x === 0 && z === 0) return new Vector3(0, 0, 0);

		const len = Math.hypot(x, z);
		const nx = x / len;
		const nz = z / len;

		let bestIdx = 0;
		let bestDot = -Infinity;
		for (let i = 0; i < DirectionsTable.Directions.length; i++) {
			const d = DirectionsTable.Directions[i];
			
			const dot = (nx * d.x + nz * d.z) / DirectionsTable.FP;
			if (dot > bestDot) {
				bestDot = dot;
				bestIdx = i;
			}
		}
		return DirectionsTable.Directions[bestIdx];
	}

	static left (dir: number) {
		const a = dir - DirectionsTable.q90;

		return (a % DirectionsTable.Directions.length + DirectionsTable.Directions.length) % DirectionsTable.Directions.length;
	}

	static right (dir: number) {
		const a = dir + DirectionsTable.q90;

		return a % DirectionsTable.Directions.length;
	}

	static inverse (dir: number) {
		const a = dir + DirectionsTable.q180;

		return a % DirectionsTable.Directions.length;
	}
}