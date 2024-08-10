import MyNode from "../Canvas/NodeType";

class GraphController {
  public gridSize: number;
  public nodes: Map<string, MyNode>;
  public edges: [string, string][];
  public selectedNodes: string[];
  public listeners: (() => void)[];

  readonly node_distance: number = 3; // distance between two nodes

  constructor(gridSize: number) {
    this.nodes = new Map();
    this.gridSize = gridSize;
    this.edges = [];
    this.selectedNodes = [];
    this.listeners = [];
    this.addMyRect(new MyNode("0", gridSize, gridSize, this.gridSize, "Start", this.nodeOnClick.bind(this)));
  }

  addListener(listener: () => void) {
    this.listeners.push(listener);
  }

  notifyListeners() {
    this.listeners.forEach(listener => listener());
  }

  removeListener(listener: () => void) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  public nodeOnClick(n: MyNode) {
    if (!this.selectedNodes.includes(n.id)) {
      this.selectedNodes.push(n.id);
      n.isSelected = true;
    } else {
      this.selectedNodes = this.selectedNodes.filter(id => id !== n.id);
      n.isSelected = false;
    }
    this.notifyListeners();
  }

  public unselectAllNodes() {
    this.selectedNodes.forEach(id => {
      const node = this.nodes.get(id);
      if (node) {
        node.isSelected = false;
      }
    });
    this.selectedNodes = [];
    this.notifyListeners();
  }

  public addRectParam(x: number, y: number, caption: string) {
    const node = new MyNode(String(this.nodes.size), x, y, this.gridSize, caption, this.nodeOnClick.bind(this));
    this.nodes.set(node.id, node);
    this.notifyListeners();
  }

  public addMyRect(node: MyNode) {
    this.nodes.set(node.id, node);
    this.notifyListeners();
  }

  public addNode(edge_start: string) {
    const oldNode = this.nodes.get(edge_start);
    if (!oldNode) {
      throw new Error("GraphController: The key of the old node does not point to an existing node");
    }
    let new_x = oldNode.x + this.gridSize * (MyNode.w_val + this.node_distance);
    const new_y = oldNode.y;
    let overlapping = false;
    do {
      overlapping = false;
      this.nodes.forEach((val) => {
        if (val.x === new_x && val.y === new_y) {
          overlapping = true;
        }
      });
      if (overlapping) {
        new_x += this.gridSize * (MyNode.w_val + this.node_distance);
      }
    } while (overlapping);

    const key = String(this.nodes.size);
    const newNode = new MyNode(key, new_x, new_y, this.gridSize, key, this.nodeOnClick.bind(this));
    this.addMyRect(newNode);
    this.edges.push([edge_start, key]);
    this.notifyListeners();
  }

  public addNodeWithEdgeFromSelected() {
    if (this.selectedNodes.length > 0) {
      this.addNode(this.selectedNodes[0]);
    }
  }

  public deleteSelectedNodes() {
    this.selectedNodes.forEach((key) => {
      this.edges = this.edges.filter(edge => edge[0] !== key && edge[1] !== key);
      this.nodes.delete(key);
    });
    this.selectedNodes = [];
    this.notifyListeners();
  }

  public deleteSelectedEdges() {
    if (this.selectedNodes.length !== 2) return;
    this.edges = this.edges.filter(edge => 
      !(edge[0] === this.selectedNodes[0] && edge[1] === this.selectedNodes[1]) &&
      !(edge[0] === this.selectedNodes[1] && edge[1] === this.selectedNodes[0])
    );
    this.notifyListeners();
  }

  public addEdge(start: string, end: string) {
    if (start === end) return;
    if (this.edges.some(e => e[0] === start && e[1] === end)) return;
    this.edges.push([start, end]);
    this.notifyListeners();
  }
}

export default GraphController;
