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
import {
	GLOBAL_SPEED,
	MAX_DOWN_SPEED,
	GLOBAL_GRAVITY,
	MAX_DEPENETRATION_ITERATIONS,
	MAX_SLOPE,
	STEP_UP_HEIGHT,
	TICKRATE,
	GROUND_PROBE,
	NUM_DIRECTIONS,
	SNAPSHOT_INTERVAL,
	SCHEDULER_TRAIL_SNAP,
	SCHEDULER_TRAIL_BOOST,
	MAX_INTERPOLATION_TICKS,
	CLIENT_DELAY,
	WORLD_MODE,

	SET_GLOBAL_SPEED,
	SET_MAX_DOWN_SPEED,
	SET_GLOBAL_GRAVITY,
	SET_MAX_DEPENETRATION_ITERATIONS,
	SET_MAX_SLOPE,
	SET_STEP_UP_HEIGHT,
	SET_TICKRATE,
	SET_GROUND_PROBE,
	SET_NUM_DIRECTIONS,
	SET_SNAPSHOT_INTERVAL,
	SET_SCHEDULER_TRAIL_SNAP,
	SET_SCHEDULER_TRAIL_BOOST,
	SET_MAX_INTERPOLATION_TICKS,
	SET_CLIENT_DELAY,
	SET_CORRECTION_TICKS,
	SET_WORLD_MODE
} from "./constants.js"
import Scheduler from "./scheduler.js"
import PacketProcessor from "./network/packetProcessor.js"
import SnapshotBuffer from "./network/snapshotBuffer.js"

import type { WorldOptions } from "./world.js"
import type Shape from "./physics/shape.js"
import type { OctItem } from "./math/octree.js"
import type { ControllerState } from "./controller/controller.js"
import type { ActionData } from "./transformations/transformation.js"
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
	Scheduler,
	PacketProcessor,
	SnapshotBuffer,

	GLOBAL_SPEED,
	MAX_DOWN_SPEED,
	GLOBAL_GRAVITY,
	MAX_DEPENETRATION_ITERATIONS,
	MAX_SLOPE,
	STEP_UP_HEIGHT,
	TICKRATE,
	GROUND_PROBE,
	NUM_DIRECTIONS,
	SNAPSHOT_INTERVAL,
	SCHEDULER_TRAIL_SNAP,
	SCHEDULER_TRAIL_BOOST,
	MAX_INTERPOLATION_TICKS,
	CLIENT_DELAY,
	WORLD_MODE,

	SET_GLOBAL_SPEED,
	SET_MAX_DOWN_SPEED,
	SET_GLOBAL_GRAVITY,
	SET_MAX_DEPENETRATION_ITERATIONS,
	SET_MAX_SLOPE,
	SET_STEP_UP_HEIGHT,
	SET_TICKRATE,
	SET_GROUND_PROBE,
	SET_NUM_DIRECTIONS,
	SET_SNAPSHOT_INTERVAL,
	SET_SCHEDULER_TRAIL_SNAP,
	SET_SCHEDULER_TRAIL_BOOST,
	SET_MAX_INTERPOLATION_TICKS,
	SET_CLIENT_DELAY,
	SET_CORRECTION_TICKS,
	SET_WORLD_MODE
}