from flask import json
from matrices.openMatrix import MyCsv

class Node:
    def __init__(self, id, x, y, actualKey, isPreview) -> None:
        self.id = id
        self.x = x
        self.y = y
        self.actualKey = actualKey
        self.isPreview = isPreview
        
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


    def getPredictions(self, graph):
        # graph is the list of nodes and edges. preview nodes will be added by this code
        self.deserializeGraph(graph)
        print("actual", self.actualKeySet)

        [sequences, keySeq] = self.getAllSequences()
        i = 0

        for sequence in sequences:
            predictions = self.matrix.predict(sequence)
            print("seq", sequence, sequences)

            for [node, probability] in predictions:
                lastNodeId = "0" if len(keySeq[i]) == 0 else keySeq[i][len(keySeq[i]) - 1]
                print("pred", node, "lastNode", lastNodeId)

                # if the edge to the node from lastNodeId exist, we do not add anything
                if (lastNodeId in self.edges and node in self.edges[lastNodeId]):
                    print("1")
                    continue
                
                # if the node exists, but there is no edge to it from lastNode, we add it
                if (node in self.nodes):
                    print("2")
                    self.addNode(lastNodeId, True, node)
                    continue
                
                # we add the node with edge from lastNode
                if (lastNodeId in self.nodes):
                    print("3")
                    self.addNode(lastNodeId, True, node)

            i += 1

        return self.serializeGraph()


    def addNode(self, edge_start, isPreview, givenKey):
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

    def removeNode(self, key):
        del self.edges[key]

    def removeEdge(self, start, end):
        if (not start in self.edges):
            return
        
        self.edges[start].remove(end)

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

        nodes = graph.get('nodes', [])
        edges = graph.get('edges', [])
        self.deletedKeys = graph.get('deletedKeys', [])

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
    
        return json.dumps({
            'returnNodes': returnNodes,
            'deletedKeys': self.deletedKeys
        })


