import pandas as pd

class MyCsv:
    def __init__(self):
        self.df = None
        self.PROBABILITY_MIN = 0.3  # Minimum probability threshold

    def getPrefixes(self):
        """
        Extracts all the unique prefixes from the 'prefixes' column in the DataFrame.
        :return: A list of tuples representing the prefixes.
        """
        if 'prefixes' not in self.df.columns:
            raise KeyError("The 'prefixes' column is missing in the DataFrame. Available columns: " + str(self.df.columns))
        return list(self.df['prefixes'].unique())

    def openCsv(self, name: str):
        """
        Opens the CSV file and loads it into a DataFrame.
        Converts the 'prefixes' column from string representations to tuples upfront to avoid repeated evaluation.
        :param name: The name of the CSV file to load.
        :return: The loaded DataFrame.
        """
        self.df = pd.read_csv(name, delimiter=';')

        # Trim column names to remove any leading/trailing spaces
        self.df.columns = self.df.columns.str.strip()

        # Convert 'prefixes' column from strings to tuples for efficient comparison
        self.df['prefixes'] = self.df['prefixes'].apply(eval)

        # Debugging step: Print column names to ensure 'prefixes' exists
        print("Loaded DataFrame with columns:", self.df.columns)
        return self.df

    def predict(self, input_sequence: tuple, probMin: float = None):
        """
        Predicts the possible next nodes based on the input sequence.
        :param input_sequence: A tuple containing the sequence of prefixes to predict from.
        :param probMin: The minimum probability threshold for filtering predictions. 
                        If None, it defaults to the class-level PROBABILITY_MIN.
        :return: A list of tuples containing predicted nodes and their associated probabilities.
        """
        if probMin is None:
            probMin = self.PROBABILITY_MIN

        # Check if the 'prefixes' column exists
        if 'prefixes' not in self.df.columns:
            raise KeyError("The 'prefixes' column is missing in the DataFrame.")

        # Use a vectorized comparison to filter rows with matching prefixes
        matching_rows = self.df[self.df['prefixes'] == input_sequence]

        if matching_rows.empty:
            return []  # Return an empty list if no matching prefixes found

        # Identify relevant columns (exclude fixed columns like 'prefixes', 'targets', and 'Support')
        fixed_columns = {'prefixes', 'targets', 'Support'}
        probability_columns = [col for col in self.df.columns if col not in fixed_columns]

        # Use vectorized operations to extract predictions that meet the probability threshold
        predictions = []
        for _, row in matching_rows.iterrows():
            # Vectorized filtering for probabilities
            valid_predictions = row[probability_columns][row[probability_columns] >= probMin]
            predictions.extend(valid_predictions.items())
        
        return predictions
