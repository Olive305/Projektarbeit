import time
from flask import json
import numpy as np
from matrices.openMatrix import MyCsv
from pm4py.objects.conversion.dfg.variants import to_petri_net_invisibles_no_duplicates
from pm4py.objects.petri_net.obj import PetriNet, Marking
import graphviz


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

    def __init__(self, matrices) -> None:
        self.nodes = {}
        self.preview_nodes = {}
        self.edges = {}
        
        self.actualKeySet = {}

        self.posMatrix = {} #{(x, y): nodeId}
        self.deletedKeys = []

        self.graph = None
        self.matrices = matrices
        self.matrix = matrices["Simple IOR Choice"]
        
        self.probMin = 0.3
        self.nodeProbSet =  {}
        self.auto = False
        
        self.startTime = time.time()
        
        
    def positionNodes(self):
        # do this for each node (by getting the edge_starts)
        for edgeStart in self.edges: 
            nodesToPosition = []  
            
            # we only need to position preview nodes
            for edgeEnd in self.edges[edgeStart]: 
                if edgeEnd in self.preview_nodes:
                    nodesToPosition.append(edgeEnd)
                    
            # calculate the current position to be used for this starting node
            curr_y = self.nodes[edgeStart].y # Haha curry
            curr_x = self.nodes[edgeStart].x + 1
            
            
            # we try finding a gap, where we can put all the preview nodes which start from one node
            gapStart = curr_y
            gapFound = False
            
            while not gapFound:
                # first check the standart gap (placing the nodes nearly aligned such that the middle is next to the starting node)
                gapSize = 0
                i = round(len(nodesToPosition) / 2)
                
                if (len(nodesToPosition) == 1):
                    i = 1
                
                if (curr_x, curr_y - i) not in self.posMatrix:
                    # if we have found a free place, we check, if it borders to enough free places such that 
                    curr_curr_y = curr_y - i + 1 # recursive current XD
                    while (curr_x, curr_curr_y) not in self.posMatrix:
                        gapSize += 1
                        curr_curr_y += 1
                        if (gapSize > len(nodesToPosition)):
                            gapFound = True
                            gapStart = curr_y - i + 1
                            break
                            
                if gapFound:
                    break
                
                gapSizeTop = 0
                gapSizeBottom = 0
                for i in range(max(round(np.sqrt(len(self.preview_nodes))), 5)):
                    # we start by going up
                    if (curr_x, curr_y - i) not in self.posMatrix:
                        # if we have found a free place, we check, if it borders to enough free places such that 
                        curr_curr_y = curr_y - i + 1
                        while (curr_x, curr_curr_y) not in self.posMatrix:
                            gapSizeTop += 1
                            curr_curr_y += 1
                            if (gapSizeTop > len(nodesToPosition) + 1):
                                gapFound = True
                                gapStart = curr_y - i + 1
                                break
                                
                    if gapFound:
                        break
                        
                    # then we go down
                    if (curr_x, curr_y + i) not in self.posMatrix:
                        # if we have found a free place, we check, if it borders to enough free places such that 
                        curr_curr_y = curr_y + i + 1
                        while (curr_x, curr_curr_y) not in self.posMatrix:
                            gapSizeBottom += 1
                            curr_curr_y += 1
                            if (gapSizeBottom > len(nodesToPosition) + 1):
                                gapFound = True
                                gapStart = curr_y + i + 1
                                break
                                
                    if gapFound:
                        break
                        
                if not gapFound:
                    curr_x += 1 
                        
            curr_y = gapStart
                    
            # now the gap should be found and we add the nodes to the gap sorted by probability
            while len(nodesToPosition) > 0:
                # first we search for the node with the highest probability
                node = nodesToPosition[0]
                for compNode in nodesToPosition:
                    if self.nodeProbSet[compNode] > self.nodeProbSet[node]:
                        node = compNode
                        
                nodesToPosition.remove(node)
                self.posMatrix[(curr_x, curr_y)] = node
                self.nodes[node].x = curr_x
                self.nodes[node].y = curr_y
                curr_y += 1
                
                    
                    
        
    def convert_to_petri_net(self):
        transitions = dict(self.nodes)
        places = {}
        arcs = []
        deleteTrans = []

        # Remove transitions that are in preview_nodes
        for trans in transitions:
            if trans in self.preview_nodes:
                deleteTrans.append(trans)

        for trans in deleteTrans:
            del transitions[trans]

        # Process edges and create places
        for edgeStart in self.edges:
            for edgeEnd in self.edges[edgeStart]:
                if not (edgeStart in self.preview_nodes or edgeEnd in self.preview_nodes):
                    place_name = "place_" + edgeStart + "_to_" + edgeEnd
                    places[place_name] = Node(place_name, 0, 0, place_name, False)
                    arcs.append((edgeStart, place_name))
                    arcs.append((place_name, edgeEnd))
                    
        addEnd = []
        
        for trans in transitions:
            if (trans not in self.edges):
                addEnd.append(trans)
            add = True
            for edgeEnd in self.edges[trans]:
                if edgeEnd not in self.preview_nodes:
                    add = False
            if add:
                addEnd.append(trans)
                
                
        edgeReverseSet = {}
        
        for edgeStart in self.edges:
            for edgeEnd in self.edges[edgeStart]:
                if edgeEnd in edgeReverseSet:
                    edgeReverseSet[edgeEnd].append(edgeStart)
                else:
                    edgeReverseSet[edgeEnd] = [edgeStart]
                    
        addStart = []
        
        for trans in transitions:
            if (trans not in edgeReverseSet or len(edgeReverseSet[trans]) == 0):
                addStart.append(trans)  
                
        for place in addEnd:
            place_name = "place_from_" + place
            places[place_name] = Node(place_name, 0, 0, place_name, False)
            arcs.append((place, place_name))    
            
        for place in addStart:
            place_name = "place_to_" + place
            places[place_name] = Node(place_name, 0, 0, place_name, False)
            arcs.append((place_name, place))          

        # Convert to graphviz Digraph
        dot = graphviz.Digraph(engine="dot")

        for transition in transitions:
            dot.node(transition, transition)

        for place in places:
            dot.node(place, place)

        for arc in arcs:
            dot.edge(arc[0], arc[1])

        # Use Graphviz layout engine to compute node positions
        dot.format = 'plain'  # Use 'plain' format to get node positions in an easily parsable format
        plain_output = dot.pipe().decode('utf-8')

        # Parse the output to get node positions
        node_positions = {}
        lines = plain_output.splitlines()

        for line in lines:
            parts = line.split()
            if parts[0] == 'node':  # If this is a node definition line
                node_id = parts[1]
                x_pos = float(parts[2])
                y_pos = float(parts[3])
                node_positions[node_id] = (x_pos, y_pos)

        # Serialize the Petri net components with positions
        net_dict = {
            'places': [{
                'id': place,
                'x': round(-node_positions.get(place, (0, 0))[1]),  # Use default position (0, 0) if not found
                'y': round(node_positions.get(place, (0, 0))[0])
            } for place in places],
            'transitions': [{
                'id': trans,
                'label': trans,
                'x': round(-node_positions.get(trans, (0, 0))[1]),  # Use default position (0, 0) if not found
                'y': round(node_positions.get(trans, (0, 0))[0])
            } for trans in transitions],
            'arcs': [{
                'source': arc[0],
                'target': arc[1]
            } for arc in arcs]
        }

        # Return serialized Petri net with positions
        return json.dumps({
            'net': net_dict,
        })



    def getPredictions(self, graph):
        print("start getting Predictions:", self.startTime - time.time())
        # graph is the list of nodes and edges. preview nodes will be added by this code
        self.deserializeGraph(graph)
        
        print("finnished deserialization", self.startTime - time.time())

        [sequences, keySeq] = self.getAllSequences()
        i = 0
        
        print("finnished sequences", self.startTime - time.time(), "num seq", len(sequences))
        
        numNodes = len(self.nodes)
        
        # calculate the maximal Number of nodes that should be added (for auto mode)
        numNodesToAdd = round(4 * (np.log(numNodes) * np.log(numNodes)) + 3)
        
        print("numNodes", numNodes, "add", numNodesToAdd)
        
        t = 0

        for sequence in sequences:
            predictions = self.matrix.predict(sequence, 0.0 if self.auto else self.probMin)

            for [node, probability] in predictions:
                if probability < 0.001:
                    continue
                
                lastNodeId = "0" if len(keySeq[i]) == 0 else keySeq[i][len(keySeq[i]) - 1]

                # if the edge to the node from lastNodeId exist, we do not add anything
                if (lastNodeId in self.edges and node in self.edges[lastNodeId]):
                    print("exists")
                    continue
                
                
                print(lastNodeId, node, probability)
                
                # check if a preview node with the actual key already exists
                existsKey = False
                
                if lastNodeId in self.edges:
                    for edgeEnd in self.edges[lastNodeId]:
                        if node == self.nodes[edgeEnd].actualKey:
                            existsKey = True
                            break
                
                if existsKey:
                    print("exists and change probability")
                    if (self.nodeProbSet[self.actualKeySet[node]] < probability):
                        self.nodeProbSet[self.actualKeySet[node]] = probability
                    continue
                
                # we add the node with edge from lastNode
                if (lastNodeId in self.nodes):
                    print("add node")
                    print(self.addNode(lastNodeId, True, node, probability))

            i += 1
            
            
        if self.auto:
            
            # Collect nodes to remove based on their probability (< 0.1)
            # nodes_to_remove_prob = [node for node in self.nodeProbSet if self.nodeProbSet[node] < 0.001]
            
            
            '''
            # Remove nodes with small probability and track deleted nodes
            for node in nodes_to_remove_prob:
                del self.nodeProbSet[node]
                self.nodes.pop(node, None)  # Safely remove from nodes
                self.preview_nodes.pop(node, None)  # Safely remove from preview nodes
                self.deletedKeys.append(node)  # Track deleted node keys
                
                # Remove node from all edges
                for edge, edge_nodes in self.edges.items():
                    if node in edge_nodes:
                        edge_nodes.remove(node)
            '''
            # Ensure that no more than three preview nodes are connected to the same edge
            for edge, edge_nodes in self.edges.items():
                print("no more than 3", edge)
                numPreview = sum(1 for edgeEnd in edge_nodes if edgeEnd in self.preview_nodes)
                print(edge, numPreview)
                
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
                    
                    print("smallestEdge", smallestEdge)

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
                    
        # If the number of preview nodes exceeds the allowed number
        if len(self.preview_nodes) > numNodesToAdd:
            
            print("\nnum nodes to add too big, nodes to add", numNodesToAdd, "num preview", len(self.preview_nodes))
            # Find the minimum probability needed to keep `numNodesToAdd` nodes
            calculatedProbMin = sorted(self.nodeProbSet.values(), reverse=True)[numNodesToAdd]

            
            print("prob min", calculatedProbMin)

            # Collect nodes to remove that have probabilities lower than the calculated threshold
            nodes_to_remove = [node for node in self.nodeProbSet if self.nodeProbSet[node] < calculatedProbMin]
            
            print("nodes_to_remove", nodes_to_remove)
            
            # Remove these nodes and track them in deletedKeys
            for node in nodes_to_remove:
                del self.nodeProbSet[node]
                self.nodes.pop(node, None)
                self.preview_nodes.pop(node, None)
                self.deletedKeys.append(node)
                
                # Remove node from all edges
                for edge, edge_nodes in self.edges.items():
                    if node in edge_nodes:
                        edge_nodes.remove(node)

            
                    
        print(self.preview_nodes)
                    
        self.positionNodes()
        

        return self.serializeGraph()


    def addNode(self, edge_start, isPreview, givenKey, probability):
        oldNode = self.nodes[edge_start]
        
        new_x = oldNode.x + 1
        new_y = oldNode.y

        # Create a new node at the calculated position
        newNode = Node(self.getAvailableKey() if isPreview else givenKey, 0, 0, givenKey, isPreview)
        
        # Add the new node to nodes and establish the edge
        self.nodes[newNode.id] = newNode
        self.nodeProbSet[newNode.id] = probability
        self.addEdge(edge_start, newNode.id)

        if isPreview:
            self.preview_nodes[newNode.id] = True
            
        self.actualKeySet[newNode.actualKey] = newNode.id
        return newNode.id

        

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
        while ("pvw_$A1b!zX9Id:" + str(key) in self.nodes):
            key += 1

        return "pvw_$A1b!zX9Id:" + str(key)

    def deserializeGraph(self, graph_json_str):
        graph = json.loads(graph_json_str)  # Convert JSON string to Python dict
        
        self.auto = graph.get('auto', False)
        
        m = graph.get('matrix', '')
        if m != '' and m in self.matrices:
            self.matrix = self.matrices[m]

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
            self.edges[node_id] = []
            
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
                        'node': self.nodes[edgeEnd].to_dict(),  # Convert Node to dict
                        'probability': self.nodeProbSet[edgeEnd]
                    })
    
        serialized_graph = {
            'dfg': {
                'returnNodes': returnNodes,
                'deletedKeys': self.deletedKeys
            },
            'PetriNet': json.loads(self.convert_to_petri_net())  # Convert string to dict
        }
        
        return json.dumps(serialized_graph)


