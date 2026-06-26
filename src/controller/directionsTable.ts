import Vector3 from "../math/vector3.js"
import Constants from "../constants.js"

const SCALE = 1000;

export interface Direction {
    direction: number;
    rotationAngle: number;
}

export default class DirectionsTable {
    private constants: Constants;
    private dirXZ: Array<Vector3>;
    private SIN: Int32Array;
    private COS: Int32Array;

    constructor (constants: Constants) {
        this.constants = constants;
        this.dirXZ = new Array<Vector3>(constants.NUM_DIRECTIONS);
        this.SIN = new Int32Array(constants.NUM_DIRECTIONS);
        this.COS = new Int32Array(constants.NUM_DIRECTIONS);

        for (let ang = 0; ang < constants.NUM_DIRECTIONS; ang++) {
            const rad = ang * Math.PI / 180;
            this.SIN[ang] = Math.round(Math.sin(rad) * SCALE);
            this.COS[ang] = Math.round(Math.cos(rad) * SCALE);
        }

        for (let ang = 0; ang < constants.NUM_DIRECTIONS; ang++) {
            const dz = this.COS[ang];
            const dx = this.SIN[ang];

            this.dirXZ[ang] = new Vector3(dx, 0, dz);
        }
    }

    snapVecToDir (vx: number, vz: number): number {
        const len = Math.hypot(vx, vz);
        if (len > 0) {
            vx /= len;
            vz /= len;
        }

        let angle = Math.atan2(vx, vz) * 180 / Math.PI;
        if (angle < 0) angle += this.constants.NUM_DIRECTIONS;

        return Math.round(angle) % this.constants.NUM_DIRECTIONS;
    }

    getVelocityFromDir (dir: Direction, pitchAngle: number, speed: number, out: Vector3) {
        let index = dir.direction + dir.rotationAngle;

        if (index < 0) index += this.constants.NUM_DIRECTIONS;
        if (index >= this.constants.NUM_DIRECTIONS) index -= this.constants.NUM_DIRECTIONS;

        const dx = this.dirXZ[index].x;
        const dz = this.dirXZ[index].z;

        const sinP = this.SIN[pitchAngle + 90];
        const cosP = this.COS[pitchAngle + 90];

        const nx = (dx * sinP) / SCALE;
        const nz = (dz * sinP) / SCALE;
        const ny = cosP;

        out.x = ((nx * speed) / SCALE) | 0;
        out.y = ((ny * speed) / SCALE) | 0;
        out.z = ((nz * speed) / SCALE) | 0;
    }
}