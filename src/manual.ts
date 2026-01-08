import Vector3 from "./math/vector3.js"

import type Shape from "./physics/shape.js"
import Box from "./physics/shapes/box.js"
import Sphere from "./physics/shapes/sphere.js"
import Capsule from "./physics/shapes/capsule.js"
import Trimesh from "./physics/shapes/trimesh.js"
import Triangle from "./physics/shapes/triangle.js"

import StaticBody from "./physics/staticBody.js"
import KinematicBody from "./physics/kinematicBody.js"
import DynamicBody from "./physics/dynamicBody.js"

import PacketProcessor from "./network/packetProcessor.js"

// fill test data
let bodyCounter = 0;
let tick = 42;
let statics: Map<number, StaticBody> = new Map();
let kinematics: Map<number, KinematicBody> = new Map();
let dynamics: Map<number, DynamicBody> = new Map();

let shapes: Shape[];
let body: StaticBody | KinematicBody | DynamicBody;

shapes = [
	new Box(new Vector3(), 10, 20, 30)
];
body = new StaticBody(bodyCounter++, shapes, new Vector3(100, 1000, 2500), false);
statics.set(body.id, body as StaticBody);
shapes = [
	new Sphere(new Vector3(500,100,100), 100),
	new Box(new Vector3(), 80, 80, 80)
];
body = new StaticBody(bodyCounter++, shapes, new Vector3(1000, 0, 0), true, 8);
statics.set(body.id, body as StaticBody);
shapes = [
	new Trimesh(new Vector3(), [
		0, 0, 0,
		1000, 0, 0,
		1000, 0, 1000,
		0, 0, 1000
	], [
		0, 1, 2,
		0, 2, 3
	]),
	new Capsule(new Vector3(), 500, 100)
];
body = new StaticBody(bodyCounter++, shapes, new Vector3(0, 1000, 0), false, 2);
statics.set(body.id, body as StaticBody);
shapes = [
	new Box(new Vector3(), 5000, 5000, 5000)
];
body = new KinematicBody(bodyCounter++, shapes, new Vector3(0, -10000, 0), true);
kinematics.set(body.id, body as KinematicBody);
shapes = [
	new Sphere(new Vector3(), 100)
];
body = new DynamicBody(bodyCounter++, shapes, new Vector3(), false);
dynamics.set(body.id, body as DynamicBody);

const serialized = PacketProcessor.serializeInitialPacket(tick, statics, kinematics, dynamics);

debugger;