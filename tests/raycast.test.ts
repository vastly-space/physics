import { describe, it, expect } from "vitest"
import { SAT } from "../src/physics/sat.js"

import Vector3 from "../src/math/vector3.js"
import AABB from "../src/math/aabb.js"

import Box from "../src/physics/shapes/box.js"
import Sphere from "../src/physics/shapes/sphere.js"
import Capsule from "../src/physics/shapes/capsule.js"
import Triangle from "../src/physics/shapes/triangle.js"

describe("Raycast tests", () => {
	it("Ray vs Box, fail", () => {
		const shape = new Box(new Vector3(0,0,0), 2, 2, 2);
		const from = new Vector3(3, 0, 0);
		const to = new Vector3(3, 10, 0);

		let testResult = SAT.ray_box({ shape: shape, parentOffset: new Vector3(0,0,0) }, from, to);

		expect(testResult).toBe(null);

		to.set(3,0,10);

		testResult = SAT.ray_box({ shape: shape, parentOffset: new Vector3(0,0,0) }, from, to);

		expect(testResult).toBe(null);

		to.set(10,0,0);

		testResult = SAT.ray_box({ shape: shape, parentOffset: new Vector3(0,0,0) }, from, to);

		expect(testResult).toBe(null);
	});

	it("Ray vs Box, success", () => {
		const shape = new Box(new Vector3(0,0,0), 4, 4, 4);
		const from = new Vector3(3, 0, 0);
		const to = new Vector3(-10, 0, 0);

		let testResult = SAT.ray_box({ shape: shape, parentOffset: new Vector3(0,0,0) }, from, to);

		expect(testResult).not.toBe(null);

		from.set(0,3,0);
		to.set(0,-10,0);

		testResult = SAT.ray_box({ shape: shape, parentOffset: new Vector3(0,0,0) }, from, to);

		expect(testResult).not.toBe(null);

		from.set(0,0,3);
		to.set(0,0,-10);

		testResult = SAT.ray_box({ shape: shape, parentOffset: new Vector3(0,0,0) }, from, to);

		expect(testResult).not.toBe(null);
	});

	it("Ray vs Sphere, fail", () => {
		const shape = new Sphere(new Vector3(0,0,0), 2);
		const from = new Vector3(3, 0, 0);
		const to = new Vector3(3, -10, 0);

		let testResult = SAT.ray_box({ shape: shape, parentOffset: new Vector3(0,0,0) }, from, to);

		expect(testResult).toBe(null);

		to.set(3,0,10);

		testResult = SAT.ray_box({ shape: shape, parentOffset: new Vector3(0,0,0) }, from, to);

		expect(testResult).toBe(null);

		to.set(10,0,0);

		testResult = SAT.ray_box({ shape: shape, parentOffset: new Vector3(0,0,0) }, from, to);

		expect(testResult).toBe(null);
	});

	it("Ray vs Sphere, success", () => {
		const shape = new Sphere(new Vector3(0,0,0), 2);
		const from = new Vector3(3, 0, 0);
		const to = new Vector3(-10, 0, 0);

		let testResult = SAT.ray_box({ shape: shape, parentOffset: new Vector3(0,0,0) }, from, to);

		expect(testResult).not.toBe(null);

		from.set(0,3,0);
		to.set(0,-10,0);

		testResult = SAT.ray_box({ shape: shape, parentOffset: new Vector3(0,0,0) }, from, to);

		expect(testResult).not.toBe(null);

		from.set(0,0,3);
		to.set(0,0,-10);

		testResult = SAT.ray_box({ shape: shape, parentOffset: new Vector3(0,0,0) }, from, to);

		expect(testResult).not.toBe(null);
	});

	// it("Ray vs Capsule, fail", () => {
	// 	const shape = new Cylinder(new Vector3(0,0,0), 4, 2);
	// 	const from = new Vector3(3, 0, 0);
	// 	const to = new Vector3(3, -10, 0);

	// 	let testResult = SAT.ray_box({ shape: shape, parentOffset: new Vector3(0,0,0) }, from, to);

	// 	expect(testResult).toBe(null);

	// 	to.set(3,0,10);

	// 	testResult = SAT.ray_box({ shape: shape, parentOffset: new Vector3(0,0,0) }, from, to);

	// 	expect(testResult).toBe(null);

	// 	to.set(10,0,0);

	// 	testResult = SAT.ray_box({ shape: shape, parentOffset: new Vector3(0,0,0) }, from, to);

	// 	expect(testResult).toBe(null);
	// });

	// it("Ray vs Capsule, success", () => {
	// 	const shape = new Cylinder(new Vector3(0,0,0), 4, 2);
	// 	const from = new Vector3(3, 0, 0);
	// 	const to = new Vector3(-10, 0, 0);

	// 	let testResult = SAT.ray_box({ shape: shape, parentOffset: new Vector3(0,0,0) }, from, to);

	// 	expect(testResult).not.toBe(null);

	// 	from.set(0,3,0);
	// 	to.set(0,-10,0);

	// 	testResult = SAT.ray_box({ shape: shape, parentOffset: new Vector3(0,0,0) }, from, to);

	// 	expect(testResult).not.toBe(null);

	// 	from.set(0,0,3);
	// 	to.set(0,0,-10);

	// 	testResult = SAT.ray_box({ shape: shape, parentOffset: new Vector3(0,0,0) }, from, to);

	// 	expect(testResult).not.toBe(null);
	// });

	it("Ray vs Triangle, fail", () => {
		const shape = new Triangle(
			new Vector3(1,5,0),
			new Vector3(1,5,1),
			new Vector3(0,5,1)
		);
		const from = new Vector3(3,0,0);
		const to = new Vector3(-10,0,0);

		let testResult = SAT.ray_triangle({ shape: shape, parentOffset: new Vector3() }, from, to);

		expect(testResult).toBe(null);

		from.set(7,0,0);
		to.set(7,10,0);

		testResult = SAT.ray_triangle({ shape: shape, parentOffset: new Vector3() }, from, to);

		expect(testResult).toBe(null);

		from.set(0,0,10);
		to.set(0,10,10);
		
		testResult = SAT.ray_triangle({ shape: shape, parentOffset: new Vector3() }, from, to);

		expect(testResult).toBe(null);
	});

	it("Ray vs Triangle, success", () => {
		const shape = new Triangle(
			new Vector3(0,5,3),
			new Vector3(3,5,3),
			new Vector3(3,5,0)
		);
		const from = new Vector3(0,0,0);
		const to = new Vector3(3,10,5);

		let testResult = SAT.ray_triangle({ shape: shape, parentOffset: new Vector3() }, from, to);

		expect(testResult).not.toBe(null);
	});
});