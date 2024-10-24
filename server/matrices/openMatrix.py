import pandas as pd

class MyCsv:
    def __init__(self):
        self.df = None
        self.PROBABILITY_MIN = 0.3  # Minimum probability threshold
        self.cached_prefixes = None
        self.probability_columns = None

    def getPrefixes(self):
        """
        Returns the cached unique prefixes if already computed.
        If not, it computes and caches the unique prefixes.
        """
        if self.cached_prefixes is None:
            self.cached_prefixes = list(self.df['prefixes'].unique())
        return self.cached_prefixes

    def openCsv(self, name: str):
        """
        Loads the CSV file into a DataFrame and optimizes by caching necessary information.
        Ensures each prefix is unique by removing duplicate prefixes.
        Converts the 'prefixes' column from string representations to tuples.
        Also precomputes the columns used for predictions.
        """
        self.df = pd.read_csv(name, delimiter=';')

        # Trim column names to remove any leading/trailing spaces
        self.df.columns = self.df.columns.str.strip()

        # Convert 'prefixes' column from strings to tuples for efficient comparison
        self.df['prefixes'] = self.df['prefixes'].apply(eval)

        # Remove duplicate prefixes, keeping only the first occurrence
        self.df = self.df.drop_duplicates(subset='prefixes', keep='first').reset_index(drop=True)

        # Precompute and cache the probability columns for use in the predict method
        fixed_columns = {'prefixes', 'targets', 'Support'}
        self.probability_columns = [col for col in self.df.columns if col not in fixed_columns]


    def predict(self, input_sequence: tuple, probMin: float = None):
        """
        Predicts possible next nodes based on the input sequence using cached probability columns.
        Filters predictions based on the minimum probability threshold.
        """
        if probMin is None:
            probMin = self.PROBABILITY_MIN

        # Vectorized comparison to filter rows with matching prefixes
        matching_rows = self.df[self.df['prefixes'] == input_sequence]

        if matching_rows.empty:
            return []  # Return an empty list if no matching prefixes found

        # Use only the first matching row
        first_row = matching_rows.iloc[0]

        # Vectorized filtering of predictions using cached probability columns
        valid_predictions = first_row[self.probability_columns][first_row[self.probability_columns] > probMin]

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
            if '[EOC]' in trace:
                continue
            
            # Vectorized check to find matching prefixes in the DataFrame
            matching_prefixes = self.df[self.df['prefixes'] == trace]

            if matching_prefixes.empty:
                # If no matching prefix, consider all activities as inserted
                total_cost_inserted += len(trace) * cost_insert
                total_possible_insertions += len(trace) * cost_insert
            else:
                # Assume first matching prefix (for performance reasons)
                matching_prefix = matching_prefixes.iloc[0]['prefixes']

                # Calculate skipped activities (present in prefix but not in trace)
                skipped_activities = [act for act in matching_prefix if act not in trace]
                total_cost_skipped += len(skipped_activities) * cost_skip

                # Calculate inserted activities (present in trace but not in the model prefix)
                inserted_activities = [act for act in trace if act not in matching_prefix]
                total_cost_inserted += len(inserted_activities) * cost_insert

                # Update possible insertion costs
                total_possible_insertions += len(trace) * cost_insert

        # Fitness formula: 1 - (cost of skipped + inserted activities) / max possible insertion cost
        total_deviation_cost = total_cost_inserted + total_cost_skipped
        fitness = 1 - (total_deviation_cost / total_possible_insertions) if total_possible_insertions > 0 else 1

        return fitness
    
    def simplicity(self, traces: list, nodes_in_process_tree: int):
        """
        Measures the simplicity of the model based on the number of duplicate and missing activities.
        
        Args:
            event_log (list): List of observed sequences (i.e., traces from the event log).
            nodes_in_process_tree (int): The number of nodes in the process tree (provided as input).
            
        Returns:
            float: Simplicity score between 0 and 1.
        """
        traces = [trace for trace in traces if '[EOC]' not in trace]
        
        # Extract unique activities from the process tree (from the 'prefixes' column in the DataFrame)
        unique_activities_in_log = set(act for prefix in self.df['prefixes'] for act in prefix)
        

        # Extract all activities in the event log (event classes)
        unique_activities_in_tree = set(act for trace in traces for act in trace)
        
        print("unique in log", unique_activities_in_log)
        
        print("unique in tree", unique_activities_in_tree)

        # Duplicate activities: activities that appear more than once in the process tree
        activity_counts_in_tree = {}
        for trace in traces:
            for activity in trace:
                if activity in activity_counts_in_tree:
                    activity_counts_in_tree[activity] += 1
                else:
                    activity_counts_in_tree[activity] = 1

        duplicate_activities = sum(1 for count in activity_counts_in_tree.values() if count > 1)
        
        print("dup", duplicate_activities)

        # Missing activities: activities in the tree that are not in the event log
        missing_activities = len(unique_activities_in_tree - unique_activities_in_log)

        # Event classes in the log: number of unique activities in the event log
        event_classes_in_log = len(unique_activities_in_log)

        # Simplicity formula: provided nodes_in_process_tree is used
        simplicity_score = 1 - (duplicate_activities + missing_activities) / (nodes_in_process_tree + event_classes_in_log)
        print("simp",simplicity_score)

        return simplicity_score

