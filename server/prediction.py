import math
from flask import json
import numpy as np
from matrices.openMatrix import MyCsv
import pm4py
from pm4py.objects.conversion.dfg.variants.to_petri_net_activity_defines_place import (
    apply as dfg_to_petri_net,
)
import graphviz

from collections import deque


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
            "id": self.id,
            "x": self.x,
            "y": self.y,
            "actualKey": self.actualKey,
            "isPreview": self.isPreview,
        }

    @classmethod
    def from_dict(cls, data):
        return cls(
            id=data.get("id"),
            x=data.get("x"),
            y=data.get("y"),
            actualKey=data.get("actualKey"),
            isPreview=data.get("isPreview"),
        )


class Prediction:
    def __init__(self, matrix) -> None:
        self.nodes: dict = {}
        self.preview_nodes: dict = {}
        self.edges: dict = {}

        self.actualKeySet: dict = {}

        self.posMatrix: dict = {}  # {(x, y): nodeId}
        self.deletedKeys: list = []

        self.matrix: MyCsv = matrix

        self.probMin: float = 0.3
        self.nodeProbDict: dict = {}
        self.auto: bool = False
        self.AUTO_PROB_MIN: float = 0.0

        self.fitness: float = 0.0
        self.simplicity: float = 0.0
        self.precision: float = 0.0
        self.generalization: float = 0.0
        self.variantCoverage: float = 0.0

        self.supportDict: dict = {}  # {nodeId: support} not serialized and deserialized

    def to_dict(self):
        # Serialize each node in nodes and preview_nodes using their to_dict method, if nodes are not empty
        nodes_dict = {node.id: node.to_dict() for node in self.nodes.values()}

        # Convert tuple keys in posMatrix to strings for JSON compatibility
        posMatrix_serialized = {
            f"{key[0]},{key[1]}": value for key, value in self.posMatrix.items()
        }

        return {
            "nodes": nodes_dict,
            "preview_nodes": self.preview_nodes,
            "edges": self.edges,
            "actualKeySet": self.actualKeySet,
            "posMatrix": posMatrix_serialized,
            "deletedKeys": self.deletedKeys,
            "probMin": self.probMin,
            "nodeProbDict": self.nodeProbDict,
            "auto": self.auto,
            "AUTO_PROB_MIN": self.AUTO_PROB_MIN,
            "fitness": self.fitness,
            "simplicity": self.simplicity,
            "precision": self.precision,
            "generalization": self.generalization,
        }
        

    @classmethod
    def from_dict(cls, data, matrix):
        # Initialize matrix from given matrix or from saved matrix
        prediction = cls(matrix)

        # Deserialize nodes dictionary if it exists and is not empty
        prediction.nodes = (
            {
                node_id: Node.from_dict(node_data)
                for node_id, node_data in data["nodes"].items()
            }
            if data.get("nodes")
            else {}
        )

        # Convert posMatrix keys from string back to tuples
        posMatrix_deserialized = {
            tuple(map(int, key.split(","))): value
            for key, value in data["posMatrix"].items()
        }

        # Continue with the remaining attributes
        prediction.preview_nodes = data["preview_nodes"]
        prediction.edges = data["edges"]
        prediction.actualKeySet = data["actualKeySet"]
        prediction.posMatrix = posMatrix_deserialized
        prediction.deletedKeys = data["deletedKeys"]
        prediction.probMin = data["probMin"]
        prediction.nodeProbDict = data["nodeProbDict"]
        prediction.auto = data["auto"]
        prediction.AUTO_PROB_MIN = data["AUTO_PROB_MIN"]
        prediction.fitness = data["fitness"]
        prediction.simplicity = data["simplicity"]
        prediction.precision = data["precision"]
        prediction.generalization = data["generalization"]

        return prediction

    def to_json(self):
        # Convert the Prediction object to JSON
        dictData = self.to_dict()
        return json.dumps(dictData)

    @staticmethod
    def from_json(json_data, matrix):
        # Deserialize JSON to a Prediction object
        data = json.loads(json_data)
        return Prediction.from_dict(data, matrix)

    def positionGraph(self):
        # Position the nodes in the graph

        gap_size_dict = {}
        visited_nodes = set()

        # recursive function to calculate all gap sizes
        def gap_size(node):
            visited_nodes.add(node)
            if (
                node not in self.edges
                or sum(
                    1
                    for edgeEnd in self.edges[node]
                    if edgeEnd not in self.preview_nodes
                )
                == 0
            ):
                gap_size_dict[node] = 1
                return 1

            gap_size_dict[node] = sum(
                [
                    gap_size(edgeEnd) if edgeEnd not in visited_nodes else 1
                    for edgeEnd in self.edges[node]
                    if edgeEnd not in self.preview_nodes
                ]
            )
            return gap_size_dict[node]

        gap_size("starting_with_key:0")

        # store only position of the starting node
        x = self.nodes["starting_with_key:0"].x
        y = self.nodes["starting_with_key:0"].y

        self.posMatrix = {(x, y): "starting_with_key:0"}

        # Use a queue for BFS
        queue = deque(["starting_with_key:0"])
        positioned_nodes = set()

        while queue:
            node = queue.popleft()

            # Check if the node has already been positioned
            if node in self.preview_nodes:
                continue

            # Specify the gap already filled for this node
            gap_filled = 0
            gap_size_this = gap_size_dict[node]

            gap_start = self.nodes[node].y - gap_size_this // 2

            # Position all the successor nodes of the node
            for edgeEnd in self.edges[node]:
                if edgeEnd in self.preview_nodes or edgeEnd in positioned_nodes:
                    continue

                positioned_nodes.add(edgeEnd)

                print(f"Node: {node}, EdgeEnd: {edgeEnd}")

                # Get the gap size of the successor node
                gap_size_succ = gap_size_dict[edgeEnd]

                y_pos = gap_start + gap_filled + gap_size_succ // 2

                self.nodes[edgeEnd].x = self.nodes[node].x + (
                    1
                    if sum(
                        1
                        for edgeEnd in self.edges[node]
                        if edgeEnd not in self.preview_nodes
                    )
                    < 3
                    else 3
                )
                self.nodes[edgeEnd].y = y_pos
                self.posMatrix[(self.nodes[edgeEnd].x, self.nodes[edgeEnd].y)] = edgeEnd
                gap_filled += gap_size_succ

                queue.append(edgeEnd)

        self.positionNodes()
        
    def getPm4pyMetrics(self, log):
        import concurrent.futures

        # Initialize metrics to default values
        metrics = {
            "fitness": -1.,
            "simplicity": -1.,
            "precision": -1.,
            "generalization": -1.,
        }

        # Check if the Petri net is empty
        if len(self.edges) < 1:
            metrics.update({"fitness": 0., "simplicity": 0., "precision": 0., "generalization": 0.})
            return json.dumps(metrics)

        if log is not None and len(self.edges) > 0:
            # Define a DFG (Directly Follows Graph) from nodes and edges
            dfg = {}
            for edgeStart in self.edges:
                for edgeEnd in self.edges[edgeStart]:
                    # Check if edgeEnd is a preview node
                    if edgeEnd in self.preview_nodes:
                        continue

                    # If edgeStart or edgeEnd are starting_with_key:0 or [EOC], skip them
                    if edgeStart == "starting_with_key:0" or edgeEnd == "[EOC]":
                        continue

                    # Flatten the nested dictionary structure
                    dfg[(edgeStart, edgeEnd)] = dfg.get((edgeStart, edgeEnd), 0) + 1

            # Define start and end activities
            start_activities = {edge for edge in self.edges["starting_with_key:0"]}
            end_activities = {
                edge for edge in self.edges if len(self.edges[edge]) == 0 or "[EOC]" in self.edges[edge]
            }

            # Convert DFG to Petri net with parameters
            parameters = {"start_activities": start_activities, "end_activities": end_activities}

            try:
                net, initial_marking, final_marking = dfg_to_petri_net(dfg, parameters=parameters)
            except Exception as e:
                raise ValueError(f"Error converting DFG to Petri Net: {e}")

            try:
                # Calculate the metrics concurrently
                with concurrent.futures.ThreadPoolExecutor() as executor:
                    future_fitness = executor.submit(
                        pm4py.algo.evaluation.replay_fitness.algorithm.apply,
                        log, net, initial_marking, final_marking, None,
                        pm4py.algo.evaluation.replay_fitness.algorithm.Variants.TOKEN_BASED
                    )
                    future_simplicity = executor.submit(
                        pm4py.algo.evaluation.simplicity.variants.arc_degree.apply, net
                    )
                    future_precision = executor.submit(
                        pm4py.algo.evaluation.precision.algorithm.apply,
                        log, net, initial_marking, final_marking, None,
                        pm4py.algo.evaluation.precision.algorithm.Variants.ETCONFORMANCE_TOKEN
                    )
                    future_generalization = executor.submit(
                        pm4py.algo.evaluation.generalization.variants.token_based.apply,
                        log, net, initial_marking, final_marking
                    )

                    metrics["fitness"] = future_fitness.result()["log_fitness"]
                    metrics["simplicity"] = future_simplicity.result()
                    metrics["precision"] = future_precision.result()
                    metrics["generalization"] = future_generalization.result()
            except Exception as e:
                raise ValueError(f"Error calculating metrics: {e}")

        return json.dumps(metrics)

    def getMetrics(self):

        serializedMetrics = {}
        event_log_coverage = self.matrix.get_event_log_coverage(self.edges)

        self.getVariants()

        serializedMetrics["variant_coverage"] = self.variantCoverage
        serializedMetrics["event_log_coverage"] = event_log_coverage

        return json.dumps(serializedMetrics)

    def getVariants(self):
        (variants, self.variantCoverage) = self.matrix.get_variant_coverage(self.edges)

        # return the variants and the discovered variants
        return json.dumps({"variants": variants, "sequences": self.getAllSequences()})

    def positionNodes(self):
        def check_if_gap(starting_pos, numNodes):
            starting_pos = (starting_pos[0], starting_pos[1] - 1)
            for i in range(numNodes + 2):
                if (starting_pos[0], starting_pos[1] + i) in self.posMatrix:
                    return False
            return True

        def position_batch(starting_pos, nodes):
            # sort the nodes by the probability of the node
            nodes.sort(key=lambda node: self.nodeProbDict[node], reverse=True)

            for node in nodes_to_position:
                self.nodes[node].x = starting_pos[0]
                self.nodes[node].y = starting_pos[1]
                self.posMatrix[starting_pos] = node
                starting_pos = (starting_pos[0], starting_pos[1] + 1)

        for edge_start in self.edges:
            nodes_to_position = [
                node for node in self.edges[edge_start] if node in self.preview_nodes
            ]

            if len(nodes_to_position) == 0:
                continue

            # get the number of nodes to position in this batch
            numNodes = len(nodes_to_position)

            # get the starting position of the batch
            # first we try the default position with the batch centered on the right to the node
            starting_pos = (
                self.nodes[edge_start].x + 1,
                round(self.nodes[edge_start].y - numNodes / 2)
                if numNodes > 2
                else self.nodes[edge_start].y,
            )

            normal_pos = starting_pos

            # While no gap was found, we try to find a position that works
            while True:
                if check_if_gap(starting_pos, numNodes):
                    position_batch(starting_pos, nodes_to_position)
                    break

                found = False
                # the default position did not work, so we check for positions above and below
                for i in range(1, round(math.sqrt(len(self.nodes)) + 10)):
                    # check below
                    if check_if_gap((starting_pos[0], starting_pos[1] + i), numNodes):
                        starting_pos = (starting_pos[0], starting_pos[1] + i)
                        position_batch(starting_pos, nodes_to_position)
                        found = True
                        break

                    # check above
                    if check_if_gap((starting_pos[0], starting_pos[1] - i), numNodes):
                        starting_pos = (starting_pos[0], starting_pos[1] - i)
                        position_batch(starting_pos, nodes_to_position)
                        found = True
                        break

                if found:
                    break

                # if no position was found, we increase the x position of the batch
                normal_pos = (normal_pos[0] + 1, normal_pos[1])
                starting_pos = normal_pos
                
    def get_petri_net(self):
        if len(self.edges) - len(self.preview_nodes) <= 1:
            return json.dumps({})
        # Define a DFG (Directly Follows Graph) from nodes and edges
        dfg = {}
        for edgeStart in self.edges:
            for edgeEnd in self.edges[edgeStart]:
                # Check if edgeEnd is a preview node
                if edgeEnd in self.preview_nodes:
                    continue

                # If edgeStart or edgeEnd are starting_with_key:0 or [EOC], skip them
                if edgeStart == "starting_with_key:0" or edgeEnd == "[EOC]":
                    continue

                # Flatten the nested dictionary structure
                dfg[(edgeStart, edgeEnd)] = dfg.get((edgeStart, edgeEnd), 0) + 1

        # Define start and end activities
        start_activities = {edge for edge in self.edges["starting_with_key:0"]}
        end_activities = {
            edge
            for edge in self.edges
            if len(self.edges[edge]) == 0 or "[EOC]" in self.edges[edge]
        }

        # Convert DFG to Petri net with parameters
        parameters = {
            "start_activities": start_activities,
            "end_activities": end_activities,
        }

        try:
            net, initial_marking, final_marking = dfg_to_petri_net(
                dfg, parameters=parameters
            )
        except Exception as e:
            raise ValueError(f"Error converting DFG to Petri Net: {e}")

        # Extract places, transitions, and arcs from the Petri net
        places = [place.name for place in net.places]
        transitions = [trans.name for trans in net.transitions]
        arcs = [(arc.source.name, arc.target.name) for arc in net.arcs]
        
        
        # Position the nodes in the graph

        gap_size_dict = {}
        visited_nodes = set()
        nodes = places + transitions
        
        edges = {}
        for arc in arcs:
            if arc[0] not in edges:
                edges[arc[0]] = []
            edges[arc[0]].append(arc[1])
            if arc[1] in nodes:
                nodes.remove(arc[1])
                
        posDict = {}
        invertPosDict = {}
        x = 2
        y = 3
        for node in nodes:
            posDict[(x, y)] = node
            invertPosDict[node] = (x, y)
            y+=1   
            
        for node in places + transitions:
            if node not in edges:
                edges[node] = []

        # recursive function to calculate all gap sizes
        def gap_size(node):
            visited_nodes.add(node)
            if (
                node not in edges
            ):
                gap_size_dict[node] = 1
                return 1

            gap_size_dict[node] = sum(
                [
                    gap_size(edgeEnd) if edgeEnd not in visited_nodes else 1
                    for edgeEnd in edges[node]
                ]
            )
            return gap_size_dict[node]

        size = 0
        for im in nodes:
            posDict[(x, y + size)] = posDict.pop(invertPosDict[im])
            invertPosDict[im] = (invertPosDict[im][0], invertPosDict[im][1] + size)
            size = gap_size(im)

        # Use a queue for BFS
        queue = deque(nodes)
        positioned_nodes = set()

        while queue:
            node = queue.popleft()

            # Specify the gap already filled for this node
            gap_filled = 0
            gap_size_this = gap_size_dict[node]

            gap_start = invertPosDict[node][1] - gap_size_this // 2

            # Position all the successor nodes of the node
            for edgeEnd in edges[node]:
                if edgeEnd in positioned_nodes:
                    continue

                positioned_nodes.add(edgeEnd)

                print(f"Node: {node}, EdgeEnd: {edgeEnd}")

                # Get the gap size of the successor node
                gap_size_succ = gap_size_dict[edgeEnd]

                y_pos = gap_start + gap_filled + gap_size_succ // 2

                invertPosDict[edgeEnd] = (invertPosDict[node][0] + 1, y_pos)
                posDict[invertPosDict[edgeEnd]] = edgeEnd
                gap_filled += gap_size_succ

                queue.append(edgeEnd)
            
        print(posDict)
                
        petriNetDict = {
            "places": [{"id": place, "x": invertPosDict[place][0], "y": invertPosDict[place][1]} for place in places],
            "transitions": [{"id": trans, "x": invertPosDict[trans][0], "y": invertPosDict[trans][1], "label": trans} for trans in transitions],
            "arcs": [{"source": arc[0], "target": arc[1]} for arc in arcs]
        }
        
        return json.dumps(petriNetDict)
        
        
    def convert_to_petri_net(self):
        # Define a DFG (Directly Follows Graph) from nodes and edges
        dfg = {}
        for edgeStart in self.edges:
            for edgeEnd in self.edges[edgeStart]:
                # Check if edgeEnd is a preview node
                if edgeEnd in self.preview_nodes:
                    continue

                # If edgeStart or edgeEnd are starting_with_key:0 or [EOC], skip them
                if edgeStart == "starting_with_key:0" or edgeEnd == "[EOC]":
                    continue

                # Flatten the nested dictionary structure
                dfg[(edgeStart, edgeEnd)] = dfg.get((edgeStart, edgeEnd), 0) + 1

        # Define start and end activities
        start_activities = {edge for edge in self.edges["starting_with_key:0"]}
        end_activities = {
            edge
            for edge in self.edges
            if len(self.edges[edge]) == 0 or "[EOC]" in self.edges[edge]
        }

        # Convert DFG to Petri net with parameters
        parameters = {
            "start_activities": start_activities,
            "end_activities": end_activities,
        }

        try:
            net, initial_marking, final_marking = dfg_to_petri_net(
                dfg, parameters=parameters
            )
        except Exception as e:
            raise ValueError(f"Error converting DFG to Petri Net: {e}")

        # Extract places, transitions, and arcs from the Petri net
        places = [place.name for place in net.places]
        transitions = [trans.name for trans in net.transitions]
        arcs = [(arc.source.name, arc.target.name) for arc in net.arcs]

        # Convert to graphviz Digraph
        dot = graphviz.Digraph(engine="dot")
        dot.attr(rankdir="LR", nodesep="0.8", ranksep="1.2")

        # Places
        for place in places:
            if place == "source":
                dot.node(
                    place,
                    shape="circle",
                    width="1",
                    height="1",
                    style="filled",
                    fillcolor="lightblue",
                    pos="0,0!",
                )
            elif place == "sink":
                dot.node(
                    place,
                    shape="circle",
                    width="1",
                    height="1",
                    style="filled",
                    fillcolor="lightgreen",
                    pos="10,0!",
                )
            else:
                dot.node(
                    place,
                    shape="circle",
                    width="1",
                    height="1",
                    style="filled",
                    fillcolor="lightgray",
                )

        # Transitions
        for transition in transitions:
            dot.node(
                transition,
                shape="rect",
                width="1",
                height="1",
                style="filled",
                fillcolor="lightgray",
                label="",
            )

        # Arcs
        for arc in arcs:
            dot.edge(arc[0], arc[1], arrowhead="vee", arrowsize="0.8")

        # Render the graph to a file
        import os

        output_path = os.path.join(os.path.dirname(__file__), "static", "petri_net")
        dot.render(output_path, format="jpg", cleanup=True)

        # Return the path to the rendered image relative to the static folder
        return os.path.join("static", "petri_net.jpg")

    def getPredictions(self, graph):
        # Deserialize the graph and get all the traces
        self.deserializeGraph(graph)

        numNodes = len(self.nodes)

        self.preview_nodes = {}

        # Calculate the maximal Number of nodes that should be added (for auto mode)
        numNodesToAdd = round(2 * (np.log(numNodes) * np.log(numNodes)) + 3)

        predictions = self.matrix.predict_using_edges(
            self.edges, self.probMin if not self.auto else self.AUTO_PROB_MIN
        )

        for prediction in predictions:
            (node, lastNodeId) = prediction
            probability = predictions[prediction]["probability"]
            support = predictions[prediction]["support"]

            # Check if the edge to the node from lastNodeId exists, we do not add anything
            if lastNodeId in self.edges and node in self.edges[lastNodeId]:
                continue

            # Check if a preview node with the actual key already exists
            existsKey = False

            # Check if this node already exists with edge from lastNode
            if lastNodeId in self.edges:
                for edgeEnd in self.edges[lastNodeId]:
                    if node == self.nodes[edgeEnd].actualKey:
                        existsKey = True
                        break

            # If the predicted node exists, update the probability if it is higher
            if existsKey:
                if self.nodeProbDict[self.actualKeySet[node]] < probability:
                    self.nodeProbDict[self.actualKeySet[node]] = probability
                continue

            # We add the node with edge from lastNode
            if lastNodeId in self.nodes:
                self.addNode(lastNodeId, True, node, probability, support)

        if self.auto:
            # Ensure that no more than three preview nodes are connected to the same edge
            for edge, edge_nodes in self.edges.items():
                numPreview = sum(
                    1 for edgeEnd in edge_nodes if edgeEnd in self.preview_nodes
                )

                # If more than three preview nodes, delete the ones with the smallest probability
                while numPreview > 3:
                    # Find the node with the smallest probability on this edge
                    smallestEdge = min(
                        (
                            edgeEnd
                            for edgeEnd in edge_nodes
                            if edgeEnd in self.preview_nodes
                        ),
                        key=lambda edgeEnd: self.supportDict[edgeEnd],
                        default=None,
                    )

                    if smallestEdge is None:
                        break

                    del self.nodeProbDict[smallestEdge]
                    self.nodes.pop(smallestEdge, None)
                    self.preview_nodes.pop(smallestEdge, None)
                    self.supportDict.pop(smallestEdge, None)
                    self.deletedKeys.append(smallestEdge)

                    # Remove smallestEdge from all edges
                    for edge_, edge_nodes_ in self.edges.items():
                        if smallestEdge in edge_nodes_:
                            edge_nodes_.remove(smallestEdge)

                    # Decrease the preview count for the current edge
                    numPreview -= 1

            # If the number of preview nodes exceeds the allowed number
            if len(self.preview_nodes) > numNodesToAdd:
                # Find the minimum support needed to keep `numNodesToAdd` nodes
                calculatedSupportMin = sorted(self.supportDict.values(), reverse=True)[
                    numNodesToAdd
                ]

                # Collect nodes to remove that have probabilities lower than the calculated threshold
                nodes_to_remove = [
                    node
                    for node in self.supportDict
                    if self.supportDict[node] < calculatedSupportMin
                ]

                # Remove these nodes and track them in deletedKeys
                for node in nodes_to_remove:
                    del self.nodeProbDict[node]
                    self.nodes.pop(node, None)
                    self.preview_nodes.pop(node, None)
                    self.supportDict.pop(node, None)
                    self.deletedKeys.append(node)

                    # Remove node from all edges
                    for edge, edge_nodes in self.edges.items():
                        if node in edge_nodes:
                            edge_nodes.remove(node)

        self.positionNodes()

        return self.serializeGraph()

    def addNode(self, edge_start, isPreview, givenKey, probability, support):
        if givenKey in self.deletedKeys:
            self.deletedKeys.remove(givenKey)

        # Create a new node at the calculated position
        newNode = Node(
            self.getAvailableKey() if isPreview else givenKey, 0, 0, givenKey, isPreview
        )

        # Add the new node to nodes and establish the edge
        self.nodes[newNode.id] = newNode
        self.nodeProbDict[newNode.id] = probability
        self.addEdge(edge_start, newNode.id)

        if isPreview:
            self.preview_nodes[newNode.id] = True

        self.actualKeySet[newNode.actualKey] = newNode.id
        self.supportDict[newNode.id] = support
        return newNode.id

    def addEdge(self, start, end):
        if start in self.edges:
            self.edges[start].append(end)
        else:
            self.edges[start] = [end]

    def getAllSequences(self):
        # Recursive function to build sequences
        def recBuildSeq(seq, curr, visited):
            # Check if the current node has been visited to prevent loops and check if it is a preview node
            if curr in visited or curr in self.preview_nodes:
                return []

            # Mark the current node as visited
            visited.add(curr)

            sequences = []

            # Add the current sequence so far (partial sequence)
            if seq:
                sequences.append(seq)

            # If there are no outgoing edges, finalize the current sequence and return
            if curr not in self.edges or not self.edges[curr]:
                return sequences

            # Iterate over outgoing edges
            for end in self.edges[curr]:
                # Recursively build sequences from the next node
                newSequences = recBuildSeq(
                    seq + (self.nodes[end].id,),  # Update the sequence tuple
                    end,  # Move to the next node
                    visited.copy(),  # Pass a copy of the visited set
                )

                # Append the new sequences
                sequences.extend(newSequences)

            return sequences

        # Start the recursion from node "starting_with_key:0" with an empty sequence
        sequences = recBuildSeq((), "starting_with_key:0", set())

        # Ensure that the empty sequence () is included
        sequences.insert(0, ())

        return sequences

    def getAvailableKey(self):
        # get the smallest key from the deleted keys list if possible
        if self.deletedKeys:  # check if list is empty
            return self.deletedKeys.pop()

        # otherwise return the current number of nodes as a key
        key = len(self.nodes)
        while "pvw_$A1b!zX9Id:" + str(hash(key)) in self.nodes:
            key += 1

        return "pvw_$A1b!zX9Id:" + str(hash(key))

    def deserializeGraph(self, graph_json_str):
        graph = json.loads(graph_json_str)  # Convert JSON string to Python dict

        # delete existing info
        self.nodes = {}
        self.edges = {}
        self.deletedKeys = []
        self.actualKeySet = {}
        self.posMatrix = {}

        self.auto = graph.get("auto", False)

        nodes = graph.get("nodes", [])
        edges = graph.get("edges", [])
        self.deletedKeys = graph.get("deletedKeys", [])

        self.probMin = graph.get("probability", 0.3)

        # add nodes
        for node in nodes:
            node_id = node.get("id")
            x = node.get("x")
            y = node.get("y")
            actualKey = node.get("actualKey")
            isPreview = node.get(
                "isPreview", False
            )  # Set default value to False if not provided

            n = Node(
                node_id, x, y, actualKey, isPreview
            )  # Now passing isPreview as well
            self.nodes[node_id] = n
            self.posMatrix[(x, y)] = node_id
            self.edges[node_id] = []

            self.actualKeySet[actualKey] = node_id

        # add edges
        for edge in edges:
            start_node = edge[0]
            end_node = edge[1]

            self.addEdge(start_node, end_node)

    def serializeNodePositions(self):
        nodePos = {}
        for node in self.nodes:
            nodePos[node] = (self.nodes[node].x, self.nodes[node].y)
        return json.dumps(nodePos)

    def serializeGraph(self):
        returnNodes = {}
        for edgeStart in self.edges:
            for edgeEnd in self.edges[edgeStart]:
                if edgeEnd in self.preview_nodes:
                    # Correctly convert the Node object to a dict before appending
                    returnNodes[edgeEnd] = {
                        "nodeId": edgeEnd,
                        "edgeStart": edgeStart,
                        "node": self.nodes[edgeEnd].to_dict(),  # Convert Node to dict
                        "probability": self.nodeProbDict[edgeEnd],
                        "support": self.supportDict[edgeEnd],
                    }

        serialized_graph = {
            "dfg": {
                "returnNodes": returnNodes,
                "deletedKeys": self.deletedKeys,
                "sub_trace_coverage": self.matrix.sub_trace_coverage(),
            },
            "petri_net": self.get_petri_net(),
        }

        return json.dumps(serialized_graph)
