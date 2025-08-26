import World from "./world.js"
import Vector3 from "./math/vector3.js"
import AABB from "./math/aabb.js"
import { divTrunc } from "./math/utils.js"
import { Octree, OctNode } from "./math/octree.js"
import StaticBody from "./physics/staticBody.js"
import KinematicBody from "./physics/kinematicBody.js"
import DynamicBody from "./physics/dynamicBody.js"
import Box from "./physics/shapes/box.js"
import Sphere from "./physics/shapes/sphere.js"
import Trimesh from "./physics/shapes/trimesh.js"

import type Shape from "./physics/shape.js"
import type { OctItem } from "./math/octree.js"

export type {
	Shape,
	OctItem
}

export {
	World,
	Vector3,
	AABB,
	divTrunc,
	Octree,
	OctNode,
	StaticBody,
	KinematicBody,
	DynamicBody,
	Box,
	Sphere,
	Trimesh
}