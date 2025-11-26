import AABB from "../math/aabb.js"
import StaticBody from "../physics/staticBody.js"

export interface PhysicsEvent {
	eventType: string;
	body1: StaticBody,
	body2: StaticBody,
	collisionVolume: AABB
}

export type CollisionListener = (events: PhysicsEvent[]) => void;

export class ReliableChannel {
	private listeners: CollisionListener[] = [];
	private events: PhysicsEvent[] = [];

	on (listener: CollisionListener) {
		this.listeners.push(listener);
	}

	off (listener: CollisionListener) {
		this.listeners = this.listeners.filter(l => l !== listener);
	}

	pushEvent (ev: PhysicsEvent) {
		this.events.push(ev);
	}

	flush () {
		for (const l of this.listeners) {
			l(this.events);
		}

		this.events = [];
	}
}