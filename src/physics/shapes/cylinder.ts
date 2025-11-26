import Vector3 from "../../math/vector3.js"
import AABB from "../../math/aabb.js"
import { divTrunc } from "../../math/utils.js"
import type Shape from "../shape.js"

export default class Cylinder implements Shape {
	public readonly type: string = "cylinder";
	public readonly offset: Vector3;
	public readonly aabb: AABB;
	public readonly alignmentAxis: string;
	public readonly height: number;
	public readonly radius: number;

	constructor (offset: Vector3, alignmentAxis: string, height: number, radius: number) {
		this.offset = offset;
		this.alignmentAxis = alignmentAxis;
		this.height = height;
		this.radius = radius;

		const hh = divTrunc(this.height, 2);

		switch (this.alignmentAxis) {
			case "X":
				this.aabb = new AABB(
					new Vector3(-hh, -this.radius, -this.radius),
					new Vector3(hh, this.radius, -this.radius)
				);
				break;
			case "Y":
				this.aabb = new AABB(
					new Vector3(-this.radius, -hh, -this.radius),
					new Vector3(this.radius, hh, this.radius)
				);
				break;
			case "Z":
				this.aabb = new AABB(
					new Vector3(-this.radius, -this.radius, -hh),
					new Vector3(this.radius, this.radius, hh)
				);
				break;
			default:
				throw new Error("Cylinder shape axis not specified");
		}

		this.aabb.translate(this.offset);
	}

	translated (vec: Vector3): Shape {
		return new Cylinder(
			this.offset.add(vec),
			this.alignmentAxis,
			this.height,
			this.radius
		);
	}
}