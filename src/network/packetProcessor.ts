import {
	GLOBAL_SPEED,
	MAX_DOWN_SPEED,
	GLOBAL_GRAVITY,
	MAX_DEPENETRATION_ITERATIONS,
	MAX_SLOPE,
	STEP_UP_HEIGHT,
	TICKRATE,
	GROUND_PROBE,
	NUM_DIRECTIONS,
	SNAPSHOT_INTERVAL,
	SCHEDULER_TRAIL_SNAP,
	SCHEDULER_TRAIL_BOOST,

	SET_GLOBAL_SPEED,
	SET_MAX_DOWN_SPEED,
	SET_GLOBAL_GRAVITY,
	SET_MAX_DEPENETRATION_ITERATIONS,
	SET_MAX_SLOPE,
	SET_STEP_UP_HEIGHT,
	SET_TICKRATE,
	SET_GROUND_PROBE,
	SET_NUM_DIRECTIONS,
	SET_SNAPSHOT_INTERVAL,
	SET_SCHEDULER_TRAIL_SNAP,
	SET_SCHEDULER_TRAIL_BOOST
} from "../constants.js"

import StaticBody from "../physics/staticBody.js"
import KinematicBody from "../physics/kinematicBody.js"
import DynamicBody from "../physics/dynamicBody.js"
import type Shape from "../physics/shape.js"
import Box from "../physics/shapes/box.js"
import Sphere from "../physics/shapes/sphere.js"
import Capsule from "../physics/shapes/capsule.js"
import Trimesh from "../physics/shapes/trimesh.js"
import Triangle from "../physics/shapes/triangle.js"

import Vector3 from "../math/vector3.js"

type Body = StaticBody | KinematicBody | DynamicBody;

interface ShapeDescription {
	byteLength: number;
	type: number;
	offset: number[];
	data: number[];
}

interface BodyDescription {
	byteLength: number;
	id: number;
	kind: number;
	position: number[];
	layer: number;
	flags: number;
	mask?: number;
	gravityMultiplier?: number;
	shapes: ShapeDescription[];
}

interface InitialPacket {
	tick: number;
	bodies: Body[];
}

interface BodyState {
	id: number;
	position: number[];
	velocity: number[];
}

interface Snapshot {
	tick: number;
	chunks: number;
	chunkIndex: number;
	bodies: BodyState[];
}

export default class PacketProcessor {
	static serializeShape (shape: Shape): ShapeDescription {
		let sType: number;
		let sData: number[];

		switch (shape.type) {
			case "box":
				sType = 0;
				let b = shape as Box;
				sData = [b.width, b.height, b.depth];
				break;
			case "sphere":
				sType = 1;
				let s = shape as Sphere;
				sData = [s.radius];
				break;
			case "capsule":
				sType = 2;
				let c = shape as Capsule;
				sData = [c.height, c.radius];
				break;
			case "trimesh":
				sType = 3;
				sData = [];
				sData.push((shape as Trimesh).vertices.length);
				sData = sData.concat(Array.from((shape as Trimesh).vertices));
				sData.push((shape as Trimesh).indices.length);
				sData = sData.concat(Array.from((shape as Trimesh).indices));
				break;
			default:
				throw new Error(`Unknown shape type ${shape.type}`);
		}

		const desc: ShapeDescription = {
			byteLength: 17 + sData.length*4,
			type: sType,
			offset: [shape.offset.x, shape.offset.y, shape.offset.z],
			data: sData
		};

		return desc;
	}

	static serializeBody (body: Body): BodyDescription {
		let bKind: number;

		switch (body.kind) {
			case "static":
				bKind = 0;
				break;
			case "kinematic":
				bKind = 1;
				break;
			case "dynamic":
				bKind = 2;
				break;
			default:
				throw new Error(`Unknown body kind ${body.kind}`);
		}

		let flags: number = 0;
		if (body.isTrigger) flags += 1;
		if (body.canCollide) flags += 2;

		const desc: BodyDescription = {
			byteLength: bKind === 2 ? 25 : 23,
			kind: bKind,
			id: body.id,
			position: [body.position.x, body.position.y, body.position.z],
			layer: body.layer,
			flags: flags,
			shapes: []
		};

		if (bKind === 2) {
			desc.mask = (body as DynamicBody).mask;
			desc.gravityMultiplier = (body as DynamicBody).gravityMultiplier;
			if ((body as DynamicBody).canStepUp) desc.flags += 4;
			if ((body as DynamicBody).kinematicBehavior) desc.flags += 8;
		}

		for (const shape of body.shapes) {
			const s = PacketProcessor.serializeShape(shape);
			desc.shapes.push(s);
			desc.byteLength += s.byteLength;
		}

		return desc;
	}

