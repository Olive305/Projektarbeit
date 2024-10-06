from flask import json
import numpy as np
from matrices.openMatrix import MyCsv
from pm4py.objects.conversion.dfg.variants import to_petri_net_invisibles_no_duplicates
from pm4py.objects.petri_net.obj import PetriNet, Marking
import networkx as nx


class Node:
    def __init__(self, id, x, y, actualKey, isPreview) -> None:
        self.id = id
        self.x = x
        self.y = y
        self.actualKey = actualKey
        self.isPreview = isPreview
        self.isCircle = False
        
    def to_dict(self):
        return {
            'id': self.id,
            'x': self.x,
            'y': self.y,
            'actualKey': self.actualKey,
            'isPreview': self.isPreview
        }

class Prediction:

    def __init__(self, matrix) -> None:
        self.nodes = {}
        self.preview_nodes = {}
        self.edges = {}
        
        self.actualKeySet = {}

        self.posMatrix = {}
        self.deletedKeys = []

        self.graph = None
        self.matrix = matrix
        
        self.probMin = 0.3
        self.nodeProbSet =  {}
        
    def convert_to_petri_net(self):
    
        # Create DFG from edges
        dfg = {}
        for start_node in self.edges:
            for end_node in self.edges[start_node]:
                if (start_node in self.preview_nodes or end_node in self.preview_nodes):
                    continue
                dfg[(start_node, end_node)] = dfg.get((start_node, end_node), 0) + 1

        # Parameters (optional, start/end activities can be inferred)
        parameters = {
            to_petri_net_invisibles_no_duplicates.Parameters.START_ACTIVITIES: {'start_activity': 1},
            to_petri_net_invisibles_no_duplicates.Parameters.END_ACTIVITIES: {'end_activity': 1}
        }

        # Convert DFG to Petri net
        net, im, fm = to_petri_net_invisibles_no_duplicates.apply(dfg, parameters)

        # Serialize the initial marking
        im_dict = {place.name: im[place] for place in im}

        # Serialize the final marking
        fm_dict = {place.name: fm[place] for place in fm}
        
        # Extract all nodes (places and transitions)
        all_nodes = list(net.places) + list(net.transitions)

        # Create a mapping from nodes to integers for NetworkX
        node_mapping = {node.name: i for i, node in enumerate(all_nodes)}
        
        # Build the edge list for NetworkX using integer indices
        edges = [(node_mapping[arc.source.name], node_mapping[arc.target.name]) for arc in net.arcs]

        # Create a NetworkX graph and add edges
        G = nx.Graph()
        G.add_edges_from(edges)

        # Calculate positions using NetworkX's spring layout
        pos = nx.spring_layout(G)

        # Initialize position dictionary for places and transitions
        getPos = {node.name: pos[node_mapping[node.name]] for node in all_nodes}

        # Serialize the Petri net components with positions
        net_dict = {
            'places': [{
                'id': place.name,
                'x': round(getPos[place.name][0] * 8),
                'y': round(getPos[place.name][1] * 8)
            } for place in net.places],  # List of place names and positions
            'transitions': [{
                'id': trans.name,
                'label': trans.label,
                'x': round(getPos[trans.name][0] * 8),
                'y': round(getPos[trans.name][1] * 8)
            } for trans in net.transitions],  # List of transitions (name, label, positions)
            'arcs': [{
                'source': arc.source.name,
                'target': arc.target.name
            } for arc in net.arcs]  # List of arcs (source and target place names)
        }

        # Return serialized Petri net with positions, initial marking, and final marking
        return json.dumps({
            'net': net_dict,
            'initial_marking': im_dict,
            'final_marking': fm_dict
        })




    def getPredictions(self, graph):
        # graph is the list of nodes and edges. preview nodes will be added by this code
        self.deserializeGraph(graph)

        [sequences, keySeq] = self.getAllSequences()
        i = 0
        
        numNodes = len(self.nodes)
        
        # calculate the maximal Number of nodes that should be added (for auto mode)
        numNodesToAdd = round(4 * (np.log(numNodes) * np.log(numNodes)) + 3)

        for sequence in sequences:
            predictions = self.matrix.predict(sequence, 0.0 if self.auto else self.probMin)

            for [node, probability] in predictions:
                lastNodeId = "0" if len(keySeq[i]) == 0 else keySeq[i][len(keySeq[i]) - 1]

                # if the edge to the node from lastNodeId exist, we do not add anything
                if (lastNodeId in self.edges and node in self.edges[lastNodeId]):
                    continue
                
                # if the node exists, but there is no edge to it from lastNode, we add it
                if (node in self.nodes):
                    self.addNode(lastNodeId, True, node, probability)
                    continue
                
                # we add the node with edge from lastNode
                if (lastNodeId in self.nodes):
                    self.addNode(lastNodeId, True, node, probability)

            i += 1
            
        if self.auto:
            print("auto, numNodes", numNodes, "numNodesToAdd", numNodesToAdd, "preview", self.preview_nodes, "prob", self.nodeProbSet)
            
            # Collect nodes to remove based on their probability (< 0.1)
            nodes_to_remove = [node for node in self.nodeProbSet if self.nodeProbSet[node] < 0.1]
            
            # Remove nodes with small probability and track deleted nodes
            for node in nodes_to_remove:
                print(f"Deleting node {node} with probability {self.nodeProbSet[node]}")
                del self.nodeProbSet[node]
                self.nodes.pop(node, None)  # Safely remove from nodes
                self.preview_nodes.pop(node, None)  # Safely remove from preview nodes
                self.deletedKeys.append(node)  # Track deleted node keys
                
                # Remove node from all edges
                for edge, edge_nodes in self.edges.items():
                    if node in edge_nodes:
                        edge_nodes.remove(node)
            
            # If the number of preview nodes exceeds the allowed number
            if len(self.preview_nodes) > numNodesToAdd:
                # Find the minimum probability needed to keep `numNodesToAdd` nodes
                calculatedProbMin = sorted(self.nodeProbSet.values())[numNodesToAdd]
                print("min", calculatedProbMin)

                # Collect nodes to remove that have probabilities lower than the calculated threshold
                nodes_to_remove = [node for node in self.nodeProbSet if self.nodeProbSet[node] < calculatedProbMin]
                
                # Remove these nodes and track them in deletedKeys
                for node in nodes_to_remove:
                    print(f"Deleting node {node} due to calculated probability threshold {calculatedProbMin}")
                    del self.nodeProbSet[node]
                    self.nodes.pop(node, None)
                    self.preview_nodes.pop(node, None)
                    self.deletedKeys.append(node)
                    
                    # Remove node from all edges
                    for edge, edge_nodes in self.edges.items():
                        if node in edge_nodes:
                            edge_nodes.remove(node)

                # Ensure that no more than three preview nodes are connected to the same edge
                for edge, edge_nodes in self.edges.items():
                    numPreview = sum(1 for edgeEnd in edge_nodes if edgeEnd in self.preview_nodes)
                    
                    # If more than three preview nodes, delete the ones with the smallest probability
                    while numPreview > 3:
                        # Find the node with the smallest probability on this edge
                        smallestEdge = min(
                            (edgeEnd for edgeEnd in edge_nodes if edgeEnd in self.preview_nodes),
                            key=lambda edgeEnd: self.nodeProbSet[edgeEnd],
                            default=None
                        )

                        if smallestEdge is None:
                            break

                        print(f"Deleting node {smallestEdge} from edge due to over-preview")
                        del self.nodeProbSet[smallestEdge]
                        self.nodes.pop(smallestEdge, None)
                        self.preview_nodes.pop(smallestEdge, None)
                        self.deletedKeys.append(smallestEdge)

                        # Remove smallestEdge from all edges
                        for edge_, edge_nodes_ in self.edges.items():
                            if smallestEdge in edge_nodes_:
                                edge_nodes_.remove(smallestEdge)

                        # Decrease the preview count for the current edge
                        numPreview -= 1

            # TODO: reposition the preview Nodes after deleting (there can be gaps)

        return self.serializeGraph()


    def addNode(self, edge_start, isPreview, givenKey, probability):
        oldNode = self.nodes[edge_start]
        
        new_x = oldNode.x + 1
        new_y = oldNode.y

        # calculate Position of the new node
        while (new_x, new_y) in self.posMatrix:
            # Move new_y down if possible
            if (new_x, new_y + 1) not in self.posMatrix:
                new_y += 1
            # If new_y can't move down, move up
            elif (new_x, new_y - 1) not in self.posMatrix:
                new_y -= 1
            else:
                # When new_y can't move, try moving new_x forward
                new_x += 1
                new_y = oldNode.y  # Reset new_y to the starting point

            # Check if the new position is already in the edges for edge_start
            if edge_start in self.edges:
                while self.posMatrix.get((new_x, new_y)) in self.edges[edge_start]:
                    new_y += 1  # Adjust position
                    if (new_x, new_y) not in self.posMatrix:
                        break  # Exit if we find a new, valid position

        # Create a new node at the calculated position
        newNode = Node(self.getAvailableKey() if isPreview else givenKey, new_x, new_y, givenKey, isPreview)
        
        # Add the new node to nodes and establish the edge
        self.nodes[newNode.id] = newNode
        self.nodeProbSet[newNode.id] = probability
        self.addEdge(edge_start, newNode.id)

        if isPreview:
            self.preview_nodes[newNode.id] = True

        # Update position matrix and actual key set
        self.posMatrix[(new_x, new_y)] = newNode.id
        self.actualKeySet[newNode.actualKey] = newNode.id

        

    def addEdge(self, start, end):
        if (start in self.edges):
            self.edges[start].append(end)
        else:
            self.edges[start] = [end]

    def getAllSequences(self):
        visited = {}

        # Recursive function to build sequences
        def recBuildSeq(seq, curr, keys):
            # Check if the current node has been visited to prevent loops
            if curr in visited:
                return [[], []]
            
            # Mark the current node as visited
            visited[curr] = True

            sequences = []
            keySeq = []

            # Check if the current node has outgoing edges (i.e., it's not a leaf node)
            if curr not in self.edges or not self.edges[curr]:
                # If no outgoing edges, finalize the sequence and return
                finalSeq = seq[:len(seq) - 2] + ")" if len(seq) > 1 else "()"
                return [[finalSeq], [keys]]

            # Iterate over outgoing edges
            for end in self.edges[curr]:
                # Recursively build sequences from the next node
                newSequences, newKeySeqs = recBuildSeq(
                    seq + "'" + self.nodes[end].id + "', ",  # Update the sequence string
                    end,                                    # Move to the next node
                    keys + [self.nodes[end].id]             # Add the current key
                )

                # Append the new sequences and key sequences
                sequences.extend(newSequences)
                keySeq.extend(newKeySeqs)

            # Backtrack: remove the current node from visited
            del visited[curr]

            # Add the current sequence to the result
            if len(seq) > 1:  # Only add if sequence is not empty
                finalSeq = seq[:len(seq) - 2] + ")"
                sequences = [finalSeq] + sequences
                keySeq = [keys] + keySeq

            return [sequences, keySeq]

        # Start the recursion from node "0"
        [sequences, keySeq] = recBuildSeq("(", "0", ["0"])
        if ("()" not in sequences):
            sequences.append("()")
            keySeq.append(["0"])
        
        return [sequences, keySeq]

    def getAvailableKey(self):
        # get the smallest key from the deleted keys list if possible
        if (self.deletedKeys): # check if list is empty
            self.deletedKeys.sort(reverse=True)
            return self.deletedKeys.pop()
        
        # otherwise return the current number of nodes as a key
        key = len(self.nodes)
        while ("pvw_$A1b!zX9" + str(key) in self.nodes):
            key += 1

        return "pvw_$A1b!zX9" + str(key)

    def deserializeGraph(self, graph_json_str):
        graph = json.loads(graph_json_str)  # Convert JSON string to Python dict
        
        self.auto = graph.get('auto', False)

        nodes = graph.get('nodes', [])
        edges = graph.get('edges', [])
        self.deletedKeys = graph.get('deletedKeys', [])
        
        self.probMin = graph.get('probability', 0.3)

        # add nodes
        for node in nodes:
            node_id = node.get('id')
            x = node.get('x')
            y = node.get('y')
            actualKey = node.get('actualKey')
            isPreview = node.get('isPreview', False)  # Set default value to False if not provided

            n = Node(node_id, x, y, actualKey, isPreview)  # Now passing isPreview as well
            self.nodes[node_id] = n
            self.posMatrix[(x, y)] = node_id
            
            self.actualKeySet[actualKey] = node_id

        # add edges
        for edge in edges:
            start_node = edge[0]
            end_node = edge[1]

            self.addEdge(start_node, end_node)


    def serializeGraph(self):
        returnNodes = {}
        for edgeStart in self.edges:
            for edgeEnd in self.edges[edgeStart]:
                if edgeEnd in self.preview_nodes:
                    # Correctly convert the Node object to a dict before appending
                    returnNodes[edgeEnd] = ({
                        'nodeId': edgeEnd,
                        'edgeStart': edgeStart,
                        'node': self.nodes[edgeEnd].to_dict()  # Convert Node to dict
                    })
    
        serialized_graph = {
            'dfg': {
                'returnNodes': returnNodes,
                'deletedKeys': self.deletedKeys
            },
            'PetriNet': json.loads(self.convert_to_petri_net())  # Convert string to dict
        }
        
        return json.dumps(serialized_graph)


