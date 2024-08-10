import MyNode from "../Canvas/NodeType";
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
    const lines = text.split('\n');
    for (const line of lines) {
      const splitLine = line.split(' ');
      if (splitLine[0] === "E") {
        this.graphs[index][0].addEdge(splitLine[1], splitLine[2]);
        continue;
      }
      if (splitLine[0] === "N") {
        this.graphs[index][0].addMyRect(new MyNode(splitLine[1], Number(splitLine[2]), Number(splitLine[3]), this.gridSize, splitLine[4], this.graphs[index][0].nodeOnClick));
        continue;
      }
      this.graphs[index][1] = splitLine[0];
    }
  }

  async saveGraphAs(index: number) {
    const fileName = prompt("Enter the file name:");
    if (fileName) {
      const fileContent = this.generateFileContent(index);
      const blob = new Blob([fileContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
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

  private generateFileContent(index: number): string {
    let content = this.graphs[index][1] + "\n";
    this.graphs[index][0].edges.forEach(edge => {
      content += "E " + edge[0] + " " + edge[1] + "\n";
    });
    this.graphs[index][0].nodes.forEach(node => {
      content += "N " + node.id + " " + node.x + " " + node.y + " " + node.caption + "\n";
    });
    return content;
  }
}

export default MultiController;
