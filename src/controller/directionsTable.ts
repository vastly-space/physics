import Vector3 from "../math/vector3.js"

const DEG = 359;
const SCALE = 1000;

const dirXZ = new Array<Vector3>(DEG);
const SIN = new Int32Array(DEG);
const COS = new Int32Array(DEG);

for (let ang = 0; ang < DEG; ang++) {
    const rad = ang * Math.PI / 180;
    SIN[ang] = Math.round(Math.sin(rad) * SCALE);
    COS[ang] = Math.round(Math.cos(rad) * SCALE);
}

for (let ang = 0; ang < DEG; ang++) {
    const dz = COS[ang];
    const dx = SIN[ang];

    dirXZ[ang] = new Vector3(dx, 0, dz);
}

export interface Direction {
    direction: number;
    rotationAngle: number;
}

export function snapVecToDir (vx: number, vy: number, vz: number): number {
	const len = Math.hypot(vx, vz);
    if (len > 0) {
        vx /= len;
        vz /= len;
    }

    let angle = Math.atan2(vz, vx) * 180 / Math.PI;
    if (angle < 0) angle += DEG;

    return Math.round(angle) % DEG;
}

export function getVelocityFromDir (dir: Direction, pitchAngle: number, speed: number, out: Vector3) {
    let index = dir.direction + dir.rotationAngle;

    if (index < 0) index += DEG;
    if (index >= DEG) index -= DEG;

	const dx = dirXZ[index].x;
    const dz = dirXZ[index].z;

    const sinP = SIN[pitchAngle + 90];
    const cosP = COS[pitchAngle + 90];

    const nx = (dx * sinP) / SCALE;
    const nz = (dz * sinP) / SCALE;
    const ny = cosP;

    out.x = ((nx * speed) / SCALE) | 0;
    out.y = ((ny * speed) / SCALE) | 0;
    out.z = ((nz * speed) / SCALE) | 0;
}