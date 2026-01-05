import { TICKRATE, SNAPSHOT_INTERVAL, SCHEDULER_TRAIL_SNAP, SCHEDULER_TRAIL_BOOST } from "./constants.js"

export default class Scheduler {
	private mode: 'standalone' | 'server' | 'client';
	private _tick: number;
	private offset: number = 0;
	private last_snapshot: number = 0;
	private timeout: ReturnType<typeof setTimeout> | null = null;
	private baseTickDelay: number;

	public snapshotListener: ((tick: number) => void) | null = null;
	public tickListener: ((tick: number) => void) | null = null;

	constructor (mode: 'standalone' | 'server' | 'client', tick: number = 0) {
		this.mode = mode;
		this._tick = tick;
		this.baseTickDelay = 1000/TICKRATE;
	}

	get tick (): number {
		return this._tick;
	}

	set tick (val: number) {
		this._tick = val;
		this.last_snapshot = 0;
		this.offset = 0;
	}

	start () {
		if (this.timeout === null) {
			this.timeout = setTimeout(this.doTick.bind(this), this.baseTickDelay);
		}
	}

	stop () {
		if (this.timeout !== null) {
			clearTimeout(this.timeout);
		}
	}

	doTick () {
		this._tick++;

		if (this.tickListener !== null) this.tickListener(this._tick);

		if (this.mode === "server") {
			this.last_snapshot += this.baseTickDelay;

			if (this.snapshotListener !== null && this.last_snapshot >= SNAPSHOT_INTERVAL) {
				this.snapshotListener(this._tick);
				this.last_snapshot = 0;
			}
		}

		this.timeout = setTimeout(this.doTick.bind(this), this.baseTickDelay + (this.offset * SCHEDULER_TRAIL_BOOST));
	}

	adjustSpeed (snapshotTick: number): boolean {
		const offset = snapshotTick - this._tick;

		if (offset >= SCHEDULER_TRAIL_SNAP) {
			this._tick = snapshotTick;

			return true;
		} else {
			this.offset = offset;

			return false;
		}
	}
}