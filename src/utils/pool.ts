import Vector3 from "../math/vector3.js"
import AABB from "../math/aabb.js"

class Pool<T = unknown> {
	private index: number = 0;
	private instances: T[] = [];
	private factoryFn: () => T;

	constructor (factoryFn: () => T) {
		this.factoryFn = factoryFn;
	}

	alloc () {
		if (this.index === this.instances.length) {
			this.instances.push(this.factoryFn());
		}
		return this.instances[this.index++];
	}

	reset () {
		this.index = 0;
	}
}

const VecPool = new Pool<Vector3>(() => {
	return new Vector3();
});
const AABBPool = new Pool<AABB>(() => {
	return new AABB(new Vector3(), new Vector3());
});

export {
	Pool,
	VecPool,
	AABBPool
}