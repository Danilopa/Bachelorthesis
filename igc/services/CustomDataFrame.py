import requests
import pandas as pd
from io import BytesIO

class CustomDataFrame():
    """
    A custom wrapper for pandas DataFrame to facilitate specific search and filtering operations.

    Attributes:
        df (pd.DataFrame): The underlying pandas DataFrame.
    """
        
    def __init__(self, pd_df):
        """
        Initializes the CustomDataFrame with a pandas DataFrame.

        Parameters:
            pd_df (pd.DataFrame): The pandas DataFrame to wrap.
        """
        self.df = pd_df

    def search(self, column, query):
        """
        Searches for rows where `query` is found in the specified `column` and returns a list of dictionaries.

        Parameters:
            column (str): The column to search in.
            query (str): The string to search for in the specified column.

        Returns:
            list: A list of dictionaries representing the rows where the query was found, 
                  with additional information about the found column.
        """
        df_filtered = self.df[self.df[column].str.contains(query, case=False, na=False)].copy()

        df_filtered['found_in_column'] = column

        for col in df_filtered.columns:
            if pd.api.types.is_numeric_dtype(df_filtered[col]):
                df_filtered[col] = df_filtered[col].apply(lambda x: None if pd.isna(x) else x).copy()

        df_filtered = df_filtered.where(pd.notnull(df_filtered), None)

        return df_filtered.to_dict(orient='records')

class Dataframes():
    """
    Manages the loading and accessing of multiple dataframes from specified sources.

    Attributes:
        dataframes (dict): A dictionary containing the loaded dataframes.
    """

    def __init__(self):
        """
        Initializes the Dataframes object, loading data from predefined URLs.
        """
        self.dataframes = {}
         
        tablenames = ["hierarchy", "list_animal", 
                      "list_obj", "list_person", 
                      "list_plant", "list_verb"]
        
        for table in tablenames:
            res = requests.get(f"https://raw.githubusercontent.com/Frankfurt-BigDataLab/NLP-on-multilingual-coin-datasets/main/lists/csv/nlp_{table}.csv").content
            self.dataframes[table] = CustomDataFrame(pd.read_csv(BytesIO(res)))
                   
    def get(self, tablename):
        """
        Retrieves the dataframe object for the specified tablename.

        Parameters:
            tablename (str): The name of the table to retrieve.

        Returns:
            CustomDataFrame: The CustomDataFrame object associated with the specified tablename.
        """
        return self.dataframes[tablename]