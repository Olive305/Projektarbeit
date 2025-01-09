import MyNode from "../Canvas/NodeType";

class GraphController {
	public gridSize: number;
	public nodes: Map<string, MyNode>;
	public preview_nodes: string[];
	public edges: [string, string][];
	public selectedNodes: string[];
	public listeners: (() => void)[];
	public deletedKeys: string[];
	public probabilityMin: number;
	public showPreview: boolean;
	public supportMin: number;

	public calls: number;

	public activeMatrix: string;
	public getPredictions: any;

	static readonly node_distance: number = 3;

	public isGettingPreviewNodes: boolean;
	public auto: boolean;

	public sequences: any[][]; // List of tuples with arbitrary length


	public constructor(
		gridSize: number,
		showPreview?: boolean,
		notAddStartingNode?: boolean,
		handleGetPredictions?: any
	) {
		this.nodes = new Map();
		this.preview_nodes = [];
		this.gridSize = gridSize;
		this.edges = [];
		this.selectedNodes = [];
		this.listeners = [];
		this.deletedKeys = [];
		this.calls = 0;
		this.probabilityMin = 0.3;
		this.showPreview =
			showPreview !== undefined && showPreview === false ? false : true;
		this.isGettingPreviewNodes = false;
		this.auto = true;
		this.sequences = [[]];
		this.supportMin = 1;

		if (!notAddStartingNode)
			this.addMyRect(
				new MyNode(
					"starting_with_key:0",
					1,
					3,
					gridSize,
					"Start",
					this.nodeOnClick.bind(this)
				)
			);
		this.calculateColor("starting_with_key:0");

		this.activeMatrix = "Simple IOR Choice";
		this.getPredictions = handleGetPredictions;
	}

	public calculateColor = (id: string) => {
		const colorList = [
			"#FF0000", // Red
			"#00FF00", // Green
			"#0000FF", // Blue
			"#FFA500", // Orange
			"#800080", // Purple
			"#FFC0CB", // Pink
			"#008080", // Teal
			"#000080", // Navy
			"#4B0082", // Indigo
			"#EE82EE", // Violet
			"#FFD700", // Gold
			"#D2691E", // Chocolate
			"#FF4500", // Orangered
		];

		let excludeColors = [];
		for (const [edgeStart, edgeEnd] of this.edges) {
			if (edgeStart === id) {
				excludeColors.push(this.nodes.get(edgeEnd)?.color);
			}
			if (edgeEnd === id) {
				excludeColors.push(this.nodes.get(edgeStart)?.color);
			}
		}

		// linear congruential generator (LCG)
		let i = (7 * this.nodes.size + 3) % colorList.length;

		// increase the color until it is not in the excluded list
		let excluded = false;
		do {
			for (const col of excludeColors) {
				if (col === colorList[i]) {
					excluded = true;
					break;
				}
			}
			if (excluded) i += 1;
		} while (excluded);

		const node = this.nodes.get(id);

		if (node) node.color = colorList[i];

		this.notifyListeners();
	};

	public setActiveMatrix = (matrix: string) => {
		this.activeMatrix = matrix;
		this.get_preview_nodes();
	};

	// add a node to the selected nodes
	selectNode(id: string) {
		const node = this.nodes.get(id);
		if (!node) return;
		if (this.preview_nodes.includes(id)) return;

		this.selectedNodes.push(id);
		node.isSelected = true;
	}

	clearSelection() {
		this.selectedNodes.forEach((node) => {
			const curr = this.nodes.get(node);
			if (!curr) return;
			curr.isSelected = false;
		});

		this.selectedNodes = [];
	}

	addListener(listener: () => void) {
		this.listeners.push(listener);
	}

	public addNode = (
		edgeStart: string,
		isPreview?: boolean,
		givenKey?: string
	) => {
		// if no key is given, we create a new key
		if (!givenKey) {
			if (this.deletedKeys.length === 0) {
				givenKey = "New" + this.nodes.size.toString();
			} else {
				this.deletedKeys.sort();
				givenKey = this.deletedKeys[0];
			}
		}

		// get the position of the new node
		let new_x = this.nodes.get(edgeStart)?.get_x();
		let new_y = this.nodes.get(edgeStart)?.get_y();

		new_x = new_x ? new_x : 0;
		new_y = new_y ? new_y : 0;

		// check if the location is already occupied
		let occupied = true;
		while (occupied) {
			occupied = false;

			for (const node of this.nodes) {
				if (node[1].get_x() === new_x && node[1].get_y() === new_y) {
					occupied = true;
					break;
				}
			}

			if (occupied) new_x += 1;
		}

		let newNode = new MyNode(
			givenKey,
			new_x,
			new_y,
			this.gridSize,
			givenKey,
			this.nodeOnClick,
			isPreview ? isPreview : false,
			givenKey,
			false
		);

		this.nodes.set(newNode.id, newNode);
		this.edges.push([edgeStart, newNode.id]);

		this.notifyListeners();
		this.get_preview_nodes();
	};

