import pandas as pd
import math
import time


class MyCsv:
    def __init__(self):
        self.df = None
        self.PROBABILITY_MIN = 0.3  # Minimum probability threshold
        self.cached_prefixes = None
        self.probability_columns = None

    def to_dict(self):
        return {
            "df": self.df.to_dict(),  # type: ignore
            "cached_prefixes": self.cached_prefixes,
            "probability_columns": self.probability_columns,
        }

    @classmethod
    def from_dict(cls, data):
        matrix = cls()

        matrix.df = pd.DataFrame.from_dict(
            data["df"]
        )  # Convert dictionary back to DataFrame
        matrix.df = matrix.df.map(lambda x: tuple(x) if isinstance(x, list) else x)
        matrix.cached_prefixes = data["cached_prefixes"]
        matrix.probability_columns = data["probability_columns"]
        return matrix

    def getPrefixes(self):
        """
        Returns the cached unique prefixes if already computed.
        If not, it computes and caches the unique prefixes.
        """
        if self.cached_prefixes is None:
            self.cached_prefixes = list(self.df["prefixes"].unique())  # type: ignore
        return self.cached_prefixes

    def openCsv(self, name: str):
        """
        Loads the CSV file into a DataFrame and optimizes by caching necessary information.
        Ensures each prefix is unique by removing duplicate prefixes.
        Converts the 'prefixes' column from string representations to tuples.
        Also precomputes the columns used for predictions.
        """
        self.df = pd.read_csv(name, delimiter=";")

        # Trim column names to remove any leading/trailing spaces
        self.df.columns = self.df.columns.str.strip()

        # Convert 'prefixes' column from strings to tuples for efficient comparison
        self.df["prefixes"] = self.df["prefixes"].apply(lambda x: tuple(eval(x)))

        # Precompute and cache the probability columns for use in the predict method
        fixed_columns = {"prefixes", "targets", "Support"}
        self.probability_columns = [
            col for col in self.df.columns if col not in fixed_columns
        ]

    def predict(self, input_sequence: tuple, probMin: float = None):
        """
        Predicts possible next nodes based on the input sequence using cached probability columns.
        Filters predictions based on the minimum probability threshold.
        """
        if probMin is None:
            probMin = self.PROBABILITY_MIN

        # Vectorized comparison to filter rows with matching prefixes
        matching_rows = self.df[self.df["prefixes"] == input_sequence]

        if matching_rows.empty:
            return []  # Return an empty list if no matching prefixes found

        # Use only the first matching row
        first_row = matching_rows.iloc[0, :]

        # Vectorized filtering of predictions using cached probability columns
        valid_predictions = first_row[self.probability_columns][
            first_row[self.probability_columns] > probMin
        ]

        return valid_predictions.items()

    def replay_fitness(self, traces: list):
        """
        Calculate fitness of the given traces against the model stored in the DataFrame.

        Args:
            traces (list): List of event sequences (each sequence is a tuple).

        Returns:
            float: Fitness score between 0 and 1.
        """
        total_cost_inserted = 0
        total_cost_skipped = 0
        total_possible_insertions = 0

        # Cost functions for skipping and inserting activities
        cost_insert = 1
        cost_skip = 2

        prefixes = self.getPrefixes()

        # Process traces in a vectorized manner using DataFrame operations
        for trace in traces:
            if "[EOC]" in trace:
                continue

            # Vectorized check to find matching prefixes in the DataFrame
            matching_prefixes = self.df[self.df["prefixes"] == trace]

            if matching_prefixes.empty:
                # If no matching prefix, consider all activities as inserted
                total_cost_inserted += len(trace) * cost_insert
                total_possible_insertions += len(trace) * cost_insert
            else:
                # Assume first matching prefix (for performance reasons)
                matching_prefix = matching_prefixes.iloc[0]["prefixes"]

                # Calculate skipped activities (present in prefix but not in trace)
                skipped_activities = [
                    act for act in matching_prefix if act not in trace
                ]
                total_cost_skipped += len(skipped_activities) * cost_skip

                # Calculate inserted activities (present in trace but not in the model prefix)
                inserted_activities = [
                    act for act in trace if act not in matching_prefix
                ]
                total_cost_inserted += len(inserted_activities) * cost_insert

                # Update possible insertion costs
                total_possible_insertions += len(trace) * cost_insert

        # Fitness formula: 1 - (cost of skipped + inserted activities) / max possible insertion cost
        total_deviation_cost = total_cost_inserted + total_cost_skipped
        fitness = (
            1 - (total_deviation_cost / total_possible_insertions)
            if total_possible_insertions > 0
            else 1
        )

        return fitness

    def simplicity(self, traces: list, nodes_in_process_tree: int):
        """
        Measures the simplicity of the model based on the number of duplicate and missing activities.

        Args:
            traces (list): List of observed traces (each trace is a tuple).
            nodes_in_process_tree (int): The number of nodes in the process tree (provided as input).

        Returns:
            float: Simplicity score between 0 and 1.
        """
        traces = [trace for trace in traces if "[EOC]" not in trace]

        # Extract unique activities from the df
        unique_activities_in_log = set(
            act for prefix in self.df["prefixes"] for act in prefix
        )

        # Extract all activities in the traces
        unique_activities_in_tree = set(act for trace in traces for act in trace)

        # Duplicate activities: activities that appear more than once in the process tree
        activity_counts_in_tree = {}
        for trace in traces:
            for activity in trace:
                if activity in activity_counts_in_tree:
                    activity_counts_in_tree[activity] += 1
                else:
                    activity_counts_in_tree[activity] = 1

        duplicate_activities = sum(
            1 for count in activity_counts_in_tree.values() if count > 1
        )

        # Missing activities: activities in the tree that are not in the event log
        missing_activities = len(unique_activities_in_tree - unique_activities_in_log)

        # Event classes in the log: number of unique activities in the event log
        event_classes_in_log = len(unique_activities_in_log)

        # Simplicity formula: provided nodes_in_process_tree is used
        simplicity_score = 1 - (duplicate_activities + missing_activities) / (
            nodes_in_process_tree + event_classes_in_log
        )

        return simplicity_score

    def precision(self, traces: list, edges: dict, previewNodes: list):
        """
        Measures the precision of the model.

        Args:
            traces (list): List of observed traces (each trace is a tuple).
            edges (dict): The edges in the traces.

        Returns:
            float: Precision score between 0 and 1.
        """
        # Filter out traces with '[EOC]'
        traces = [trace for trace in traces if "[EOC]" not in trace]

        # Calculate the total visits of nodes (activities) in the traces
        visitsOfNode = {"starting_with_key:0": len(traces)}
        for trace in traces:
            for node in trace:
                visitsOfNode[node] = visitsOfNode.get(node, 0) + 1

        # Initialize the node sum to accumulate precision metrics per node
        nodeSum = 0

        # Create a dictionary to cache outgoing edges for each node
        outgoing_edges_cache = {}
        if self.df is not None:
            # Use vectorized operations to improve performance
            start_time = time.time()
            grouped = self.df.groupby("prefixes")["targets"].first().reset_index()
            for _, row in grouped.iterrows():
                prefix = row["prefixes"]
                target = row["targets"].strip()
                if len(prefix) > 0:
                    last_node = prefix[-1]
                    if last_node not in outgoing_edges_cache:
                        outgoing_edges_cache[last_node] = set()
                    outgoing_edges_cache[last_node].add(target)
                else:
                    if "starting_with_key:0" not in outgoing_edges_cache:
                        outgoing_edges_cache["starting_with_key:0"] = set()
                    outgoing_edges_cache["starting_with_key:0"].add(target)
            end_time = time.time()
            print(
                f"Time taken to cache outgoing edges: {end_time - start_time} seconds"
            )

        # Iterate over edges (keys of edges) to calculate precision per node
        for node in edges:
            if node in previewNodes or node == "[EOC]":  # Skip preview nodes
                continue

            # Get the cached outgoing edges for the current node
            outgoing_edges = outgoing_edges_cache.get(node, set())

            # Number of nodes not existing in the outgoing edges
            wrongEdges = sum(
                1
                for edge in edges[node]
                if edge not in outgoing_edges and edge not in previewNodes
            )

            # Number of missed edges
            missedEdges = (
                len(outgoing_edges)
                - len([edge for edge in edges[node] if edge not in previewNodes])
                + wrongEdges
            )

            # Calculate the precision of the current node
            nodeValue = (
                (missedEdges + wrongEdges) / len(outgoing_edges)
                if len(outgoing_edges) > 0
                else 1
            )

            # Update the node sum with the precision of the current node
            nodeSum += nodeValue * visitsOfNode.get(node, 1)

        # Return 1 if there are no visits; otherwise, calculate and return precision
        totalVisits = sum(visitsOfNode.values())
        if totalVisits == 0:
            return 1.0

        # Calculate final precision score, normalized by the total visits
        return 1 - nodeSum / totalVisits

    def generalization(self, traces, num_nodes_in_tree: int):
        """
        Measures the generalization of the model based on how often nodes in the tree are visited.

        Args:
            traces (list): List of observed sequences (i.e., traces from the event log).
            num_nodes_in_tree (int): The number of nodes in the process tree, provided as input.

        Returns:
            float: Generalization score between 0 and 1.
        """
        traces = [trace for trace in traces if "[EOC]" not in trace]

        if self.df is None:
            raise ValueError("DataFrame is not loaded. Please load the CSV first.")

        # Initialize visit count for each unique node (prefix)
        node_visits = pd.Series(0, index=self.df["prefixes"].apply(tuple).unique())

        # Convert traces to sets for faster subset checks
        trace_sets = [set(trace) for trace in traces]

        # Count the number of times each node (prefix) is visited in the traces
        for prefix in node_visits.index:
            prefix_set = set(prefix)
            node_visits[prefix] = sum(
                1 for trace_set in trace_sets if prefix_set.issubset(trace_set)
            )

        # Calculate the generalization score based on the provided formula
        if num_nodes_in_tree > 0:
            generalization_score = 1 - (
                sum(
                    1 / math.sqrt(visits) for visits in node_visits.values if visits > 0
                )
                / num_nodes_in_tree
            )
        else:
            generalization_score = (
                1  # If there are no nodes, generalization is perfect by default
            )

        return generalization_score

    def get_variant_coverage(self, edges: dict):
        """
        Calculate the variant coverage of the model based on the edges. For each variant, checks if a path through the model exists.

        Args:
            edges (dict): The edges in the traces.

        Returns:
            float: Variant coverage score between 0 and 1.
        """

        # Extract unique variants from the event log
        unique_variants = [variant["prefixes"] for variant in self.get_variants()]

        coverage_count = 0

        for variant in unique_variants:
            # Check if the variant is covered by the model
            covered = True
            for i in range(len(variant) - 1):
                if variant[i] not in edges or variant[i + 1] not in edges[variant[i]]:
                    covered = False
                    break

            if covered:
                coverage_count += 1

        # Calculate the variant coverage score
        variant_coverage = (
            coverage_count / len(unique_variants) if len(unique_variants) > 0 else 1
        )

        return variant_coverage

    def get_event_log_coverage(self, edges: dict):
        """
        Calculate the event log coverage of the model based on the edges. For each variant, checks if a path through the model exists.

        Args:
            edges (dict): The edges in the traces.

        Returns:
            float: Event log coverage score between 0 and 1.
        """
        prefixes = self.getPrefixes()

        coverage_count = 0

        for prefix in prefixes:
            # Check if the variant is covered by the model
            covered = True
            for i in range(len(prefix) - 1):
                if prefix[i] not in edges or prefix[i + 1] not in edges[prefix[i]]:
                    covered = False
                    break

            if covered:
                coverage_count += 1

        event_log_coverage = coverage_count / len(prefixes) if len(prefixes) > 0 else 1

        return event_log_coverage

    def get_variants(self):
        """
        Returns the unique variants in the event log where the target is [EOC] and their support.
        In this context, a variant is a prefix that ends with an end-of-case marker. (end-of-case marker is in targets)
        """
        if self.df is None:
            raise ValueError("DataFrame is not loaded. Please load the CSV first.")

        # Filter rows where the target is '[EOC]'
        eoc_rows = self.df[self.df["targets"].str.strip() == "[EOC]"]

        # Extract unique variants and their support
        variants = eoc_rows[["prefixes", "Support"]].copy()
        variants["prefixes"] = variants["prefixes"].apply(
            lambda x: tuple(eval(x)) if isinstance(x, str) else x
        )

        variants_dict = variants.to_dict(orient="records")

        return variants_dict
