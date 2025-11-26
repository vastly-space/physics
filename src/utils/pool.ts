export default class Pool<T = unknown> {
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