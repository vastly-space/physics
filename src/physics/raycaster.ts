import Vector3 from "../math/vector3.js"
import AABB from "../math/aabb.js"
import type Shape from "./shape.js"
import { VecPool } from "../utils/pool.js"

import Box from "./shapes/box.js"
import Sphere from "./shapes/sphere.js"
import Cylinder from "./shapes/cylinder.js"
import Triangle from "./shapes/triangle.js"

import { Octree } from "../math/octree.js"
import type { OctNode } from "../math/octree.js"
import StaticBody from "./staticBody.js"
import KinematicBody from "./kinematicBody.js"
import DynamicBody from "./dynamicBody.js"

export interface RaycastResult {
	body: StaticBody | KinematicBody | DynamicBody;
	distance: number;
	normal: Vector3;
}

export class Raycaster {
	static test (origin: Vector3, direction: Vector3, statics: Map<number, StaticBody>, octree: Octree, kinematics: Map<number, KinematicBody>, dynamics: Map<number, DynamicBody>): RaycastResult[] | null {
		
	}
}