	static serializeInitialPacket (tick: number, statics: Map<number, StaticBody>, kinematics: Map<number, KinematicBody>, dynamics: Map<number, DynamicBody>): Uint8Array {
		const constants: number[] = [];
		// int32
		constants.push(GLOBAL_SPEED);
		constants.push(MAX_DOWN_SPEED);
		constants.push(GLOBAL_GRAVITY);
		constants.push(MAX_DEPENETRATION_ITERATIONS);
		constants.push(MAX_SLOPE);
		constants.push(STEP_UP_HEIGHT);
		constants.push(TICKRATE);
		constants.push(GROUND_PROBE);
		constants.push(NUM_DIRECTIONS);
		constants.push(SNAPSHOT_INTERVAL);
		constants.push(SCHEDULER_TRAIL_SNAP);
		constants.push(SCHEDULER_TRAIL_BOOST);

		// tick
		constants.push(tick);

		// bodies
		const bodies: BodyDescription[] = [];
		// bodyLength, bodyDescription
		for (const [id, body] of statics.entries()) bodies.push(PacketProcessor.serializeBody(body));
		for (const [id, body] of kinematics.entries()) bodies.push(PacketProcessor.serializeBody(body));
		for (const [id, body] of dynamics.entries()) bodies.push(PacketProcessor.serializeBody(body));

		// combine and return
		const bLength: number = bodies.reduce((acc, val) => acc + val.byteLength, 0);
		const result = new Uint8Array(constants.length*4 + bLength);
		const view = new DataView(result.buffer);

		let offset = 0;
		for (const v of constants) {
			view.setInt32(offset, v, true);
			offset += 4;
		}

		for (const body of bodies) {
			// body length
			view.setInt32(offset, body.byteLength-4, true);
			offset += 4;
			// body id
			view.setInt32(offset, body.id, true);
			offset += 4;
			// body kind
			view.setInt8(offset, body.kind);
			offset += 1;
			// body position
			view.setInt32(offset, body.position[0], true);
			offset += 4;
			view.setInt32(offset, body.position[1], true);
			offset += 4;
			view.setInt32(offset, body.position[2], true);
			offset += 4;
			// body layer
			view.setInt8(offset, body.layer);
			offset += 1;
			// body flags
			view.setInt8(offset, body.flags);
			offset += 1;
			if (body.kind === 2) {
				// body mask
				view.setInt8(offset, body.mask!);
				offset += 1;
				// body gravity multiplier
				view.setInt8(offset, body.gravityMultiplier!);
				offset += 1;
			}
			// shapes
			for (const shape of body.shapes) {
				// shape length
				view.setInt32(offset, shape.byteLength-4, true);
				offset += 4;
				// shape type
				view.setInt8(offset, shape.type);
				offset += 1;
				// shape offset
				view.setInt32(offset, shape.offset[0], true);
				offset += 4;
				view.setInt32(offset, shape.offset[1], true);
				offset += 4;
				view.setInt32(offset, shape.offset[2], true);
				offset += 4;
				// shape data
				for (const num of shape.data) {
					view.setInt32(offset, num, true);
					offset += 4;
				}
			}
		}

		return result;
	}

	static deserializeShape (view: DataView): Shape {
		let offset = 0;

		const type = view.getInt8(offset);
		offset += 1;
		const position = new Vector3();
		position.x = view.getInt32(offset, true);
		offset += 4;
		position.y = view.getInt32(offset, true);
		offset += 4;
		position.z = view.getInt32(offset, true);
		offset += 4;

		switch (type) {
			case 0:
				return new Box(position, view.getInt32(offset, true), view.getInt32(offset+4, true), view.getInt32(offset+8, true));
			case 1:
				return new Sphere(position, view.getInt32(offset, true));
			case 2:
				return new Capsule(position, view.getInt32(offset, true), view.getInt32(offset+4, true));
			case 3:
				const vertexLength = view.getInt32(offset, true);
				offset += 4;
				const vertices = new Int32Array(view.buffer.slice(
					offset, vertexLength
				));
				offset += vertexLength;
				const indiceLength = view.getInt32(offset, true);
				offset += 4;
				const indices = new Uint32Array(view.buffer.slice(
					offset, indiceLength
				));

				return new Trimesh(position, vertices, indices);
			default:
				throw new Error(`Unknown shape type ${type}`);
		}
	}

