import Vector3 from "./math/vector3.js"
import AABB from "./math/aabb.js"
import { Octree } from "./math/octree.js"
import KinematicBody from "./physics/kinematicBody.js"
import DynamicBody from "./physics/dynamicBody.js"

export default function solve (staticOctree: Octree, statics: Map<number, StaticBody>, kinematics: Map<number, KinematicBody>, dynamics: Map<number, DynamicBody>) {
	const utilityVec = new Vector3();

	for (const [id, body] of dynamics) {
		const candidates = statics.queryAABB(body.aabb, body.mask);

		for (let i=0; i<candidates.length; i++) {

		}
	}
}