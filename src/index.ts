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
import Cylinder from "./physics/shapes/cylinder.js"
import Triangle from "./physics/shapes/triangle.js"
import { SAT } from "./physics/sat.js"
import Trimesh from "./physics/shapes/trimesh.js"
import { Controller } from "./controller/controller.js"
import { snapVecToDir, getVelocityFromDir } from "./controller/directionsTable.js"
import TransformationSystem from "./transformations/transformationSystem.js"
import { Transformation } from "./transformations/transformation.js"
import { solve, CollisionEventTypeMap } from "./solver.js"
import { ReliableChannel } from "./channels/reliableChannel.js"
import { Pool, VecPool } from "./utils/pool.js"

import type { WorldOptions } from "./world.js"
import type Shape from "./physics/shape.js"
import type { OctItem } from "./math/octree.js"
import type { ControllerState } from "./controller/controller.js"
import type { TransformationKind, ActionData } from "./transformations/transformation.js"
import type { ShapeWrapper, Collision } from "./physics/sat.js"
import type { CollisionEventType, CollisionEvent } from "./solver.js"
import type { CollisionListener } from "./channels/reliableChannel.js"

export type {
	WorldOptions,
	Shape,
	OctItem,
	ControllerState,
	TransformationKind,
	ActionData,
	ShapeWrapper,
	Collision,
	CollisionEventType,
	CollisionEvent,
	CollisionListener
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
	Cylinder,
	Triangle,
	SAT,
	Trimesh,
	Controller,
	snapVecToDir,
	getVelocityFromDir,
	TransformationSystem, 
	Transformation,
	solve,
	CollisionEventTypeMap,
	ReliableChannel, 
	Pool,
	VecPool 
}