import GraphController from "./GraphController";

class MultiController {
	public graphs: [GraphController, string][];
	public gridSize: number;

	constructor(gSize: number) {
		this.graphs = [];
		this.gridSize = gSize;
	}

	async readGraphFromFile(file: File, handleGetPredictions: any) {
		const name = file.name;
		const index =
			this.graphs.push([
				new GraphController(this.gridSize, true, true, handleGetPredictions),
				name,
			]) - 1;

		const text = await file.text();
		this.graphs[index][0].deserializeGraph(text);
		this.graphs[index][0].get_preview_nodes();

		this.graphs[index][1] = name;
	}

	async saveGraph(index: number) {
		try {
			const graph = this.graphs[index][0];
			const graphName = this.graphs[index][1];
			const serializedData = graph.serializeGraph();

			if (!serializedData) {
				console.error("No data to download.");
				return;
			}

			const blob = new Blob([serializedData], { type: "application/json" });
			const url = URL.createObjectURL(blob);

			const a = document.createElement("a");
			a.href = url;
			a.download = `${graphName}.json`;

			document.body.appendChild(a);

			a.click();

			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} catch (error) {
			console.error("Error when downloading file:", error);
		}
	}

	async saveAllGraphs() {
		this.graphs.forEach(async (_, index) => {
			await this.saveGraph(index);
		});
	}

	createNewGraph(name: string, getPredictions: any) {
		return (
			this.graphs.push([
				new GraphController(this.gridSize, true, false, getPredictions),
				name,
			]) - 1
		);
	}

	public copySelectedNodes(index: number) {
		const graph = this.graphs[index][0];
		const selectedNodesData = graph.serializeGraph();
		localStorage.setItem("copiedNodes", selectedNodesData);
		navigator.clipboard.writeText(selectedNodesData);
	}

	public pasteNodesIntoGraph(index: number) {
		const graph = this.graphs[index][0];
		const copiedNodesData = localStorage.getItem("copiedNodes");
		if (copiedNodesData) {
			graph.deserializeGraph(copiedNodesData);
		}
	}

	public getIndexOf(controller: GraphController): number {
		return this.graphs.findIndex(
			([graphController]) => graphController === controller
		);
	}

	public convertToPetriNet = (index: any, petriNetData: any) => {
		const petriController = new GraphController(this.gridSize, false, true);
		petriController.deserializePetriNet(petriNetData);
		return this.graphs.push([
			petriController,
			"PetriNet " + this.graphs[index][1],
		]);
	};
}

export default MultiController;
