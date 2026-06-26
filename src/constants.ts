export default class Constants {
	public WORLD_MODE: 'standalone' | 'server' | 'client' = 'standalone';
	public GLOBAL_SPEED: number = 5000;
	public MAX_DOWN_SPEED: number = -10000;
	public GLOBAL_GRAVITY: number = 9870;
	public MAX_DEPENETRATION_ITERATIONS: number = 3;
	public MAX_SLOPE: number = 45;
	public STEP_UP_HEIGHT: number = 200;
	public TICKRATE: number = 20;
	public GROUND_PROBE: number = 200;
	public NUM_DIRECTIONS = 360;
	public SNAPSHOT_INTERVAL = 4;
	public SCHEDULER_TRAIL_SNAP = 20;
	public SCHEDULER_TRAIL_BOOST = 2;
	public MAX_INTERPOLATION_TICKS = 5;
	public CLIENT_DELAY = 5;
	public CORRECTION_TICKS = 4;
}