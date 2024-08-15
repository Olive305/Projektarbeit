import MyNode from "../Canvas/NodeType";

class GraphController {
  public gridSize: number;
  public nodes: Map<string, MyNode>;
  public preview_nodes: string[];
  public edges: [string, string][];
  public selectedNodes: string[];
  public listeners: (() => void)[];
  public deletedKeys: string[]; // List to store keys of deleted nodes

  readonly node_distance: number = 3; // distance between two nodes

  constructor(gridSize: number) {
    this.nodes = new Map();
    this.preview_nodes = [];
    this.gridSize = gridSize;
    this.edges = [];
    this.selectedNodes = [];
    this.listeners = [];
    this.deletedKeys = []; // Initialize the deleted keys list
    this.addMyRect(new MyNode("0", gridSize, 13 * gridSize, this.gridSize, "Start", this.nodeOnClick.bind(this)));
    this.get_preview_nodes();
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
    const key = this.getAvailableKey();
    const node = new MyNode(key, x, y, this.gridSize, caption, this.nodeOnClick.bind(this));
    this.nodes.set(node.id, node);

    this.get_preview_nodes();
    this.notifyListeners();
  }

  public addMyRect(node: MyNode, preview?: boolean) {
    this.nodes.set(node.id, node);

    if (preview) {} else this.get_preview_nodes();
    this.notifyListeners();
  }

  public addNode(edge_start: string, isPreview?: boolean, num_pre?: number) {
    const oldNode = this.nodes.get(edge_start);
    if (!oldNode) {
      throw new Error("GraphController: The key of the old node does not point to an existing node");
    }

    let new_x = 0;
    let new_y = 0;

    if (!isPreview || num_pre == 1)
    {
      new_x = oldNode.x + this.gridSize * (MyNode.w_val + this.node_distance);
      new_y = oldNode.y;
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
    }
    else
    {
      if (num_pre == 2)
      {
        new_x = oldNode.x + this.gridSize * (MyNode.w_val + this.node_distance);
        new_y = oldNode.y - this.gridSize * this.node_distance;

        let overlapping = false;
        do {
          overlapping = false;
          this.nodes.forEach((val) => {
            if (val.x === new_x && val.y === new_y) {
              overlapping = true;
            }
          });
          if (overlapping) {
            new_y += this.gridSize * (MyNode.h_val + this.node_distance);
          }
        } while (overlapping);
      }
      else
      {
        new_x = oldNode.x + this.gridSize * (MyNode.w_val + this.node_distance);
        new_y = oldNode.y - this.gridSize * (MyNode.h_val + this.node_distance);

        let overlapping = false;
        do {
          overlapping = false;
          this.nodes.forEach((val) => {
            if (val.x === new_x && val.y === new_y) {
              overlapping = true;
            }
          });
          if (overlapping) {
            new_y += this.gridSize * (MyNode.h_val + this.node_distance);
          }
        } while (overlapping);
      }
    }

    const key = this.getAvailableKey();
    const newNode = new MyNode(key, new_x, new_y, this.gridSize, key, this.nodeOnClick.bind(this), isPreview);
    this.addMyRect(newNode, isPreview);
    this.edges.push([edge_start, key]);
    this.notifyListeners();

    return key;
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
      this.deletedKeys.push(key); // Add the deleted key to the list
    });
    this.selectedNodes = [];

    this.get_preview_nodes();
    this.notifyListeners();
  }

  public deleteSelectedEdges() {
    if (this.selectedNodes.length !== 2) return;
    this.edges = this.edges.filter(edge => 
      !(edge[0] === this.selectedNodes[0] && edge[1] === this.selectedNodes[1]) &&
      !(edge[0] === this.selectedNodes[1] && edge[1] === this.selectedNodes[0])
    );

    this.get_preview_nodes();
    this.notifyListeners();
  }

  public addEdge(start: string, end: string) {
    if (start === end) return;
    if (this.edges.some(e => (e[0] === start && e[1] === end) || (e[0] === end && e[1] === start))) return;
    this.edges.push([start, end]);

    this.get_preview_nodes();
    this.notifyListeners();
  }

  public get_preview_nodes() {

    // Remove old preview nodes and their associated edges
    this.preview_nodes.forEach((node) => {
      const currentNode = this.nodes.get(node);
      if (currentNode?.isPreview) {
        this.nodes.delete(node);
        // Remove edges associated with the preview node
        this.edges = this.edges.filter((edge) => edge[0] !== node && edge[1] !== node);
        this.deletedKeys.push(node); // Add the preview node key to the deleted keys list
      }
    });

    // Reset the preview nodes array
    this.preview_nodes = [];

    // Add new preview nodes
    for (let i = 0; i < 3; i++) {
      const previewNodeKey = this.addNode("0", true);
      this.preview_nodes.push(previewNodeKey);
    }

    this.notifyListeners();
  }

  private getAvailableKey(): string {
    // Get the smallest key from the deleted keys list if available
    if (this.deletedKeys.length > 0) {
      const smallestKey = this.deletedKeys.sort()[0];
      this.deletedKeys = this.deletedKeys.filter(key => key !== smallestKey);
      return smallestKey;
    }
    // Otherwise, return the current number of nodes as a key
    return String(this.nodes.size);
  }
}

export default GraphController;
