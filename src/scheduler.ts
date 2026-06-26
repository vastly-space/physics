import Constants from "./constants.js"

type TickListener = (tick: number) => void;

export default class Scheduler {
	private constants: Constants;
	private snapshotInterval: number;
	private trailBoost: number;
	private _tick: number;
	private offset: number = 0;
	private last_snapshot: number = 0;
	private timeout: ReturnType<typeof setTimeout> | null = null;
	private baseTickDelay: number;

	private snapshotListeners: Set<TickListener> = new Set();
	private tickListeners: Set<TickListener> = new Set();
	public snapshotReceived: boolean = false;

	constructor (constants: Constants, tick: number = 0) {
		this.constants = constants;
		this._tick = tick;
		this.baseTickDelay = 1000/constants.TICKRATE;
		this.snapshotInterval = Math.floor(constants.TICKRATE/constants.SNAPSHOT_INTERVAL)
		this.trailBoost = constants.SCHEDULER_TRAIL_BOOST/100;
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
		if (this.constants.WORLD_MODE === "client" && !this.snapshotReceived) {
			this.timeout = setTimeout(this.doTick.bind(this), this.baseTickDelay);
			return;	
		}

		this._tick++;

		if (this.tickListeners.size > 0) {
			for (const l of this.tickListeners) {
				l(this._tick);
			}
		}

		if (this.constants.WORLD_MODE === "server") {
			this.last_snapshot++;

			if (this.snapshotListeners.size > 0 && this.last_snapshot >= this.snapshotInterval) {
				for (const l of this.snapshotListeners) {
					l(this._tick);
				}
				this.last_snapshot = 0;
			}
		}

		this.timeout = setTimeout(this.doTick.bind(this), this.baseTickDelay + (this.offset * this.trailBoost));
	}

	adjustSpeed (snapshotTick: number) {
		const offset = snapshotTick - this._tick - this.constants.CLIENT_DELAY;
	}

	addSnapshotListener (l: TickListener) {
		this.snapshotListeners.add(l);
	}

	removeSnapshotListener (l: TickListener) {
		this.snapshotListeners.delete(l);
	}

	addTickListener (l: TickListener) {
		this.tickListeners.add(l);
	}

	removeTickListener (l: TickListener) {
		this.tickListeners.delete(l);
	}
}