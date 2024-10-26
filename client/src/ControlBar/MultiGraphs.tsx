import GraphController from "./GraphController";

class MultiController {
  public graphs: [GraphController, string][];
  public gridSize: number;

  constructor(gSize: number) {
    this.graphs = [];
    this.gridSize = gSize;
  }

  async readGraphFromFile(file: File) {
    const name = file.name;
    const index = this.graphs.push([new GraphController(this.gridSize, true, true), name]) - 1;

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
  
      // Ensure there is data to download
      if (!serializedData) {
        console.error("No data to download.");
        return;
      }
  
      // Create a Blob from the serialized graph data
      const blob = new Blob([serializedData], { type: "application/json" });
      const url = URL.createObjectURL(blob);
  
      // Create an anchor element and set it up for download
      const a = document.createElement("a");
      a.href = url;
      a.download = `${graphName}.json`;
  
      // Append to the DOM to ensure it is clickable
      document.body.appendChild(a);
  
      // Trigger the download by programmatically clicking the link
      a.click();
  
      // Clean up by removing the anchor and revoking the Blob URL
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error during file download:", error);
    }
  }
  
  async saveAllGraphs() {
    this.graphs.forEach(async (_, index) => {
      await this.saveGraph(index);
    });
  }

  createNewGraph(name: string) {
    this.graphs.push([new GraphController(this.gridSize), name]);
  }

  // Function to copy selected nodes from a specific graph
  public copySelectedNodes(index: number) {
    const graph = this.graphs[index][0];
    const selectedNodesData = graph.serializeGraph();
    localStorage.setItem('copiedNodes', selectedNodesData); // Store in localStorage
    navigator.clipboard.writeText(selectedNodesData); // Optionally copy to clipboard
  }

  // Function to paste nodes into a specific graph
  public pasteNodesIntoGraph(index: number) {
    const graph = this.graphs[index][0];
    const copiedNodesData = localStorage.getItem('copiedNodes');
    if (copiedNodesData) {
      graph.deserializeGraph(copiedNodesData);
    }
  }

  public getIndexOf(controller: GraphController): number {
    return this.graphs.findIndex(([graphController]) => graphController === controller);
  }

  public convertToPetriNet(index: number): number {
    this.graphs.push([this.graphs[index][0].toPetriNet(), this.graphs[index][1] + " Petri Net"]);
    return this.graphs.length - 1; // Return the index of the newly added graph
  }
}

export default MultiController;
