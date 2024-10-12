import pandas as pd

class MyCsv:
    def __init__(self):
        self.df = None
        self.PROBABILITY_MIN = 0.3  # Minimum probability threshold

    def openCsv(self, name: str):
        """
        Opens the CSV file and loads it into a DataFrame.
        :param name: The name of the CSV file to load.
        :return: The loaded DataFrame.
        """
        # Load CSV and ensure column names are properly stripped of whitespace
        self.df = pd.read_csv(name, delimiter=';', quoting=3)
        self.df.columns = self.df.columns.str.strip()  # Strip whitespace from columns
        # Remove duplicate prefixes while keeping only the first occurrence
        self.df = self.df.drop_duplicates(subset=['prefixes'], keep='first').reset_index(drop=True)
        return self.df

    def testCsv(self):
        """Prints the first few rows of the loaded DataFrame."""
        if self.df is not None:
            print("Columns:", self.df.columns)
            print(self.df.head())
        else:
            print("DataFrame is not loaded. Please open the CSV first.")

    def preprocess_df(self):
        """ Preprocesses the DataFrame by normalizing the 'prefixes' column and setting it as an index. """
        if 'prefixes' not in self.df.columns:
            raise KeyError("'prefixes' column not found in the DataFrame")
        self.df['prefixes'] = self.df['prefixes'].str.strip().str.lower()
        self.df.set_index('prefixes', inplace=True, drop=False)

    def predict(self, input_sequence: str, probMin: float):
        """
        Predicts the possible next nodes based on the input sequence.
        :param input_sequence: A string representing the sequence of prefixes to predict from.
        :return: A list of tuples containing predicted nodes and their associated probabilities.
        """
        if self.df is None:
            raise ValueError("DataFrame is not loaded. Please open the CSV file first.")

        self.PROBABILITY_MIN = probMin

        # Normalize and use the input_sequence
        input_sequence = input_sequence.strip().lower()

        # Filter the DataFrame using the index
        if input_sequence not in self.df.index:
            return []  # Return an empty list if no matching sequence is found

        # Retrieve the row directly by index
        first_row = self.df.loc[input_sequence]

        # Identify the columns between 'targets' and '[EOC]' (assuming continuous columns)
        target_col_index = self.df.columns.get_loc('targets')
        eoc_col_index = self.df.columns.get_loc('[EOC]')
        probability_columns = self.df.columns[target_col_index + 1:eoc_col_index]

        # Filter probability columns with vectorized operations
        prob_values = first_row[probability_columns]
        valid_probs = prob_values[prob_values >= self.PROBABILITY_MIN]

        # Collect predictions
        predictions = list(valid_probs.items())

        # Check if the [EOC] column has a value that meets the threshold
        if first_row['[EOC]'] >= self.PROBABILITY_MIN:
            predictions.append(('EOC', first_row['[EOC]']))

        return predictions

