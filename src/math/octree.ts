import Vector3 from "./vector3.js"
import AABB from "./aabb.js"

export interface OctItem {
	id: number;
	aabb: AABB;
}

export class OctNode {
	private _bounds: AABB;
	private _depth: number;
	private _children: (OctNode | null)[] = [null, null, null, null, null, null, null, null];
	private _items: OctItem[] = [];

	constructor (bounds: AABB, depth: number) {
		this._bounds = bounds;
		this._depth = depth
	}

	get bounds (): AABB {
		return this._bounds;
	}

	get depth (): number {
		return this._depth;
	}

	get items (): OctItem[] {
		return this._items;
	}

	insert (it: OctItem, MAX_ITEMS: number, MAX_DEPTH: number): boolean {
		if (!this._bounds.overlaps(it.aabb)) return false;

		if (this._children[0] === null && (this._items.length < MAX_ITEMS || this._depth >= MAX_DEPTH)) {
			this._items.push(it);
			return true;
		}

		if (this._children[0] === null) this.subdivide(MAX_ITEMS, MAX_DEPTH);

		const idx = this.fittingChildIndex(it.aabb);
		if (idx !== -1) {
			return this._children[idx]!.insert(it, MAX_ITEMS, MAX_DEPTH);
		}

		this._items.push(it);

		return true;
	}

	queryAABB(range: AABB, out: OctItem[]) {
		if (!this._bounds.overlaps(range)) return out;
		
		for (const it of this.items) {
			if (it.aabb.overlaps(range)) out.push(it);
		}
		
		const c = this._children;
		if (c[0]) for (let i=0;i<8;i++) c[i]!.queryAABB(range, out);

		return out;
	}

	private fittingChildIndex(box: AABB): number {
		const { min, max } = this.bounds;
		const mx = min.x + ((max.x - min.x) >> 1);
		const my = min.y + ((max.y - min.y) >> 1);
		const mz = min.z + ((max.z - min.z) >> 1);

		// сначала выбираем по центру ребёнка
		const cx = ((box.min.x + box.max.x) >> 1);
		const cy = ((box.min.y + box.max.y) >> 1);
		const cz = ((box.min.z + box.max.z) >> 1);

		const ix = (cx >= mx) ? 1 : 0;
		const iy = (cy >= my) ? 1 : 0;
		const iz = (cz >= mz) ? 1 : 0;
		const idx = (ix) | (iy<<1) | (iz<<2);

		const childBounds = this.childBounds(idx);

		return childBounds.containsAABB(box) ? idx : -1;
	}

	private subdivide(MAX_ITEMS: number, MAX_DEPTH: number) {
		for (let i=0; i<8; i++) {
			this._children[i] = new OctNode(this.childBounds(i), this.depth+1);
		}

		const staying: OctItem[] = [];
		for (let k = 0; k < this.items.length; k++) {
			const it = this.items[k];
			const idx = this.fittingChildIndex(it.aabb);

			if (idx !== -1) {
				this._children[idx]!.insert(it, MAX_ITEMS, MAX_DEPTH);
			} else {
				staying.push(it);
			}
		}
		this._items = staying;
	}

	private childBounds(i: number): AABB {
		const min = this.bounds.min, max = this.bounds.max;
		const mx = min.x + ((max.x - min.x) >> 1);
		const my = min.y + ((max.y - min.y) >> 1);
		const mz = min.z + ((max.z - min.z) >> 1);

		const ix = (i & 1) ? 1 : 0;
		const iy = (i & 2) ? 1 : 0;
		const iz = (i & 4) ? 1 : 0;

		const cmin = new Vector3(
			ix ? mx : min.x,
			iy ? my : min.y,
			iz ? mz : min.z
		);
		const cmax = new Vector3(
			ix ? max.x : mx,
			iy ? max.y : my,
			iz ? max.z : mz
		);
		return new AABB(cmin, cmax);
	}
}

export class Octree {
	root: OctNode;
	MAX_ITEMS: number;
	MAX_DEPTH: number;

	constructor(worldBounds: AABB, maxItems=8, maxDepth=8) {
		this.root = new OctNode(worldBounds, 0);
		this.MAX_ITEMS = maxItems;
		this.MAX_DEPTH = maxDepth;
	}

	insert(it: OctItem) { this.root.insert(it, this.MAX_ITEMS, this.MAX_DEPTH); }

	queryAABB(range: AABB, out: OctItem[] = []) { return this.root.queryAABB(range, out); }
}