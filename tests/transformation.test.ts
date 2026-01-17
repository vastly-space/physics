import { describe, it, expect } from "vitest"

import Vector3 from "../src/math/vector3.ts"
import { Transformation } from "../src/transformations/transformation.ts"

describe("Transformations", () => {
	it("Single run, time distribution even", () => {
		const source = new Vector3(0, 0, 0);
		const destination = new Vector3(0, 5000, 0);
		const startTick = 0;
		const endTick = 10;
		const transformation = new Transformation([(new Vector3()).copy(destination).sub(source)], startTick, endTick, null, false);

		let pos = source.clone();
		let tick = startTick;
		while (tick < endTick) {
			transformation.currentStep(tick, pos);
			tick++;
		}

		expect(pos.x).toEqual(destination.x);
		expect(pos.y).toEqual(destination.y);
		expect(pos.z).toEqual(destination.z);
	})

	it("Single run, time distribution uneven", () => {
		const source = new Vector3(0, 0, 0);
		const destination = new Vector3(0, 5000, 0);
		const startTick = 0;
		const endTick = 18;
		const transformation = new Transformation([(new Vector3()).copy(destination).sub(source)], startTick, endTick, null, false);

		let pos = source.clone();
		let tick = startTick;
		while (tick < endTick) {
			transformation.currentStep(tick, pos);
			tick++;
		}

		expect(pos.x).toEqual(destination.x);
		expect(pos.y).toEqual(destination.y);
		expect(pos.z).toEqual(destination.z);
	})

	it("Loop transformation, one run", () => {
		const source = new Vector3(0, 0, 0);
		const destination = new Vector3(0, 5000, 0);
		const startTick = 0;
		const endTick = 20;
		const transformation = new Transformation([
			(new Vector3()).copy(destination).sub(source),
			(new Vector3()).copy(source).sub(destination)
		], startTick, endTick, null, true);

		let pos = source.clone();
		let tick = startTick;
		while (tick < endTick) {
			transformation.currentStep(tick, pos);
			tick++;
		}

		expect(pos.x).toEqual(source.x);
		expect(pos.y).toEqual(source.y);
		expect(pos.z).toEqual(source.z);
	})

	it("Loop transformation, multiple runs", () => {
		const source = new Vector3(0, 0, 0);
		const destination = new Vector3(0, 5000, 0);
		const startTick = 0;
		const endTick = 20;
		const transformation = new Transformation([
			(new Vector3()).copy(destination).sub(source),
			(new Vector3()).copy(source).sub(destination)
		], startTick, endTick, null, true);

		let pos = source.clone();
		let tick = startTick;
		while (tick < endTick*100) {
			transformation.currentStep(tick, pos);
			tick++;
		}

		expect(pos.x).toEqual(source.x);
		expect(pos.y).toEqual(source.y);
		expect(pos.z).toEqual(source.z);
	})
});