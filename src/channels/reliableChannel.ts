import type { CollisionEvent } from "../solver.js"

export type CollisionListener = (e: CollisionEvent[]) => void;

export default class ReliableChannel {
	private listeners: CollisionListener[] = [];

	on (listener: CollisionListener) {
		this.listeners.push(listener);
	}

	off (listener: CollisionListener) {
		this.listeners = this.listeners.filter(l => l !== listener);
	}

	flush (events: CollisionEvent[]) {
		for (const l of this.listeners) {
			l(events);
		}
	}
}