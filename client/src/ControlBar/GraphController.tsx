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
  public probabilityMin: number;
  public petriNet: any;
  public showPreview;

  public calls: number;

  public activeMatrix: string;

  static readonly node_distance: number = 3; // distance between two nodes

  // Add a class-level flag to track if the function is already running
  public isGettingPreviewNodes: boolean;
  public auto: boolean;

  // constructor for the GraphController
  public constructor(gridSize: number, showPreview?: boolean) {
    this.nodes = new Map();
    this.preview_nodes = [];
    this.gridSize = gridSize;
    this.edges = [];
    this.selectedNodes = [];
    this.listeners = [];
    this.deletedKeys = []; // Initialize the deleted keys list
    this.addMyRect(new MyNode("0", 1, 3, gridSize, "Start", this.nodeOnClick.bind(this)));
    this.calls = 0;
    this.probabilityMin = 0.3;
    this.petriNet = null;
    this.showPreview = (showPreview === undefined) ? true : false;
    this.isGettingPreviewNodes = false;
    this.auto = true;

    this.activeMatrix = "Simple IOR Choice";

    this.get_preview_nodes();
}


  // get the prediction from the backend / server
  public handleSubmit = async (inputValue: any) => {
    try {
      const response = await axios.post("http://127.0.0.1:8081/api/predict", {
        input_value: inputValue,
      });
      return response;
    } catch (error) {
      console.error("Error occurred while submitting data:", error);
      throw error;  // You can rethrow if needed
    }
  }

  public setActiveMatrix = (matrix: string) => {
    this.activeMatrix = matrix;
    this.get_preview_nodes();
  }

  public toPetriNet = () => {
    return this.petriNet;

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

  public addNode = (edgeStart: string, isPreview?: boolean, givenKey?: string) => {
    // if no key is given, we create a new key
    if (!givenKey) {
      if (this.deletedKeys.length === 0) {
        givenKey = "New" + this.nodes.size.toString();
      }
      else {
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
    while (occupied){
      occupied = false;

      for (const node of this.nodes) {
        if (node[1].get_x() === new_x && node[1].get_y() === new_y) {
          occupied = true;
          break;
        }
      }

      if (occupied) new_x += 1;

    }

    let newNode = new MyNode(givenKey, new_x, new_y, this.gridSize, givenKey, this.nodeOnClick, isPreview ? isPreview : false, givenKey, false);

    this.nodes.set(newNode.id, newNode);
    this.edges.push([edgeStart, newNode.id])

    this.notifyListeners();

  }

  public notifyListeners() {
    this.listeners.forEach(listener => listener());
  }

  removeListener(listener: () => void) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  public nodeOnClick(n: MyNode) {
    // If node is not selected, select it

    if (!this.nodes.has(n.id)) return
    
    if (this.nodes.get(n.id)?.isPreview) {
      // Save the old id (key)
      const oldKey = n.id;

      // Add old key to deleted keys
      this.deletedKeys.push(oldKey);
      
      // Update node id back to actual key
      n.id = n.actualKey;

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
    // Check if the function is already running
    if (this.isGettingPreviewNodes) return;

    // If not, set the flag to indicate that the function is now running
    this.isGettingPreviewNodes = true;


    console.log("matrix", this.activeMatrix)

    try {
        if (!this.showPreview) return;

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

        // Fetch new preview nodes from the backend
        const response = await this.handleSubmit(this.serializeGraph());

        if (!(response && response.data)) throw new Error("Response does not exist");

        // Now deserialize the new preview nodes
        this.deserializePredictNodes(response.data);

        // Notify listeners after adding the new preview nodes
        this.notifyListeners();
    } catch (error) {
        console.error("Error in get_preview_nodes:", error);
    } finally {
        // Always reset the flag after the function completes, whether it succeeds or fails
        this.isGettingPreviewNodes = false;
    }
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

      deletedKeys: this.deletedKeys,
      probability: this.probabilityMin,
      auto: this.auto,
      matrix: this.activeMatrix
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
    if (!data) throw new Error("Parsed data does not exist")

    const parsedData = JSON.parse(data).dfg;
    const petriNetData = JSON.parse(data).PetriNet;
  
    

    // create this.petriNet
    this.petriNet = new GraphController(this.gridSize, false);
    this.petriNet.nodes = new Map();
    this.petriNet.deserializePetriNet(petriNetData);
  
  
    const prevNodes = parsedData.returnNodes;
    this.deletedKeys = [];
  
    // Iterate over deletedKeys and check if they exist in parsedData
    for (const delKey of parsedData.deletedKeys) {
      if (parsedData.hasOwnProperty(delKey)) {
        this.deletedKeys.push(delKey);
      }
    }
  
    // Iterate over the keys of the object
    for (const id in prevNodes) {
      if (prevNodes.hasOwnProperty(id)) {
        const nodeData = prevNodes[id];  // Get the node data for each edgeEnd
        const previous = nodeData.edgeStart;  // Extract the edgeStart
        const node = nodeData.node;  // Extract the node details
        const probability = nodeData.probability
  
        // Add to preview nodes
        this.preview_nodes.push(id);
  
        // Add node to the grid (assuming addMyRect takes parameters: MyNode instance and a boolean flag)
        this.addMyRect(
          new MyNode(id, node.x, node.y, this.gridSize, node.actualKey, this.nodeOnClick, true, node.actualKey, false, probability),
          true
        );
  
        // Add the edge information
        this.edges.push([previous, id]);
      }
    }
  
    this.notifyListeners();
  }
  

  public deserializePetriNet(petriNet: any) {
    // First, ensure this.petriNet and this.petriNet.net are defined
    console.log("petri net", petriNet)
    if (!petriNet || !petriNet.net) {
      throw new Error("petriNet data is missing or malformed.");
    }
  
    const netData = petriNet.net;  // Access the `net` object
    const new_ids: [string, string][] = [];  // Store old-to-new ID mappings
  
    // Now, check for the existence of `places`, `transitions`, and `arcs`
    if (!netData.places || !netData.transitions || !netData.arcs) {
      throw new Error("netData is missing one or more properties: 'places', 'transitions', or 'arcs'.");
    }
  
    // Deserialize places
    netData.places.forEach((place: any) => {
      const placeNode: MyNode = new MyNode(
        place.id,              // Place ID
        place.x + MyNode.w_val, // Adjusted X-coordinate
        place.y + MyNode.h_val, // Adjusted Y-coordinate
        this.gridSize,         // Grid size
        place.id,              // Label (using place ID as label for places)
        this.nodeOnClick.bind(this) // Click handler
      );
  
      // Map old ID to new ID
      new_ids.push([place.id, placeNode.id]);
  
      // Add the place node to the graph
      this.addMyRect(placeNode);
    });
  
    // Deserialize transitions
    netData.transitions.forEach((transition: any) => {
      const transitionNode: MyNode = new MyNode(
        transition.id,         // Transition ID
        transition.x + MyNode.w_val, // Adjusted X-coordinate
        transition.y + MyNode.h_val, // Adjusted Y-coordinate
        this.gridSize,         // Grid size
        transition.label,      // Label (using transition label)
        this.nodeOnClick.bind(this), // Click handler
        false,                 // Transition is not a place
        undefined,             // Custom options (if any)
        true                   // Mark as a transition
      );
  
      // Map old ID to new ID
      new_ids.push([transition.id, transitionNode.id]);
  
      // Add the transition node to the graph
      this.addMyRect(transitionNode);
    });
  
    // Deserialize arcs (edges between places and transitions)
    netData.arcs.forEach((arc: any) => {
      // Find the corresponding new IDs for the arc
      const sourceId = new_ids.find((x) => x[0] === arc.source)?.[1];
      const targetId = new_ids.find((x) => x[0] === arc.target)?.[1];
  
      if (!sourceId || !targetId) {
        console.warn(`Missing source or target for arc: ${arc.source} -> ${arc.target}`);
        return; // Skip this arc if mapping is not found
      }
  
      // Add the arc (edge) to the graph
      this.addEdge(sourceId, targetId);
    });
  }
  

}

export default GraphController;
