import { World } from "./world.js"
import Vector3 from "./math/vector3.js"
import Quaternion from "./math/quaternion.js"
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
import DirectionsTable from "./controller/directionsTable.js"
import TransformationSystem from "./transformations/transformationSystem.js"
import { Transformation } from "./transformations/transformation.js"
import { Pool, VecPool } from "./utils/pool.js"
import Constants from "./constants.js"
import Scheduler from "./scheduler.js"
import PacketProcessor from "./network/packetProcessor.js"
import SnapshotBuffer from "./network/snapshotBuffer.js"

import type { WorldOptions } from "./world.js"
import type Shape from "./physics/shape.js"
import type { OctItem } from "./math/octree.js"
import type { ControllerState } from "./controller/controller.js"
import type { ActionData, RotationData } from "./transformations/transformationSystem.js"
import type { ShapeWrapper, Collision } from "./physics/tester.js"
import type { CollisionEvent } from "./solver.js"
import type { Impulse } from "./physics/dynamicBody.js"
import type { BodyState, SnapshotChunk, InitialPacket } from "./network/packetProcessor.js"
import type { Snapshot } from "./network/snapshotBuffer.js"

export type {
	WorldOptions,
	Shape,
	OctItem,
	ControllerState,
	ActionData,
	RotationData,
	ShapeWrapper,
	Collision,
	CollisionEvent,
	Impulse,
	BodyState,
	SnapshotChunk,
	InitialPacket,
	Snapshot
}

export {
	World,
	Vector3,
	Quaternion,
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
	DirectionsTable,
	TransformationSystem, 
	Transformation,
	Pool,
	VecPool,
	Scheduler,
	PacketProcessor,
	SnapshotBuffer,
	Constants
}