	public notifyListeners() {
		this.listeners.forEach((listener) => listener());
	}

	removeListener(listener: () => void) {
		this.listeners = this.listeners.filter((l) => l !== listener);
	}

	public nodeOnClick(n: MyNode) {
		// If node is not selected, select it

		if (!this.nodes.has(n.id)) return;

		if (this.nodes.get(n.id)?.isPreview) {
			// Save the old id (key)
			const oldKey = n.id;

			// Add old key to deleted keys
			this.deletedKeys.push(oldKey);

			// Remove the node from the preview nodes
			this.preview_nodes = this.preview_nodes.filter(
				(nodeKey) => nodeKey !== oldKey
			);

			// Update node id back to actual key
			n.id = n.actualKey;

			n.isPreview = false;

			if (!this.nodes.has(n.id)) {
				this.nodes.set(n.id, n);
				this.calculateColor(n.id);
			}

			const edge = this.edges.find((e) => e[1] === oldKey || e[0] === oldKey);
			if (edge) {
				// Update edges start or end
				if (edge[0] === oldKey) {
					edge[0] = n.id;
				}
				if (edge[1] === oldKey) {
					edge[1] = n.id;
				}

				const edgeEnd = this.nodes.get(edge[1]);
				if (edgeEnd) edgeEnd.support += n.support;
			}

			// remove the old node from the collection
			this.nodes.delete(oldKey);

			this.get_preview_nodes();

			this.notifyListeners();
			return;
		}

		// we only select the node if it is not a preview node
		if (!this.selectedNodes.includes(n.id)) {
			this.selectedNodes.push(n.id);
			n.isSelected = true;
		}
		// If node is already selected, remove from selected list
		else {
			// Remove node from selectedNodes
			this.selectedNodes = this.selectedNodes.filter((id) => id !== n.id);
			n.isSelected = false;
		}

		this.notifyListeners();
	}

	public unselectAllNodes() {
		this.selectedNodes.forEach((id) => {
			const node = this.nodes.get(id);
			if (node) {
				node.isSelected = false;
			}
		});
		this.selectedNodes = [];
		this.notifyListeners();
	}

	public addRectParam(x: number, y: number, caption: string) {
		//const key = this.getAvailableKey();
		const key = "hjgjh";
		const node = new MyNode(
			key,
			x,
			y,
			this.gridSize,
			caption,
			this.nodeOnClick.bind(this)
		);
		this.nodes.set(node.id, node);

		this.get_preview_nodes();
		this.notifyListeners();
	}

	public addMyRect(node: MyNode) {
		this.nodes.set(node.id, node);
		this.notifyListeners();
	}

	public selectNodesInRect(rect: {
		x: number;
		y: number;
		width: number;
		height: number;
	}) {
		this.unselectAllNodes();

		this.nodes.forEach((node) => {
			if (this.preview_nodes.includes(node.id)) {
				return;
			}
			const nodeRect = {
				x: node.get_real_x(),
				y: node.get_real_y(),
				width: node.w,
				height: node.h,
			};

			if (this.rectsIntersect(rect, nodeRect)) {
				node.isSelected = true;
				this.selectedNodes.push(node.id);
			} else {
				node.isSelected = false;
			}
		});

		this.notifyListeners();
	}

	private rectsIntersect(
		rect1: { x: number; y: number; width: number; height: number },
		rect2: { x: number; y: number; width: number; height: number }
	): boolean {
		return !(
			rect2.x > rect1.x + rect1.width ||
			rect2.x + rect2.width < rect1.x ||
			rect2.y > rect1.y + rect1.height ||
			rect2.y + rect2.height < rect1.y
		);
	}

	public removeNode(key: string) {
		if (key === "starting_with_key:0") return;
		this.edges = this.edges.filter(
			(edge) => edge[0] !== key && edge[1] !== key
		);
		this.nodes.delete(key);

		this.get_preview_nodes();
		this.notifyListeners();
	}

