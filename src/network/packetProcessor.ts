import Constants from "../constants.js"

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

export interface InitialPacket {
	constants: Constants;
	tick: number;
	bodies: Body[];
}

export interface BodyState {
	id: number;
	position: number[];
	velocity: number[];
}

export interface SnapshotChunk {
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

	static serializeInitialPacket (worldConstants: Constants, tick: number, statics: Map<number, StaticBody>, kinematics: Map<number, KinematicBody>, dynamics: Map<number, DynamicBody>): Uint8Array {
		const constants: number[] = [];
		// int32
		constants.push(worldConstants.GLOBAL_SPEED);
		constants.push(worldConstants.MAX_DOWN_SPEED);
		constants.push(worldConstants.GLOBAL_GRAVITY);
		constants.push(worldConstants.MAX_DEPENETRATION_ITERATIONS);
		constants.push(worldConstants.MAX_SLOPE);
		constants.push(worldConstants.STEP_UP_HEIGHT);
		constants.push(worldConstants.TICKRATE);
		constants.push(worldConstants.GROUND_PROBE);
		constants.push(worldConstants.NUM_DIRECTIONS);
		constants.push(worldConstants.SNAPSHOT_INTERVAL);
		constants.push(worldConstants.SCHEDULER_TRAIL_SNAP);
		constants.push(worldConstants.SCHEDULER_TRAIL_BOOST);
		constants.push(worldConstants.MAX_INTERPOLATION_TICKS);
		constants.push(worldConstants.CLIENT_DELAY);
		constants.push(worldConstants.CORRECTION_TICKS);

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
			view.setUint8(offset, body.kind);
			offset += 1;
			// body position
			view.setInt32(offset, body.position[0], true);
			offset += 4;
			view.setInt32(offset, body.position[1], true);
			offset += 4;
			view.setInt32(offset, body.position[2], true);
			offset += 4;
			// body layer
			view.setUint8(offset, body.layer);
			offset += 1;
			// body flags
			view.setUint8(offset, body.flags);
			offset += 1;
			if (body.kind === 2) {
				// body mask
				view.setUint8(offset, body.mask!);
				offset += 1;
				// body gravity multiplier
				view.setUint8(offset, body.gravityMultiplier!);
				offset += 1;
			}
			// shapes
			for (const shape of body.shapes) {
				// shape length
				view.setInt32(offset, shape.byteLength-4, true);
				offset += 4;
				// shape type
				view.setUint8(offset, shape.type);
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

		const type = view.getUint8(offset);
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
					view.byteOffset + offset, view.byteOffset + offset + vertexLength*4
				));
				offset += vertexLength*4;
				const indiceLength = view.getInt32(offset, true);
				offset += 4;
				const indices = new Uint32Array(view.buffer.slice(
					view.byteOffset + offset, view.byteOffset + offset + indiceLength*4
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
		const kind = view.getUint8(offset);
		offset += 1;
		const position = new Vector3();
		position.x = view.getInt32(offset, true);
		offset += 4;
		position.y = view.getInt32(offset, true);
		offset += 4;
		position.z = view.getInt32(offset, true);
		offset += 4;
		const layer = view.getUint8(offset);
		offset += 1;
		const flags = view.getUint8(offset);
		offset += 1;

		let gravityMultiplier: number;
		let mask: number;
		if (kind === 2) {
			mask = view.getUint8(offset);
			offset += 1;
			gravityMultiplier = view.getUint8(offset);
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
			offset += shapeSize;
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
		const constants = new Constants();
		const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

		let offset = 0;

		constants.GLOBAL_SPEED = view.getInt32(offset, true);
		offset += 4;
		constants.MAX_DOWN_SPEED = view.getInt32(offset, true);
		offset += 4;
		constants.GLOBAL_GRAVITY = view.getInt32(offset, true);
		offset += 4;
		constants.MAX_DEPENETRATION_ITERATIONS = view.getInt32(offset, true);
		offset += 4;
		constants.MAX_SLOPE = view.getInt32(offset, true);
		offset += 4;
		constants.STEP_UP_HEIGHT = view.getInt32(offset, true);
		offset += 4;
		constants.TICKRATE = view.getInt32(offset, true);
		offset += 4;
		constants.GROUND_PROBE = view.getInt32(offset, true);
		offset += 4;
		constants.NUM_DIRECTIONS = view.getInt32(offset, true);
		offset += 4;
		constants.SNAPSHOT_INTERVAL = view.getInt32(offset, true);
		offset += 4;
		constants.SCHEDULER_TRAIL_SNAP = view.getInt32(offset, true);
		offset += 4;
		constants.SCHEDULER_TRAIL_BOOST = view.getInt32(offset, true);
		offset += 4;
		constants.MAX_INTERPOLATION_TICKS = view.getInt32(offset, true);
		offset += 4;
		constants.CLIENT_DELAY = view.getInt32(offset, true);
		offset += 4;
		constants.CORRECTION_TICKS = view.getInt32(offset, true);
		offset += 4;

		const tick = view.getInt32(offset, true);
		offset += 4;

		let bodies: Body[] = [];

		while (offset < data.length) {
			const bodySize = view.getInt32(offset, true);
			offset += 4;
			bodies.push(PacketProcessor.deserializeBody(new DataView(
				data.buffer,
				view.byteOffset + offset,
				bodySize
			)));
			offset += bodySize;
		}

		return {
			constants,
			tick,
			bodies
		}
	}

	static serializeSnapshot (tick: number, kinematics: Map<number, KinematicBody>, dynamics: Map<number, DynamicBody>): Uint8Array[] {
		/*
			single body is 28 bytes
			snapshot chunk can hold 1200 bytes
			for bodies it can hold 1200 - 4 - 2 - 2 = 1192
			42 bodies in a chunk
		*/
		const result: { view: DataView, chunk: Uint8Array }[] = [];
		const bodies: Body[] = Array.from(kinematics.values()).concat(Array.from(dynamics.values())).filter(b => {
			if (b.dirty) {
				b.dirty = false;
				return true;
			} else {
				return false;
			}
		});

		let counter = 0;
		while (counter < bodies.length) {
			let bodiesInChunk = Math.min(37, bodies.length - counter);
			let chunk = new Uint8Array(8 + bodiesInChunk*28);
			let view = new DataView(chunk.buffer);

			let offset = 8;

			for (let i=0; i<bodiesInChunk; i++) {
				// id
				view.setInt32(offset, bodies[counter + i].id, true);
				offset += 4;
				// position
				view.setInt32(offset, bodies[counter + i].position.x, true);
				offset += 4;
				view.setInt32(offset, bodies[counter + i].position.y, true);
				offset += 4;
				view.setInt32(offset, bodies[counter + i].position.z, true);
				offset += 4;
				// velocity
				let vel: Vector3;
				if (bodies[counter + i].kind === "dynamic") {
					vel = (bodies[counter + i] as DynamicBody).velocity;
				} else {
					vel = (bodies[counter + i] as KinematicBody).motionDelta;
				}
				view.setInt32(offset, vel.x, true);
				offset += 4;
				view.setInt32(offset, vel.y, true);
				offset += 4;
				view.setInt32(offset, vel.z, true);
				offset += 4;
			}

			result.push({ view, chunk });
			counter += bodiesInChunk;
		}

		for (let i=0; i<result.length; i++) {
			const chunk = result[i];
			chunk.view.setInt32(0, tick, true);
			chunk.view.setInt16(4, result.length, true);
			chunk.view.setInt16(6, i, true);
		}

		return result.map(c => c.chunk);
	}

	static deserializeSnapshot (data: Uint8Array): SnapshotChunk {
		const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

		const tick = view.getInt32(0, true);
		const chunks = view.getInt16(4, true);
		const chunkIndex = view.getInt16(6, true);

		const bodies: BodyState[] = [];
		let offset = 8;

		while (offset < view.byteLength) {
			const id = view.getInt32(offset, true);
			const position = [
				view.getInt32(offset + 4, true),
				view.getInt32(offset + 8, true),
				view.getInt32(offset + 12, true)
			];
			const velocity = [
				view.getInt32(offset + 16, true),
				view.getInt32(offset + 20, true),
				view.getInt32(offset + 24, true)
			];
			bodies.push({ id, position, velocity });
			offset += 28;
		}

		return {
			tick,
			chunks,
			chunkIndex,
			bodies
		}
	}
}