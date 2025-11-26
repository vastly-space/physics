import Vector3 from "../math/vector3.js"
import AABB from "../math/aabb.js"
import type StaticBody from "./staticBody.js"

export default interface Shape {
	type: string;
	offset: Vector3;
	aabb: AABB;
	translated: (vec: Vector3) => Shape;
}