	public deleteSelectedNodes() {
		this.selectedNodes.forEach((key) => {
			if (key === "starting_with_key:0") return;
			this.edges = this.edges.filter(
				(edge) => edge[0] !== key && edge[1] !== key
			);
			this.nodes.delete(key);
		});
		this.selectedNodes = [];

		this.get_preview_nodes();
		this.notifyListeners();
	}

	public removeEdge(start: string, end: string) {
		this.edges = this.edges.filter(
			(edge) =>
				!(edge[0] === start && edge[1] === end) &&
				!(edge[0] === end && edge[1] === start)
		);

		this.get_preview_nodes();
		this.notifyListeners();
	}

	public deleteSelectedEdges() {
		if (this.selectedNodes.length !== 2) return;
		this.edges = this.edges.filter(
			(edge) =>
				!(
					edge[0] === this.selectedNodes[0] && edge[1] === this.selectedNodes[1]
				) &&
				!(
					edge[0] === this.selectedNodes[1] && edge[1] === this.selectedNodes[0]
				)
		);

		this.get_preview_nodes();
		this.notifyListeners();
	}

	public addEdge(start: string, end: string) {
		if (start === end) return;
		if (
			this.edges.some(
				(e) =>
					(e[0] === start && e[1] === end) || (e[0] === end && e[1] === start)
			)
		)
			return;
		this.edges.push([start, end]);

		this.get_preview_nodes();
		this.notifyListeners();
	}

	public async get_preview_nodes() {
		if (this.isGettingPreviewNodes || !this.showPreview) return;
		this.isGettingPreviewNodes = true;

		try {
			// Delete old preview nodes and their edges
			this.preview_nodes = this.preview_nodes.filter((nodeKey) => {
				const currentNode = this.nodes.get(nodeKey);
				if (currentNode?.isPreview) {
					this.nodes.delete(nodeKey);
					this.deletedKeys.push(nodeKey);
					return false;
				}
				return true;
			});

			this.edges = this.edges.filter(
				(edge) =>
					!this.deletedKeys.includes(edge[0]) &&
					!this.deletedKeys.includes(edge[1])
			);

			// fetch preview nodes from backend
			const response = await this.getPredictions(
				this.serializeGraph(),
				this.activeMatrix
			);

			// Check if the response has rigth format
			if (response && response.predictions) {
				// Deserialize
				this.deserializePredictNodes(response.predictions);
			} else {
				console.error("Invalid response:", response);
			}

			this.notifyListeners();
		} catch (error) {
			console.error("Error in get_preview_nodes:", error);
		} finally {
			// allow calling this again
			this.isGettingPreviewNodes = false;
		}
	}

	public serializeGraph(): string {
		const graphData = {
			nodes: Array.from(this.nodes.values())
				.filter((node) => !node.isPreview) // Exclude preview nodes
				.map((node) => ({
					id: node.id,
					x: node.get_x(),
					y: node.get_y(),
					realX: node.get_real_x(),
					realY: node.get_real_y(),
					caption: node.caption,
					actualKey: node.actualKey,
					probability: node.probability,
					color: node.color,
					comment: node.comment,
					support: node.support,
				})),
			edges: this.edges.filter(
				(edge) =>
					!this.nodes.get(edge[0])?.isPreview &&
					!this.nodes.get(edge[1])?.isPreview &&
					!this.nodes.get(edge[0])?.isSelected &&
					!this.nodes.get(edge[1])?.isSelected
			),

			deletedKeys: this.deletedKeys,
			probability: this.probabilityMin,
			support: this.supportMin,
			auto: this.auto,
			matrix: this.activeMatrix,
		};
		const data = JSON.stringify(graphData);
		return data;
	}

	// Deserialize JSON into graph
	public deserializeGraph(data: string) {
		try {
			const graphData = JSON.parse(data);
			const new_ids: [string, string][] = [];

			// Remove existing nodes and edges
			this.nodes.clear();
			this.edges = [];
			this.deletedKeys = [];

			// Deserialize nodes
			graphData.nodes.forEach((nodeData: any) => {
				const node: MyNode = new MyNode(
					nodeData.id,
					nodeData.x + MyNode.w_val,
					nodeData.y + MyNode.h_val,
					this.gridSize,
					nodeData.caption,
					this.nodeOnClick.bind(this),
					false,
					nodeData.actualKey,
					false,
					nodeData.probability,
					nodeData.support
				);

				node.set_real_x(nodeData.realX);
				node.set_real_y(nodeData.realY);
				node.color = nodeData.color;
				node.comment = nodeData.comment;

				// Map old Id to new id
				new_ids.push([nodeData.id, node.id]);

				this.addMyRect(node);
			});

			graphData.edges.forEach((edge: [string, string]) => {
				const sourceId = new_ids.find((x) => x[0] === edge[0])?.[1];
				const targetId = new_ids.find((x) => x[0] === edge[1])?.[1];

				if (sourceId && targetId) {
					// Add the edge to the graph
					this.edges.push([sourceId, targetId]);
				} else {
					console.warn(
						`Skipped edge because of missing start or end: ${edge[0]} -> ${edge[1]}`
					);
				}
			});

			this.deletedKeys = graphData.deletedKeys;
			this.activeMatrix = graphData.matrix;
			this.probabilityMin = graphData.probability;
			this.supportMin = graphData.support;
			this.auto = graphData.auto;
		} catch (error) {
			console.error("Cant deserialize graph:", error);
		}
	}

