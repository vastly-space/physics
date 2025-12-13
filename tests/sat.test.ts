import { describe, it, expect } from "vitest"
import { SAT } from "../src/physics/sat.js"

import Vector3 from "../src/math/vector3.js"
import AABB from "../src/math/aabb.js"

import Box from "../src/physics/shapes/box.js"
import Sphere from "../src/physics/shapes/sphere.js"
import Cylinder from "../src/physics/shapes/cylinder.js"
import Triangle from "../src/physics/shapes/triangle.js"

describe("SAT tests", () => {
	it("swept interval test", () => {
		// static non-intersecting
		expect(SAT.swept_interval_test(0, 5, 6, 7, 0)).toBe(null);
		expect(SAT.swept_interval_test(0, 5,-8, -2, 0)).toBe(null);
		// static intersecting
		expect(SAT.swept_interval_test(0, 5, 3, 7, 0)).toEqual([0,1,2]);
		expect(SAT.swept_interval_test(-4, 5,-8, -2, 0)).toEqual([0,1,2]);
		// moving non-intersecting
		const sweptNeg = SAT.swept_interval_test(0, 5, 10, 15, -3)
		const sweptPos = SAT.swept_interval_test(0, 5, 10, 15, 1);
		expect(sweptNeg[0]).toBeLessThan(0);
		expect(sweptNeg[1]).toBeLessThan(0);
		expect(sweptPos[0]).toBeGreaterThan(1);
		expect(sweptPos[1]).toBeGreaterThan(1);
		// moving intersecting, only enter
		const sweptOk1 = SAT.swept_interval_test(0, 5, 6, 8, 2);
		expect(sweptOk1[0]).toBeGreaterThan(0);
		expect(sweptOk1[0]).toBeLessThan(1);
		expect(sweptOk1[1]).toBeGreaterThan(1);
		// moving intersecting, only exit
		const sweptOk2 = SAT.swept_interval_test(0, 5, 4, 8, -2);
		expect(sweptOk2[1]).toBeGreaterThan(0);
		expect(sweptOk2[1]).toBeLessThan(1);
		expect(sweptOk2[0]).toBeLessThan(0);
		// moving intersecting, enter + exit
		const sweptOk3 = SAT.swept_interval_test(0, 1, 2, 3, 4);
		expect(sweptOk3[0]).toBeGreaterThan(0);
		expect(sweptOk3[0]).toBeLessThan(1);
		expect(sweptOk3[1]).toBeGreaterThan(0);
		expect(sweptOk3[1]).toBeLessThan(1);
	});

	it("AABB x AABB static non intersecting test", () => {
		const b1 = new Box(new Vector3(0, 0, 0), 4, 4, 4);
		const b2 = new Box(new Vector3(0, 10, 0), 4, 4, 4);

		expect(SAT.test(
			{ shape: b1, parentOffset: new Vector3()},
			{ shape: b2, parentOffset: new Vector3()},
			new Vector3(0, 0, 0),
			new Vector3(0, 0, 0)
		)).toBe(null);
	});

	it("AABB x AABB static intersecting test", () => {
		const b1 = new Box(new Vector3(0, 0, 0), 4, 4, 4);
		const b2 = new Box(new Vector3(0, 4, 0), 4, 4, 4);

		const testResult = SAT.test(
			{ shape: b1, parentOffset: new Vector3()},
			{ shape: b2, parentOffset: new Vector3()},
			new Vector3(0, 0, 0),
			new Vector3(0, 0, 0)
		);

		expect(testResult).not.toBe(null);
		expect(testResult.tEnter).toBe(0);
		expect(testResult.tExit).toBe(1);
		expect(testResult.normal.x).toBeCloseTo(0);
		expect(testResult.normal.y).toBeCloseTo(-1);
		expect(testResult.normal.z).toBeCloseTo(0);
	});

	it("AABB x AABB moving non intersecting test", () => {
		const b1 = new Box(new Vector3(0, 0, 0), 4, 4, 4);
		const b2 = new Box(new Vector3(0, 6, 0), 4, 4, 4);

		expect(SAT.test(
			{ shape: b1, parentOffset: new Vector3()},
			{ shape: b2, parentOffset: new Vector3()},
			new Vector3(0, 1, 0),
			new Vector3(4, 0, 0)
		)).toBe(null);
	});

	it("AABB x AABB moving intersecting test", () => {
		const b1 = new Box(new Vector3(0, 0, 0), 4, 4, 4);
		const b2 = new Box(new Vector3(2, 6, 0), 4, 4, 4);

		const testResult = SAT.test(
			{ shape: b1, parentOffset: new Vector3()},
			{ shape: b2, parentOffset: new Vector3()},
			new Vector3(0, 1, 0),
			new Vector3(0, -1, 0)
		);

		expect(testResult).not.toBe(null);
		expect(testResult.tEnter).toBe(1);
		expect(testResult.normal.x).toBeCloseTo(0);
		expect(testResult.normal.y).toBeCloseTo(-1);
		expect(testResult.normal.z).toBeCloseTo(0);
	});

	it("Sphere x Sphere static non intersecting", () => {
		const s1 = new Sphere(new Vector3(0,0,0), 4);
		const s2 = new Sphere(new Vector3(0,0,0), 4);

		const testResult = SAT.test(
			{ shape: s1, parentOffset: new Vector3(0,0,0)},
			{ shape: s2, parentOffset: new Vector3(0,10,0)},
			new Vector3(0, 0, 0),
			new Vector3(0, 0, 0)
		);

		expect(testResult).toBe(null);
	});

	it("Sphere x Sphere static intersecting", () => {
		const s1 = new Sphere(new Vector3(0,0,0), 4);
		const s2 = new Sphere(new Vector3(0,0,0), 4);

		const testResult = SAT.test(
			{ shape: s1, parentOffset: new Vector3(0,0,0)},
			{ shape: s2, parentOffset: new Vector3(0,1,0)},
			new Vector3(0, 0, 0),
			new Vector3(0, 0, 0)
		);

		expect(testResult).not.toBe(null);
		expect(testResult.normal.x).toBeCloseTo(0);
		expect(testResult.normal.y).toBeCloseTo(-1);
		expect(testResult.normal.z).toBeCloseTo(0);
	});

	it("Sphere x Sphere moving non intersecting", () => {
		const s1 = new Sphere(new Vector3(0,0,0), 4);
		const s2 = new Sphere(new Vector3(0,0,0), 4);

		const testResult = SAT.test(
			{ shape: s1, parentOffset: new Vector3(0,0,0)},
			{ shape: s2, parentOffset: new Vector3(0,10,0)},
			new Vector3(0, 0, 0),
			new Vector3(0, -1, 0)
		);

		expect(testResult).toBe(null);
	});

	it("Sphere x Sphere moving intersecting", () => {
		const s1 = new Sphere(new Vector3(0,0,0), 4);
		const s2 = new Sphere(new Vector3(0,0,0), 4);

		const testResult = SAT.test(
			{ shape: s1, parentOffset: new Vector3(0,0,0)},
			{ shape: s2, parentOffset: new Vector3(0,10,0)},
			new Vector3(0, 0, 0),
			new Vector3(0, -3, 0)
		);

		expect(testResult).not.toBe(null);
		expect(testResult.normal.x).toBeCloseTo(0);
		expect(testResult.normal.y).toBeCloseTo(-1);
		expect(testResult.normal.z).toBeCloseTo(0);
	});

	it("Sphere x AABB static non intersecting", () => {
		const s = new Sphere(new Vector3(0,0,0), 4);
		const b = new Box(new Vector3(0,0,0), 2, 2, 2);

		const testResult = SAT.test(
			{ shape: s, parentOffset: new Vector3(0,0,0)},
			{ shape: b, parentOffset: new Vector3(0,10,0)},
			new Vector3(0, 0, 0),
			new Vector3(0, 0, 0)
		);

		expect(testResult).toBe(null);
	});

	it("Sphere x AABB static intersecting", () => {
		const s = new Sphere(new Vector3(0,0,0), 4);
		const b = new Box(new Vector3(0,0,0), 2, 2, 2);

		const testResult = SAT.test(
			{ shape: s, parentOffset: new Vector3(0,0,0)},
			{ shape: b, parentOffset: new Vector3(0,4,0)},
			new Vector3(0, 0, 0),
			new Vector3(0, 0, 0)
		);

		expect(testResult).not.toBe(null);
		expect(testResult.normal.x).toBeCloseTo(0);
		expect(testResult.normal.y).toBeCloseTo(-1);
		expect(testResult.normal.z).toBeCloseTo(0);
	});

	it("Sphere x AABB moving non intersecting", () => {
		const s = new Sphere(new Vector3(0,0,0), 4);
		const b = new Box(new Vector3(0,0,0), 2, 2, 2);

		const testResult = SAT.test(
			{ shape: s, parentOffset: new Vector3(0,0,0)},
			{ shape: b, parentOffset: new Vector3(0,10,0)},
			new Vector3(0, 0, 0),
			new Vector3(0, -4, 0)
		);

		expect(testResult).toBe(null);
	});

	it("Sphere x AABB moving intersecting", () => {
		const s = new Sphere(new Vector3(0,0,0), 4);
		const b = new Box(new Vector3(0,0,0), 2, 2, 2);

		const testResult = SAT.test(
			{ shape: s, parentOffset: new Vector3(0,0,0)},
			{ shape: b, parentOffset: new Vector3(0,8,0)},
			new Vector3(0, 0, 0),
			new Vector3(0, -5, 0)
		);

		expect(testResult).not.toBe(null);
		expect(testResult.normal.x).toBeCloseTo(0);
		expect(testResult.normal.y).toBeCloseTo(-1);
		expect(testResult.normal.z).toBeCloseTo(0);
	});

	it("AABB x Sphere moving intersecting (inverted normal)", () => {
		const s = new Sphere(new Vector3(0,0,0), 4);
		const b = new Box(new Vector3(0,0,0), 2, 2, 2);

		const testResult = SAT.test(
			{ shape: b, parentOffset: new Vector3(0,8,0)},
			{ shape: s, parentOffset: new Vector3(0,0,0)},
			new Vector3(0, -5, 0),
			new Vector3(0, 0, 0)
		);

		expect(testResult).not.toBe(null);
		expect(testResult.normal.x).toBeCloseTo(0);
		expect(testResult.normal.y).toBeCloseTo(1);
		expect(testResult.normal.z).toBeCloseTo(0);
	});

	it("Cylinder x Cylinder static non intersecting", () => {
		const c1 = new Cylinder(new Vector3(0, 0, 0), 4, 2);
		const c2 = new Cylinder(new Vector3(0, 0, 0), 4, 2);

		const testResult = SAT.test(
			{ shape: c1, parentOffset: new Vector3(0,0,0) },
			{ shape: c2, parentOffset: new Vector3(0,6,0) },
			new Vector3(0,0,0),
			new Vector3(0,0,0)
		);

		expect(testResult).toBe(null);
	});

	it("Cylinder x Cylinder static intersecting", () => {
		const c1 = new Cylinder(new Vector3(0, 0, 0), 4, 2);
		const c2 = new Cylinder(new Vector3(0, 0, 0), 4, 2);

		const testResult = SAT.test(
			{ shape: c1, parentOffset: new Vector3(0,0,0) },
			{ shape: c2, parentOffset: new Vector3(0,3,0) },
			new Vector3(0,0,0),
			new Vector3(0,0,0)
		);

		expect(testResult).not.toBe(null);
		expect(testResult.normal.x).toBeCloseTo(0);
		expect(testResult.normal.y).toBeCloseTo(-1);
		expect(testResult.normal.z).toBeCloseTo(0);
	});

	it("Cylinder x Cylinder moving non intersecting", () => {
		const c1 = new Cylinder(new Vector3(0, 0, 0), 4, 2);
		const c2 = new Cylinder(new Vector3(0, 0, 0), 4, 2);

		const testResult = SAT.test(
			{ shape: c1, parentOffset: new Vector3(0,0,0) },
			{ shape: c2, parentOffset: new Vector3(0,6,0) },
			new Vector3(0,0,0),
			new Vector3(2,0,0)
		);

		expect(testResult).toBe(null);
	});

	it("Cylinder x Cylinder moving intersecting", () => {
		const c1 = new Cylinder(new Vector3(0, 0, 0), 4, 2);
		const c2 = new Cylinder(new Vector3(0, 0, 0), 4, 2);

		const testResult = SAT.test(
			{ shape: c1, parentOffset: new Vector3(0,0,0) },
			{ shape: c2, parentOffset: new Vector3(0,6,0) },
			new Vector3(0,0,0),
			new Vector3(0,-2,0)
		);

		expect(testResult).not.toBe(null);
		expect(testResult.normal.x).toBeCloseTo(0);
		expect(testResult.normal.y).toBeCloseTo(-1);
		expect(testResult.normal.z).toBeCloseTo(0);
	});

	it("Cylinder x Box static non intersecting", () => {
		const c = new Cylinder(new Vector3(0,0,0), 4, 4);
		const b = new Box(new Vector3(0,0,0), 2, 2, 2);

		const testResult = SAT.test(
			{ shape: c, parentOffset: new Vector3(0,0,0) },
			{ shape: b, parentOffset: new Vector3(0,5,0) },
			new Vector3(0,0,0),
			new Vector3(0,0,0)
		);

		expect(testResult).toBe(null);
	});

	it("Cylinder x Box static intersecting", () => {
		const c = new Cylinder(new Vector3(0,0,0), 4, 4);
		const b = new Box(new Vector3(0,0,0), 2, 2, 2);

		const testResult = SAT.test(
			{ shape: c, parentOffset: new Vector3(0,0,0) },
			{ shape: b, parentOffset: new Vector3(0,2,0) },
			new Vector3(0,0,0),
			new Vector3(0,0,0)
		);

		expect(testResult).not.toBe(null);
		expect(testResult.normal.x).toBeCloseTo(0);
		expect(testResult.normal.y).toBeCloseTo(-1);
		expect(testResult.normal.z).toBeCloseTo(0);
	});

	it("Cylinder x Box moving non intersecting", () => {
		const c = new Cylinder(new Vector3(0,0,0), 4, 4);
		const b = new Box(new Vector3(0,0,0), 2, 2, 2);

		const testResult = SAT.test(
			{ shape: c, parentOffset: new Vector3(0,0,0) },
			{ shape: b, parentOffset: new Vector3(0,5,0) },
			new Vector3(0,1,0),
			new Vector3(5,0,0)
		);

		expect(testResult).toBe(null);
	});

	it("Cylinder x Box moving intersecting", () => {
		const c = new Cylinder(new Vector3(0,0,0), 4, 4);
		const b = new Box(new Vector3(0,0,0), 2, 2, 2);

		const testResult = SAT.test(
			{ shape: c, parentOffset: new Vector3(0,0,0) },
			{ shape: b, parentOffset: new Vector3(5,0,0) },
			new Vector3(0,0,0),
			new Vector3(-3,0,0)
		);

		expect(testResult).not.toBe(null);
		expect(testResult.normal.x).toBeCloseTo(-1);
		expect(testResult.normal.y).toBeCloseTo(0);
		expect(testResult.normal.z).toBeCloseTo(0);
	});

	it("Cylinder x Sphere static non intersecting", () => {
		const c = new Cylinder(new Vector3(0,0,0), 4, 4);
		const s = new Sphere(new Vector3(0,0,0), 2);

		const testResult = SAT.test(
			{ shape: c, parentOffset: new Vector3(0,0,0) },
			{ shape: s, parentOffset: new Vector3(0,5,0) },
			new Vector3(0,0,0),
			new Vector3(0,0,0)
		);

		expect(testResult).toBe(null);
	});

	it("Cylinder x Sphere static intersecting", () => {
		const c = new Cylinder(new Vector3(0,0,0), 4, 4);
		const s = new Sphere(new Vector3(0,0,0), 2);

		const testResult = SAT.test(
			{ shape: c, parentOffset: new Vector3(0,0,0) },
			{ shape: s, parentOffset: new Vector3(0,4,0) },
			new Vector3(0,0,0),
			new Vector3(0,0,0)
		);

		expect(testResult).not.toBe(null);
		expect(testResult.normal.x).toBeCloseTo(0);
		expect(testResult.normal.y).toBeCloseTo(-1);
		expect(testResult.normal.z).toBeCloseTo(0);
	});

	it("Cylinder x Sphere moving non intersecting", () => {
		const c = new Cylinder(new Vector3(0,0,0), 4, 4);
		const s = new Sphere(new Vector3(0,0,0), 2);

		const testResult = SAT.test(
			{ shape: c, parentOffset: new Vector3(0,0,0) },
			{ shape: s, parentOffset: new Vector3(0,6,0) },
			new Vector3(0,1,0),
			new Vector3(5,0,0)
		);

		expect(testResult).toBe(null);
	});

	it("Cylinder x Sphere moving intersecting", () => {
		const c = new Cylinder(new Vector3(0,0,0), 4, 4);
		const s = new Sphere(new Vector3(0,0,0), 2);

		const testResult = SAT.test(
			{ shape: c, parentOffset: new Vector3(0,0,0) },
			{ shape: s, parentOffset: new Vector3(6,0,0) },
			new Vector3(0,0,0),
			new Vector3(-1,0,0)
		);

		expect(testResult).not.toBe(null);
		expect(testResult.normal.x).toBeCloseTo(-1);
		expect(testResult.normal.y).toBeCloseTo(0);
		expect(testResult.normal.z).toBeCloseTo(0);
	});
});