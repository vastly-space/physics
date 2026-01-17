import { WORLD_MODE, TICKRATE, SNAPSHOT_INTERVAL, SCHEDULER_TRAIL_SNAP, SCHEDULER_TRAIL_BOOST, CLIENT_DELAY } from "./constants.js"

export default class Scheduler {
	private snapshotInterval = Math.floor(TICKRATE/SNAPSHOT_INTERVAL);
	private trailBoost: number = SCHEDULER_TRAIL_BOOST/100;
	private _tick: number;
	private offset: number = 0;
	private last_snapshot: number = 0;
	private timeout: ReturnType<typeof setTimeout> | null = null;
	private baseTickDelay: number;

	public snapshotListener: ((tick: number) => void) | null = null;
	public tickListener: ((tick: number) => void) | null = null;
	public snapshotReceived: boolean = false;

	constructor (tick: number = 0) {
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
		if (WORLD_MODE === "client" && !this.snapshotReceived) {
			this.timeout = setTimeout(this.doTick.bind(this), this.baseTickDelay);
			return;	
		}

		this._tick++;

		if (this.tickListener !== null) this.tickListener(this._tick);

		if (WORLD_MODE === "server") {
			this.last_snapshot++;

			if (this.snapshotListener !== null && this.last_snapshot >= this.snapshotInterval) {
				this.snapshotListener(this._tick);
				this.last_snapshot = 0;
			}
		}

		this.timeout = setTimeout(this.doTick.bind(this), this.baseTickDelay + (this.offset * this.trailBoost));
	}

	adjustSpeed (snapshotTick: number) {
		const offset = snapshotTick - this._tick - CLIENT_DELAY;
	}
}