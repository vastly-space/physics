import { World } from "./world.js"
import Vector3 from "./math/vector3.js"
import AABB from "./math/aabb.js"
import { divTrunc } from "./math/utils.js"
import { Octree, OctNode } from "./math/octree.js"
import StaticBody from "./physics/staticBody.js"
import KinematicBody from "./physics/kinematicBody.js"
import DynamicBody from "./physics/dynamicBody.js"
import Box from "./physics/shapes/box.js"
import Sphere from "./physics/shapes/sphere.js"
import Capsule from "./physics/shapes/capsule.js"
import Triangle from "./physics/shapes/triangle.js"
import { Tester } from "./physics/tester.js"
import Trimesh from "./physics/shapes/trimesh.js"
import { Controller } from "./controller/controller.js"
import { snapVecToDir, getVelocityFromDir } from "./controller/directionsTable.js"
import TransformationSystem from "./transformations/transformationSystem.js"
import { Transformation } from "./transformations/transformation.js"
import { solve } from "./solver.js"
import { Pool, VecPool } from "./utils/pool.js"
import { GLOBAL_SPEED, MAX_DOWN_SPEED, GLOBAL_GRAVITY, MAX_DEPENETRATION_ITERATIONS, MAX_SLOPE, TICKRATE, GROUND_PROBE, NUM_DIRECTIONS } from "./constants.js"

import type { WorldOptions } from "./world.js"
import type Shape from "./physics/shape.js"
import type { OctItem } from "./math/octree.js"
import type { ControllerState } from "./controller/controller.js"
import type { TransformationKind, ActionData } from "./transformations/transformation.js"
import type { ShapeWrapper, Collision } from "./physics/tester.js"
import type { CollisionEvent } from "./solver.js"

export type {
	WorldOptions,
	Shape,
	OctItem,
	ControllerState,
	TransformationKind,
	ActionData,
	ShapeWrapper,
	Collision,
	CollisionEvent
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
	Capsule,
	Triangle,
	Tester,
	Trimesh,
	Controller,
	snapVecToDir,
	getVelocityFromDir,
	TransformationSystem, 
	Transformation,
	solve,
	Pool,
	VecPool,
	MAX_DEPENETRATION_ITERATIONS,
	TICKRATE,
	GROUND_PROBE,
	NUM_DIRECTIONS
}