	public deserializePredictNodes(data: string) {
		if (!data || typeof data !== "string")
			throw new Error(
				"Parsed data has wrong form"
			);

		let parsedData;
		try {
			parsedData = JSON.parse(data).dfg;
		} catch (error) {
			if (error instanceof Error) {
				throw new Error("Failed to parse JSON data: " + error.message);
			} else {
				throw new Error("Failed to parse JSON data: Unknown error");
			}
		}

		const prevNodes = parsedData.returnNodes;
		this.deletedKeys = [];

		// Loop over deleted keys and check if they exist in parsedData
		for (const delKey of parsedData.deletedKeys) {
			if (parsedData.hasOwnProperty(delKey)) {
				this.deletedKeys.push(delKey);
			}
		}

		for (const id in prevNodes) {
			if (prevNodes.hasOwnProperty(id)) {
				const nodeData = prevNodes[id];
				const previous = nodeData.edgeStart;
				const node = nodeData.node;
				const probability = nodeData.probability;
				const support = nodeData.support;

				this.preview_nodes.push(id);

				this.addMyRect(
					new MyNode(
						id,
						node.x,
						node.y,
						this.gridSize,
						node.actualKey,
						this.nodeOnClick,
						true,
						node.actualKey,
						false,
						probability,
						support
					)
				);

				const newNode = this.nodes.get(id);
				const prevNode = this.nodes.get(previous);
				if (newNode && prevNode) newNode.color = prevNode.color;

				this.edges.push([previous, id]);
			}
		}

		this.notifyListeners();
	}

	public deserializeNodePositions(data: any) {
		let nodeData = JSON.parse(data.positions);

		for (const id in nodeData) {
			if (nodeData.hasOwnProperty(id)) {
				const nodePos = nodeData[id];
				const node = this.nodes.get(id);

				if (node) {
					node.set_x(nodePos[0]);
					node.set_y(nodePos[1]);
				}
			}
		}

		this.notifyListeners();
	}

	public deserializePetriNet(petriNet: any) {
		if (!petriNet || !petriNet.net) {
			throw new Error("petriNet data hs wrong form");
		}

		const netData = JSON.parse(petriNet.net);
		const new_ids: [string, string][] = [];

		if (!netData.places || !netData.transitions || !netData.arcs) {
			throw new Error(
				"net data is malformed. (Either places, arcs or tranistions missing)"
			);
		}

		// Deserialize places
		netData.places.forEach((place: any) => {
			const placeNode: MyNode = new MyNode(
				place.id,
				place.x + MyNode.w_val,
				place.y + MyNode.h_val,
				this.gridSize,
				"",
				this.nodeOnClick.bind(this),
				false,
				place.id,
				true
			);

			new_ids.push([place.id, placeNode.id]);

			this.addMyRect(placeNode);
		});

		netData.transitions.forEach((transition: any) => {
			const transitionNode: MyNode = new MyNode(
				transition.id, 
				transition.x + MyNode.w_val,
				transition.y + MyNode.h_val,
				this.gridSize,
				transition.label,
				this.nodeOnClick.bind(this), 
				false, 
				undefined, 
				false
			);

			new_ids.push([transition.id, transitionNode.id]);

			this.addMyRect(transitionNode);
		});

		netData.arcs.forEach((arc: any) => {
			const sourceId = new_ids.find((x) => x[0] === arc.source)?.[1];
			const targetId = new_ids.find((x) => x[0] === arc.target)?.[1];

			if (!sourceId || !targetId) {
				console.warn(
					`Missing source or target for arc: ${arc.source} -> ${arc.target}`
				);
				return;
			}

			this.addEdge(sourceId, targetId);
		});
	}
}

export default GraphController;
