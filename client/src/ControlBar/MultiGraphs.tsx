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
    const index = this.graphs.push([new GraphController(this.gridSize), name]) - 1;

    const text = await file.text();
    this.graphs[index][0].deserializeGraph(text);
    this.graphs[index][1] = name;
  }

  async saveGraphAs(index: number) {
    const fileName = prompt("Enter the file name:");
    if (fileName) {
      const graphData = this.graphs[index][0].serializeGraph();
      const blob = new Blob([graphData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}.json`; // Save as .json file
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  async saveAllGraphs() {
    this.graphs.forEach(async (_, index) => {
      await this.saveGraphAs(index);
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

  private generateFileContent(index: number): string {
    let content = this.graphs[index][1] + "\n";
    this.graphs[index][0].edges.forEach(edge => {
      content += "E " + edge[0] + " " + edge[1] + "\n";
    });
    this.graphs[index][0].nodes.forEach(node => {
      content += "N " + node.id + " " + node.get_real_x + " " + node.get_real_y + " " + node.caption + "\n";
    });
    return content;
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
