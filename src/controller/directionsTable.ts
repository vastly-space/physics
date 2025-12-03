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
    const dx = COS[ang];
    const dz = SIN[ang];

    dirXZ[ang] = new Vector3(dx, 0, dz);
}

export function snapVecToDir (vx: number, vz: number): number {
	const len = Math.hypot(vx, vz);
    if (len > 0) {
        vx /= len;
        vz /= len;
    }

    let angle = Math.atan2(vz, vx) * 180 / Math.PI;
    if (angle < 0) angle += DEG;

    return Math.round(angle) % DEG;
}

export function getVelocityFromDir (index: number, pitchAngle: number, speed: number, out: Vector3) {
	const dx = dirXZ[index].x;
    const dz = dirXZ[index].z;

    const sinP = SIN[pitchAngle + 90];
    const cosP = COS[pitchAngle + 90];

    const nx = (dx * cosP) / SCALE;
    const nz = (dz * cosP) / SCALE;
    const ny = sinP;

    out.x = ((nx * speed) / SCALE) | 0;
    out.y = ((ny * speed) / SCALE) | 0;
    out.z = ((nz * speed) / SCALE) | 0;
}