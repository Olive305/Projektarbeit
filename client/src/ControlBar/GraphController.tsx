import axios from "axios";
import MyNode from "../Canvas/NodeType";

class GraphController {
  public gridSize: number;
  public nodes: Map<string, MyNode>;
  public preview_nodes: string[];
  public edges: [string, string][];
  public selectedNodes: string[];
  public listeners: (() => void)[];
  public deletedKeys: string[]; // List to store keys of deleted nodes

  public calls: number;

  static readonly node_distance: number = 3; // distance between two nodes

  // constructor for the GraphController
  public constructor(gridSize: number) {
    this.nodes = new Map();
    this.preview_nodes = [];
    this.gridSize = gridSize;
    this.edges = [];
    this.selectedNodes = [];
    this.listeners = [];
    this.deletedKeys = []; // Initialize the deleted keys list
    this.addMyRect(new MyNode("0", 1, 3, gridSize, "Start", this.nodeOnClick.bind(this)));
    this.calls = 0;
  }

  // get the prediction from the backend / server
  public handleSubmit = async (inputValue: any) => {
    try {
      const response = await axios.post("http://127.0.0.1:8080/api/predict", {
        input_value: inputValue,
      });
      return response;
    } catch (error) {
      console.error("Error occurred while submitting data:", error);
      throw error;  // You can rethrow if needed
    }
  }

  // add a node to the selected nodes
  selectNode(id: string) {
    const node = this.nodes.get(id);
    if (!node) return;
    
    node.isSelected = true;
  }
  
  clearSelection() {

    this.selectedNodes.forEach((node) => {
      const curr = this.nodes.get(node);
      if (!curr) return;
      curr.isSelected = false;
    })

    this.selectedNodes = [];
  }

  addListener(listener: () => void) {
    this.listeners.push(listener);
  }

  public notifyListeners() {
    this.listeners.forEach(listener => listener());
  }

