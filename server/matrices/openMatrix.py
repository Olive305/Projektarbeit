import pandas as pd
import math
import time


class MyCsv:
    def __init__(self):
        self.df = pd.DataFrame()
        self.PROBABILITY_MIN = 0.3  # Minimum probability threshold
        self.cached_prefixes = None
        self.probability_columns = None

        self.outgoing_edges_cache: dict = {}
        self.support_cache: dict = {}

    def to_dict(self):
        return {
            "df": self.df.to_dict(),  # type: ignore
            "support_cache": self.support_cache,
            "probability_columns": self.probability_columns,
            "outgoing_edges_cache": self.outgoing_edges_cache,
            "cached_prefixes": self.cached_prefixes,
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
        matrix.outgoing_edges_cache = data["outgoing_edges_cache"]
        matrix.cached_prefixes = data["cached_prefixes"]
        return matrix

    def getPrefixes(self):
        """
        Returns the cached unique prefixes if already computed.
        If not, it computes and caches the unique prefixes.
        """
        if self.cached_prefixes is None and self.df is not None:
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

        # Create a dictionary to cache outgoing edges and support for each node
        self.outgoing_edges_cache = {}
        self.support_cache = {}
        if self.df is not None:
            # Use vectorized operations to improve performance
            start_time = time.time()
            grouped = (
                self.df.groupby("prefixes")
                .agg({"targets": "first", "Support": "sum"})
                .reset_index()
            )
            for _, row in grouped.iterrows():
                prefix = row["prefixes"]
                target = row["targets"].strip()
                support = int(row["Support"])
                if len(prefix) > 0:
                    last_node = prefix[-1]
                    if last_node not in self.outgoing_edges_cache:
                        self.outgoing_edges_cache[last_node] = []
                    self.outgoing_edges_cache[last_node].append(target)
                    # Cache the support for the edge
                    if target not in self.support_cache:
                        self.support_cache[target] = 0
                    self.support_cache[target] += support
                else:
                    if "starting_with_key:0" not in self.outgoing_edges_cache:
                        self.outgoing_edges_cache["starting_with_key:0"] = []
                    self.outgoing_edges_cache["starting_with_key:0"].append(target)
            end_time = time.time()
            print(
                f"Time taken to cache outgoing edges: {end_time - start_time} seconds"
            )

    def predict_using_edges(self, edges: dict, probMin: float = 0):
        """
        Predicts the possible predictions by iterating over all the prefixes and checking if the path is possible in the edges

        Args:
            edges (dict): edges of the discovered process graph
            probMin (float, optional): Minimum probability threshold. Defaults to None.

        Returns:
            valid_predictions (dict): Dictionary of valid predictions with their support and probability
        """

        prefixes = self.getPrefixes()

        predictions = {}

        # Cache for prefix coverage status
        prefix_coverage_cache = {}

        for prefix in prefixes or []:
            # Check if the prefix is covered by the model
            if prefix in prefix_coverage_cache:
                covered = prefix_coverage_cache[prefix]
            else:
                covered = True
                for i in range(len(prefix) - 1):
                    if prefix[i] not in edges or prefix[i + 1] not in edges[prefix[i]]:
                        covered = False
                        break
                prefix_coverage_cache[prefix] = covered

            # If it is covered, we get the predictions
            if covered:
                # Vectorized comparison to filter rows with matching prefixes
                matching_rows = self.df[self.df["prefixes"] == prefix]

                if matching_rows.empty:
                    continue

                # Iterate over the targets and update the count
                for _, row in matching_rows.iterrows():
                    target = row["targets"].strip()
                    key = (
                        target,
                        prefix[-1] if len(prefix) > 0 else "starting_with_key:0",
                    )
                    if key not in predictions:
                        predictions[key] = {"support": 0, "probability": 0}
                    predictions[key]["support"] += row["Support"]
                    predictions[key]["probability"] += row[target] * row["Support"]

        # Normalize the probabilities
        for prediction in predictions:
            predictions[prediction]["probability"] /= predictions[prediction]["support"]

        # Filter predictions based on the minimum probability threshold
        valid_predictions = {
            prediction: predictions[prediction]
            for prediction in predictions
            if predictions[prediction]["probability"] >= probMin
        }

        # Return the valid predictions
        return valid_predictions

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
            act for prefix in self.df["prefixes"] for act in prefix if self.df is not None
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

    def precision(self, edges: dict, previewNodes: list):
        """
        Measures the precision of the model.

        Args:
            edges (dict): The edges in the traces.
            previewNodes (list): List of preview nodes to be excluded from the precision calculation.

        Returns:
            float: Precision score between 0 and 1.
        """

        # Initialize the node sum to accumulate precision metrics per node
        nodeSum = 0

        # Iterate over edges (keys of edges) to calculate precision per node
        for node in edges:
            if node in previewNodes or node == "[EOC]":  # Skip preview nodes
                continue

            # Get the cached outgoing edges and the support for the current node
            outgoing_edges = self.outgoing_edges_cache.get(node, [])
            support = self.support_cache.get(node, 0)

            # Number of missed edges
            missedEdges = sum([1 for edge in outgoing_edges if edge not in edges[node]])

            # Calculate the precision of the current node
            nodeValue = (
                missedEdges / len(outgoing_edges) if len(outgoing_edges) > 0 else 1
            )

            # Update the node sum with the precision of the current node
            nodeSum += nodeValue * support

        # Calculate final precision score, normalized by the total visits
        return 1 - nodeSum / sum(self.support_cache.values())

    def generalization(self, nodes, num_nodes_in_tree: int):
        """
        Measures the generalization of the model based on how often nodes in the tree are visited.

        Args:
            traces (list): List of observed sequences (i.e., traces from the event log).
            num_nodes_in_tree (int): The number of nodes in the process tree, provided as input.

        Returns:
            float: Generalization score between 0 and 1.
        """

        node_value = 0

        for node in nodes:
            if nodes[node].isPreview or node == "starting_with_key:0":
                continue
            # get all the rows where the current node is a target and from there get the support
            total_executions = 0
            if self.df is not None:
                # Filter rows where the current node is the target
                node_rows = self.df[self.df["targets"].str.strip() == node]
                # Sum the support values of these rows
                total_executions = node_rows["Support"].sum()

            # the node value is 1 divided through the square root of the total execution
            node_value += (
                (1 / (math.sqrt(total_executions))) if total_executions != 0 else 0
            )

        return 1 - node_value / (num_nodes_in_tree - 1)

    def get_variant_coverage(self, edges: dict):
        """
        Calculate the variant coverage of the model based on the edges. For each variant, checks if a path through the model exists.

        Args:
            edges (dict): The edges in the traces.

        Returns:
            float: Variant coverage score between 0 and 1.
        """

        # Extract unique variants from the event log
        unique_variants = self.get_variants()
        variant_list = []

        coverage_count = 0

        if unique_variants is None:
            return {}, 0

        for variant in unique_variants:
            if len(variant) < 1:
                continue
            # Check if the variant is covered by the model
            covered = True
            for i in range(len(variant["prefixes"]) - 1):
                if (
                    variant["prefixes"][i] not in edges
                    or variant["prefixes"][i + 1] not in edges[variant["prefixes"][i]]
                ):
                    covered = False
                    break

            if (
                covered
                and variant["prefixes"][-1] in edges
                and "[EOC]" in edges[variant["prefixes"][-1]]
            ):
                coverage_count += 1
                variant_list.append(
                    {
                        "variant": variant["prefixes"],
                        "covered": True,
                        "support": variant["Support"],
                    }
                )
            else:
                variant_list.append(
                    {
                        "variant": variant["prefixes"],
                        "covered": False,
                        "support": variant["Support"],
                    }
                )

        # Calculate the variant coverage score
        variant_coverage = (
            coverage_count / len(unique_variants) if len(unique_variants) > 0 else 1
        )

        return (variant_list, variant_coverage)

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

        event_log_coverage = (
            coverage_count / len(prefixes) if prefixes and len(prefixes) > 0 else 1
        )

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

    def sub_trace_coverage(self):
        """
        Calculate the sub-trace coverage of the model based on the edges. For each sub-trace, checks if a path through the model exists.

        Args:
            None

        Returns:
            dict: Sub-trace coverage score for each node.
        """
        variants = self.get_variants()
        sub_trace_coverage = {}

        for variant in variants:
            for activity in variant:
                if activity not in sub_trace_coverage:
                    sub_trace_coverage[activity] = 1
                else:
                    sub_trace_coverage[activity] += 1

        for activity in sub_trace_coverage:
            sub_trace_coverage[activity] = sub_trace_coverage[activity] / len(variants)

        return sub_trace_coverage
