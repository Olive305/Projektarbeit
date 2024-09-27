import pandas as pd

class MyCsv:
    def __init__(self):
        self.df = None
        self.PROBABILITY_MIN = 0.1  # Minimum probability threshold

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

    def predict(self, input_sequence: str):
        """
        Predicts the possible next nodes based on the input sequence.
        :param input_sequence: A string representing the sequence of prefixes to predict from.
        :return: A list of tuples containing predicted nodes and their associated probabilities.
        """
        if self.df is None:
            raise ValueError("DataFrame is not loaded. Please open the CSV file first.")

        # Ensure the 'prefixes' column exists
        if 'prefixes' not in self.df.columns:
            raise KeyError("'prefixes' column not found in the DataFrame")

        # Normalize 'prefixes' and 'input_sequence' (remove spaces, standardize case, etc.)
        self.df['prefixes'] = self.df['prefixes'].str.strip().str.lower()
        input_sequence = input_sequence.strip().lower()

        # Filter the DataFrame to rows where the 'prefixes' column matches the input sequence
        filtered_df = self.df[self.df['prefixes'] == input_sequence]

        # Debugging: Check if any rows match the input sequence
        if filtered_df.empty:
            return []  # Return an empty list if no matching sequence is found

        # Use only the first row from the filtered DataFrame
        first_row = filtered_df.iloc[0]

        # Identify the indices of the 'targets' and '[EOC]' columns
        target_col_index = self.df.columns.get_loc('targets')
        eoc_col_index = self.df.columns.get_loc('[EOC]')
        
        # Extract all columns containing probabilities between 'targets' and '[EOC]'
        probability_columns = self.df.columns[target_col_index + 1:eoc_col_index]
        
        # Initialize an empty list to store the possible predictions
        predictions = []
        predicted = []

        # Check each probability column in the first row
        for col in probability_columns:
            if first_row[col] >= self.PROBABILITY_MIN:  # Check if the probability meets the threshold
                if col not in predicted:
                    predictions.append([col, first_row[col]])  # Append (node, probability)
                    predicted.append(col)
        
        # Check if the [EOC] column has a value of 1, indicating the end of the chain
        if first_row['[EOC]'] >= self.PROBABILITY_MIN:
            predictions.append(['EOC', first_row['[EOC]']])  # Predict 'EOC' with probability 1.0

        return predictions
