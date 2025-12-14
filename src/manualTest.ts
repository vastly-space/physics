import { SAT } from "./physics/sat.js"

import Vector3 from "./math/vector3.js"
import AABB from "./math/aabb.js"

import Box from "./physics/shapes/box.js"
import Sphere from "./physics/shapes/sphere.js"
import Cylinder from "./physics/shapes/cylinder.js"
import Triangle from "./physics/shapes/triangle.js"

const shape = new Triangle(
	new Vector3(0,5,3),
	new Vector3(3,5,3),
	new Vector3(3,5,0)
);
const from = new Vector3(0,0,0);
const to = new Vector3(3,10,5);

let testResult = SAT.ray_triangle({ shape: shape, parentOffset: new Vector3() }, from, to);