  removeListener(listener: () => void) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  public nodeOnClick(n: MyNode) {
    // If node is not selected, select it

    console.log("clickclack")
    if (!this.nodes.has(n.id)) return
    
    if (this.nodes.get(n.id)?.isPreview) {
      // Save the old id (key)
      const oldKey = n.id;

      // Add old key to deleted keys
      this.deletedKeys.push(oldKey);
      
      // Update node id back to actual key
      n.id = n.actualKey;

      console.log("Click, actualKey:", n.actualKey, n.id)
      n.isPreview = false;
      
      // If node exists in the collection, update edges that reference the old key
      if (!this.nodes.has(n.id)) this.nodes.set(n.id, n);

      
      const edge = this.edges.find((e) => e[1] === oldKey || e[0] === oldKey);
      if (edge) {
        // Update edge's source or target depending on what matches oldKey
        if (edge[0] === oldKey) {
          edge[0] = n.id;
        }
        if (edge[1] === oldKey) {
          edge[1] = n.id;
        }
      }
      
      
      // Finally, remove the old node from the collection
      this.nodes.delete(oldKey);

      this.get_preview_nodes();

      this.notifyListeners();
      return
    }

    // we only select the node if it is not a preview node
    if (!this.selectedNodes.includes(n.id)) {
      this.selectedNodes.push(n.id);
      n.isSelected = true;
    } 
    // If node is already selected, unselect and update
    else {
      // Remove node from selectedNodes
      this.selectedNodes = this.selectedNodes.filter(id => id !== n.id);
      n.isSelected = false;
    }
  
    // Notify listeners about the update
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
    //const key = this.getAvailableKey();
    const key = "hjgjh"
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

  public selectNodesInRect(rect: { x: number, y: number, width: number, height: number }) {
    this.unselectAllNodes(); // First, unselect all nodes
  
    this.nodes.forEach((node) => {
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
  
  private rectsIntersect(rect1: { x: number, y: number, width: number, height: number }, rect2: { x: number, y: number, width: number, height: number }): boolean {
    return !(rect2.x > rect1.x + rect1.width ||
              rect2.x + rect2.width < rect1.x ||
              rect2.y > rect1.y + rect1.height ||
              rect2.y + rect2.height < rect1.y);
  }
  
  // outdated do not use !!!
  /*
  public addNode(edge_start: string, isPreview?: boolean, num_pre?: number, givenKey?: string) {
    const oldNode = this.nodes.get(edge_start);
    if (!oldNode) {
      throw new Error("GraphController: The key of the old node does not point to an existing node");
    }

    let new_x = 0;
    let new_y = 0;

    if (!isPreview || num_pre == 1)
    {
      new_x = oldNode.x + this.gridSize * (MyNode.w_val + GraphController.node_distance);
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
          new_x += this.gridSize * (MyNode.w_val + GraphController.node_distance);
        }
      } while (overlapping);
    }
    else
    {
      if (num_pre == 2)
      {
        new_x = oldNode.x + this.gridSize * (MyNode.w_val + GraphController.node_distance);
        new_y = oldNode.y - this.gridSize * GraphController.node_distance;

        let overlapping = false;
        do {
          overlapping = false;
          this.nodes.forEach((val) => {
            if (val.x === new_x && val.y === new_y) {
              overlapping = true;
            }
          });
          if (overlapping) {
            new_y += this.gridSize * (MyNode.h_val + GraphController.node_distance);
          }
        } while (overlapping);
      }
      else
      {
        new_x = oldNode.x + this.gridSize * (MyNode.w_val + GraphController.node_distance);
        new_y = oldNode.y - this.gridSize * (MyNode.h_val + GraphController.node_distance);

        let overlapping = false;
        do {
          overlapping = false;
          this.nodes.forEach((val) => {
            if (val.x === new_x && val.y === new_y) {
              overlapping = true;
            }
          });
          if (overlapping) {
            new_y += this.gridSize * (MyNode.h_val + GraphController.node_distance);
          }
        } while (overlapping);
      }
    }

    const key = (givenKey ? givenKey : this.getAvailableKey());
    const newNode = new MyNode(!isPreview ? key : this.getAvailableKey(), new_x, new_y, this.gridSize, key, this.nodeOnClick.bind(this), isPreview, key);
    this.addMyRect(newNode, isPreview);
    this.edges.push([edge_start, newNode.id]);
    if (isPreview) this.preview_nodes.push(newNode.id)
    this.notifyListeners();

    return key;
  }
*/
  // outdated do not use !!!
  /*
  public addNodeWithEdgeFromSelected() {
    if (this.selectedNodes.length > 0) {
      this.addNode(this.selectedNodes[0]);
    }
  }
    */

  public removeNode(key: string) {
    this.edges = this.edges.filter(edge => edge[0] !== key && edge[1] !== key);
    this.nodes.delete(key);
    this.deletedKeys.push(key); // Add the deleted key to the list

    this.get_preview_nodes();
    this.notifyListeners();
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

  public removeEdge(start: string, end: string) {
    this.edges = this.edges.filter(edge => 
      !(edge[0] === start && edge[1] === end) &&
      !(edge[0] === end && edge[1] === start)
    );

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

  public async get_preview_nodes() {
    // First, delete only the old preview nodes
    this.preview_nodes.forEach((nodeKey) => {
      const currentNode = this.nodes.get(nodeKey);
      
      if (currentNode?.isPreview) {
        // Remove node from the nodes map
        this.nodes.delete(nodeKey);
  
        // Remove all edges associated with the preview node
        this.edges = this.edges.filter((edge) => edge[0] !== nodeKey && edge[1] !== nodeKey);
  
        // Track deleted nodes
        this.deletedKeys.push(nodeKey);
      }
    });
  
    // Reset the preview_nodes array since we just deleted all previews
    this.preview_nodes = [];
  
    // Notify listeners after the preview nodes are deleted
    this.notifyListeners();
  
    // Fetch new preview nodes from the backend
    const response = await this.handleSubmit(this.serializeGraph());
  
    if (!(response && response.data)) return;
  
    console.log("prediction: ", response.data.predicted_value, "\nedges: ", this.edges, "\nnodes: ", this.nodes, "\npreview: ", this.preview_nodes);
  
    // Now deserialize the new preview nodes
    this.deserializePredictNodes(response.data.predicted_value);
  
    // Notify listeners after adding the new preview nodes
    this.notifyListeners();
  }
  


  public serializeGraph(): string {

    //const nodeNum = 44;
    const graphData = {
      nodes: Array.from(this.nodes.values())
        .filter(node => !node.isPreview) // Exclude preview nodes
        .map(node => ({
          id: node.id,
          x: node.get_x(),
          y: node.get_y(),
          w: node.w,
          h: node.h,
          caption: node.caption,
          actualKey: node.actualKey
        })),
      edges: this.edges.filter(edge => 
        !this.nodes.get(edge[0])?.isPreview && 
        !this.nodes.get(edge[1])?.isPreview &&
        !this.nodes.get(edge[0])?.isSelected && 
        !this.nodes.get(edge[1])?.isSelected

      ),

      deletedKeys: this.deletedKeys
    };
    return JSON.stringify(graphData);
  }

  // Deserialize JSON into graph
  public deserializeGraph(data: string) {
    const graphData = JSON.parse(data);
    var new_ids: [string, string][] = [];
    
    // Deserialize nodes
    graphData.nodes.forEach((nodeData: any) => {
      const node : MyNode = new MyNode(
        nodeData.id,
        nodeData.x + MyNode.w_val,
        nodeData.y + MyNode.h_val,
        this.gridSize,
        nodeData.caption,
        this.nodeOnClick.bind(this),
        false,
        nodeData.actualKey

      );
  
      // Map old ID to new ID
      new_ids.push([nodeData.id, node.id]);
      
      // Add node to the graph
      this.addMyRect(node);
    });
    
    // Deserialize edges
    graphData.edges.forEach((edge: [string, string]) => {
      // Find the corresponding new IDs for the edge
      const sourceId = new_ids.filter((x) => x[0] === edge[0])[0][1];
      const targetId = new_ids.filter((x) => x[0] === edge[1])[0][1];
  
      // Add the edge to the graph
      this.addEdge(sourceId, targetId);
    });

    this.deletedKeys = graphData.deletedKeys;
  
    // Notify listeners
    this.notifyListeners();
  }

  public deserializePredictNodes(data: string) {
    const parsedData = JSON.parse(data);

    const prevNodes = parsedData.returnNodes;
    this.deletedKeys = [];

    // Iterate over deletedKeys and check if they exist in parsedData
    for (const delKey of parsedData.deletedKeys) {
        if (parsedData.hasOwnProperty(delKey)) this.deletedKeys.push(delKey);
    }

    // Iterate over the keys of the object
    for (const id in prevNodes) {
        if (prevNodes.hasOwnProperty(id)) {
            const nodeData = prevNodes[id];  // Get the node data for each edgeEnd
            const previous = nodeData.edgeStart;  // Extract the edgeStart
            const node = nodeData.node;  // Extract the node details

            // Add to preview nodes
            this.preview_nodes.push(id);

            // Add node to the grid (assuming addMyRect takes parameters: MyNode instance and a boolean flag)
            this.addMyRect(
                new MyNode(id, node.x, node.y, this.gridSize, node.actualKey, this.nodeOnClick, true, node.actualKey),
                true
            );

            // Add the edge information
            this.edges.push([previous, id]);
        }
    }

    this.notifyListeners();
}


  
}

export default GraphController;
