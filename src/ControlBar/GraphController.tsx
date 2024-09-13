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
    this.calls = 0;
  }

  handleSubmit = async (inputValue: any) => {
    try {
      const response = await axios.post("http://127.0.0.1:8080/api/predict", {
        input_value: inputValue,
      });
      return response;
    } catch (error) {
      console.error("Error occurred while submitting data:", error);
      throw error;  // You can rethrow if needed
    }
  };
  

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

  public selectNodesInRect(rect: { x: number, y: number, width: number, height: number }) {
    this.unselectAllNodes(); // First, unselect all nodes
  
    this.nodes.forEach((node) => {
      const nodeRect = {
        x: node.x,
        y: node.y,
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
  

  public addNode(edge_start: string, isPreview?: boolean, num_pre?: number, givenKey?: string) {
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

    const key = (givenKey ? givenKey : this.getAvailableKey());
    const newNode = new MyNode(!isPreview ? key : this.getAvailableKey(), new_x, new_y, this.gridSize, key, this.nodeOnClick.bind(this), isPreview, key);
    this.addMyRect(newNode, isPreview);
    this.edges.push([edge_start, newNode.id]);
    this.preview_nodes.push(newNode.id)
    this.notifyListeners();

    return key;
  }

  public addNodeWithEdgeFromSelected() {
    if (this.selectedNodes.length > 0) {
      this.addNode(this.selectedNodes[0]);
    }
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

    // Clear old preview nodes and their edges
    console.log("preview", this.preview_nodes);
    console.log("nodes", this.nodes)

    // Loop over preview nodes to remove them and their edges
    this.preview_nodes.forEach((nodeKey) => {
        const currentNode = this.nodes.get(nodeKey);
        
        if (currentNode?.isPreview) {
            // Delete node from the nodes map
            this.nodes.delete(nodeKey);

            // Remove all edges associated with the preview node
            this.edges = this.edges.filter((edge) => edge[0] !== nodeKey && edge[1] !== nodeKey);

            // Track deleted nodes
            this.deletedKeys.push(nodeKey);
        }
    });

    // Reset the preview nodes array
    this.preview_nodes = [];
    const [sequences, keySeq] = this.getAllSequences();

    var i = 0;
    for (const sequence of sequences) {
        try {
            const response = await this.handleSubmit(sequence);

            if (response && response.data) {
                const predictions: [string, number][] = response.data.predicted_value;

                console.log("predict", predictions, "sequence", sequence)

                predictions.forEach(([node, probability]) => {
                    // Ensure the node isn't already added
                    const getLastKey = (sequence: string[]) => sequence.length === 0 ? "0" : sequence[sequence.length - 1];
                    const lastNodeId = getLastKey(keySeq[i]);

                    // check if the predicted node already has a edge from the last node

                    var exists = false;

                    this.edges.filter((e) => {return e[0] === lastNodeId}).forEach((e) => {exists = exists || this.nodes.has(e[1]) ? this.nodes.get(e[1])?.actualKey === node : false})
                    


                    // Check if node is added by comparing last node id with existing edges
                    if (!exists && !(this.edges.some((e) => {return (e[0] === lastNodeId && e[1] === node)}))) {
                        const lastNode = this.nodes.get(lastNodeId);
                        if (lastNode) {
                            this.addNode(lastNodeId, true, this.preview_nodes.length + 1, node)
                        }
                    }
                });
            }
        } catch (error) {
            console.error("Error while fetching predictions:", error);
        }

        i++;  // Ensure i increments with each sequence
    }

    console.log("afterPreview", this.preview_nodes)
    this.notifyListeners();
}



private getAllSequences(): [string[], string[][]] {
  const visited: Set<string> = new Set(); // Track visited nodes for each sequence to prevent loops

  // Recursive function to build sequences
  const recBuildSeq = (seq: string, curr: string, keys: string[]): [string[], string[][]] => {
      // Check if the current node has already been visited to prevent loops
      if (visited.has(curr)) return [[], [[]]]; // No valid sequence if we hit a loop

      // Mark the current node as visited
      visited.add(curr);

      let sequences: string[] = [];
      let keySeq: string[][] = [];
      let hasEdges = false; // Check if the current node has outgoing edges

      for (const edge of this.edges) {
          const nextNode = this.nodes.get(edge[1]);
          if (edge[0] === curr && nextNode && !nextNode.isPreview) {
              // Current node has an outgoing edge to a valid (non-preview) node
              hasEdges = true;

              // Recursively build sequences for the next node
              const [newSequences, newKeySeqs] = recBuildSeq(
                  seq + "'" + nextNode.caption + "', ", 
                  edge[1], 
                  keys.concat([edge[1]])
              );

              // Concatenate new sequences and key sequences
              sequences = sequences.concat(newSequences);
              keySeq = keySeq.concat(newKeySeqs);
          }
      }

      // Backtrack: Unmark the current node before returning to allow other paths
      visited.delete(curr);

      // If no outgoing edges (terminal node), finalize the sequence and key sequence
      if (!hasEdges) {
          const finalSequence = seq.length !== 1 ? seq.substring(0, seq.length - 2) + ")" : "()";
          return [[finalSequence], [keys]]; // Return both the sequence and the key sequence
      } else {
          // Add the current sequence and key sequence to the results
          sequences = [(seq.length !== 1 ? seq.substring(0, seq.length - 2) + ")" : "()")].concat(sequences);
          keySeq = [keys].concat(keySeq);
      }

      return [sequences, keySeq];
  };

  // Start building sequences from the root node ('0')
  return recBuildSeq("(", "0", ["0"]);
}


private getAvailableKey(): string {
    // Get the smallest key from the deleted keys list if available
    if (this.deletedKeys.length > 0) {
      const smallestKey = this.deletedKeys.sort()[0];
      this.deletedKeys = this.deletedKeys.filter(key => key !== smallestKey);
      return smallestKey;
    }
    // Otherwise, return the current number of nodes as a key
    var key = this.nodes.size
    while (this.nodes.has(String(key))) key++;
    return String(key)
  }

  public serializeGraph(): string {

    //const nodeNum = 44;
    const graphData = {
      nodes: Array.from(this.nodes.values())
        .filter(node => !node.isPreview && node.isSelected) // Exclude preview nodes
        .map(node => ({
          id: node.id,
          x: node.x,
          y: node.y,
          w: node.w,
          h: node.h,
          caption: node.caption
        })),
      edges: this.edges.filter(edge => 
        !this.nodes.get(edge[0])?.isPreview && 
        !this.nodes.get(edge[1])?.isPreview &&
        !this.nodes.get(edge[0])?.isSelected && 
        !this.nodes.get(edge[1])?.isSelected

      )
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
        this.getAvailableKey(),
        nodeData.x + MyNode.w_val,
        nodeData.y + MyNode.h_val,
        this.gridSize,
        nodeData.caption,
        this.nodeOnClick.bind(this)
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
  
    // Notify listeners
    this.notifyListeners();
  }
  
}

export default GraphController;