	static deserializeBody (view: DataView): Body {
		let offset = 0;

		const id = view.getInt32(offset, true);
		offset += 4;
		const kind = view.getInt8(offset);
		offset += 1;
		const position = new Vector3();
		position.x = view.getInt32(offset, true);
		offset += 4;
		position.y = view.getInt32(offset, true);
		offset += 4;
		position.z = view.getInt32(offset, true);
		offset += 4;
		const layer = view.getInt8(offset);
		offset += 1;
		const flags = view.getInt8(offset);
		offset += 1;

		let gravityMultiplier: number;
		let mask: number;
		if (kind === 2) {
			gravityMultiplier = view.getInt8(offset);
			offset += 1;
			mask = view.getInt8(offset);
			offset += 1;
		}

		const shapes: Shape[] = [];

		while (offset < view.byteLength) {
			const shapeSize = view.getInt32(offset, true);
			offset += 4;
			shapes.push(PacketProcessor.deserializeShape(new DataView(
				view.buffer,
				view.byteOffset + offset,
				shapeSize
			)));
		}

		// construct body
		let result: Body;

		switch (kind) {
			case 0:
				result = new StaticBody(id, shapes, position, Boolean(flags & 1), layer);
				break;
			case 1:
				result = new KinematicBody(id, shapes, position, Boolean(flags & 1), layer);
				break;
			case 2:
				result = new DynamicBody(id, shapes, position, Boolean(flags & 1), layer);
				(result as DynamicBody).mask = mask!;
				(result as DynamicBody).gravityMultiplier = gravityMultiplier!;
				(result as DynamicBody).canStepUp = Boolean(flags & 4);
				(result as DynamicBody).kinematicBehavior = Boolean(flags & 8);
				break;
			default:
				throw new Error(`Unknown body kind ${kind}`);
		}

		result.canCollide = Boolean(flags & 2);

		return result;
	}

	static deserializeInitialPacket (data: Uint8Array): InitialPacket {
		const view = new DataView(data.buffer);

		let offset = 0;

		SET_GLOBAL_SPEED(view.getInt32(offset, true));
		offset += 4;
		SET_MAX_DOWN_SPEED(view.getInt32(offset, true));
		offset += 4;
		SET_GLOBAL_GRAVITY(view.getInt32(offset, true));
		offset += 4;
		SET_MAX_DEPENETRATION_ITERATIONS(view.getInt32(offset, true));
		offset += 4;
		SET_MAX_SLOPE(view.getInt32(offset, true));
		offset += 4;
		SET_STEP_UP_HEIGHT(view.getInt32(offset, true));
		offset += 4;
		SET_TICKRATE(view.getInt32(offset, true));
		offset += 4;
		SET_GROUND_PROBE(view.getInt32(offset, true));
		offset += 4;
		SET_NUM_DIRECTIONS(view.getInt32(offset, true));
		offset += 4;
		SET_SNAPSHOT_INTERVAL(view.getInt32(offset, true));
		offset += 4;
		SET_SCHEDULER_TRAIL_SNAP(view.getInt32(offset, true));
		offset += 4;
		SET_SCHEDULER_TRAIL_BOOST(view.getInt32(offset, true));
		offset += 4;

		const tick = view.getInt32(offset, true);
		offset += 4;

		let bodies: Body[] = [];

		while (offset < data.length) {
			const bodySize = view.getInt32(offset, true);
			offset += 4;
			bodies.push(PacketProcessor.deserializeBody(new DataView(
				data.buffer,
				offset,
				bodySize
			)));
			offset += bodySize;
		}

		return {
			tick,
			bodies
		}
	}

	static serializeBodySnapshot (): Uint8Array {
		return new Uint8Array();
	}

	static serializeSnapshot (tick: number, statics: Map<number, StaticBody>, kinematics: Map<number, KinematicBody>, dynamics: Map<number, DynamicBody>): Uint8Array[] {
		return [];
	}

	static deserializeSnapshot (data: Uint8Array): Snapshot {
		return {
			tick: 42,
			chunks: 42,
			chunkIndex: 42,
			bodies: []
		}
	}
}