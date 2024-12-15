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
        self.supportMax = 1

    def to_dict(self):
        return {
            "df": self.df.to_dict(),  # type: ignore
            "support_cache": self.support_cache,
            "probability_columns": self.probability_columns,
            "outgoing_edges_cache": self.outgoing_edges_cache,
            "cached_prefixes": self.cached_prefixes,
            "supportMax": self.supportMax,
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
        matrix.supportMax = data["supportMax"]
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
            
            # Cache the maximum support value for normalization
            self.supportMax = max(self.support_cache.values())

    def predict_using_edges(self, edges: dict, probMin: float = 0, supportMin: int = 1):
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
        # Since we are summing the probabilities, we need to divide by the support to get the average probability (multiple prefixes leading to the same prediction)
        for prediction in predictions:
            predictions[prediction]["probability"] /= predictions[prediction]["support"]

        # Filter predictions based on the minimum probability threshold
        valid_predictions = {
            prediction: predictions[prediction]
            for prediction in predictions
            if predictions[prediction]["probability"] >= probMin and predictions[prediction]["support"] >= supportMin
        }

        # Return the valid predictions
        return valid_predictions

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