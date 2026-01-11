import PacketProcessor from "./packetProcessor.js"
import type { SnapshotChunk, BodyState } from "./packetProcessor.js"
import { TICKRATE, SNAPSHOT_INTERVAL } from "../constants.js"

export interface Snapshot {
	tick: number;
	bodies: Map<number, BodyState>;
}

export default class SnapshotBuffer {
	private chunks: SnapshotChunk[] = [];
	private lastSeenTick: number = 0;
	private lastClientTick: number = 0;
	public onServerTick: ((tick: number) => void) | null = null;
	public onSnapshot: ((snapshot: Snapshot) => void) | null = null;

	consumePacket (data: Uint8Array) {
		const chunk = PacketProcessor.deserializeSnapshot(data);

		if (chunk.tick <= this.lastClientTick || chunk.tick <= this.lastSeenTick) return;

		if (chunk.tick > this.lastSeenTick) {
			this.lastSeenTick = chunk.tick;
			this.chunks = [];
			if (this.onServerTick !== null) this.onServerTick(this.lastSeenTick);
		}

		this.chunks.push(chunk);

		if (this.chunks.length === chunk.chunks) {
			const snapshot: Snapshot = {
				tick: chunk.tick,
				bodies: new Map()
			}

			for (const c of this.chunks) {
				const bodies = c.bodies;
				for (const body of bodies) {
					snapshot.bodies.set(body.id, body);
				}
			}

			if (this.onSnapshot !== null) this.onSnapshot(snapshot);

			this.chunks = [];
		}
	}

	clientTick (tick: number) {
		this.lastClientTick = tick;
	}
}