import { SAT } from "./physics/sat.js"

import Vector3 from "./math/vector3.js"
import AABB from "./math/aabb.js"

import Box from "./physics/shapes/box.js"
import Sphere from "./physics/shapes/sphere.js"
import Cylinder from "./physics/shapes/cylinder.js"
import Triangle from "./physics/shapes/triangle.js"

const c = new Cylinder(new Vector3(0,0,0), 4, 4);
const b = new Box(new Vector3(0,0,0), 10, 2, 10);

debugger;
const testResult = SAT.test(
	{ shape: c, parentOffset: new Vector3(0,5,0) },
	{ shape: b, parentOffset: new Vector3(0,0,0) },
	new Vector3(0,-6,0),
	new Vector3(0,0,0)
);