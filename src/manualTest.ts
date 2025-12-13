import { SAT } from "./physics/sat.js"

import Vector3 from "./math/vector3.js"
import AABB from "./math/aabb.js"

import Box from "./physics/shapes/box.js"
import Sphere from "./physics/shapes/sphere.js"
import Cylinder from "./physics/shapes/cylinder.js"
import Triangle from "./physics/shapes/triangle.js"

const c1 = new Cylinder(new Vector3(0, 0, 0), 4, 2);
const c2 = new Cylinder(new Vector3(0, 0, 0), 4, 2);

const testResult = SAT.test(
	{ shape: c1, parentOffset: new Vector3(0,0,0) },
	{ shape: c2, parentOffset: new Vector3(0,2,0) },
	new Vector3(0,0,0),
	new Vector3(0,0,0)
);