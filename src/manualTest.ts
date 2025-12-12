import { SAT } from "./physics/sat.js"

import Vector3 from "./math/vector3.js"
import AABB from "./math/aabb.js"

import Box from "./physics/shapes/box.js"
import Sphere from "./physics/shapes/sphere.js"
import Cylinder from "./physics/shapes/cylinder.js"
import Triangle from "./physics/shapes/triangle.js"

const s1 = new Sphere(new Vector3(0,0,0), 4);
const s2 = new Sphere(new Vector3(0,0,0), 4);

const testResult = SAT.test(
	{ shape: s1, parentOffset: new Vector3(0,0,0)},
	{ shape: s2, parentOffset: new Vector3(0,1,0)},
	new Vector3(0, 0, 0),
	new Vector3(0, 0, 0)
);