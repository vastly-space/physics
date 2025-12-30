import Vector3 from "../math/vector3.js"
import { NUM_DIRECTIONS } from "../constants.js"

const SCALE = 1000;

let dirXZ: Array<Vector3> = new Array<Vector3>(NUM_DIRECTIONS);
let SIN: Int32Array = new Int32Array(NUM_DIRECTIONS);
let COS: Int32Array = new Int32Array(NUM_DIRECTIONS);

export function generateDirectionsTable () {
    dirXZ = new Array<Vector3>(NUM_DIRECTIONS);
    SIN = new Int32Array(NUM_DIRECTIONS);
    COS = new Int32Array(NUM_DIRECTIONS);

    for (let ang = 0; ang < NUM_DIRECTIONS; ang++) {
        const rad = ang * Math.PI / 180;
        SIN[ang] = Math.round(Math.sin(rad) * SCALE);
        COS[ang] = Math.round(Math.cos(rad) * SCALE);
    }

    for (let ang = 0; ang < NUM_DIRECTIONS; ang++) {
        const dz = COS[ang];
        const dx = SIN[ang];

        dirXZ[ang] = new Vector3(dx, 0, dz);
    }
}

export interface Direction {
    direction: number;
    rotationAngle: number;
}

export function snapVecToDir (vx: number, vz: number): number {
	const len = Math.hypot(vx, vz);
    if (len > 0) {
        vx /= len;
        vz /= len;
    }

    let angle = Math.atan2(vx, vz) * 180 / Math.PI;
    if (angle < 0) angle += NUM_DIRECTIONS;

    return Math.round(angle) % NUM_DIRECTIONS;
}

export function getVelocityFromDir (dir: Direction, pitchAngle: number, speed: number, out: Vector3) {
    let index = dir.direction + dir.rotationAngle;

    if (index < 0) index += NUM_DIRECTIONS;
    if (index >= NUM_DIRECTIONS) index -= NUM_DIRECTIONS;

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