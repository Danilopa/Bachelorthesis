from rdflib import Graph
from rdflib.plugins.stores import sparqlstore
import re

class CoinSearchHandler():
    """
    A handler class for executing SPARQL queries against a specified RDF dataset 
    to search for numismatic objects (coins) based on various criteria.

    Attributes:
        endpoint (str): SPARQL endpoint URL.
        store (SPARQLStore): The SPARQL store connected to the endpoint.
        g (Graph): RDFLib Graph connected to the SPARQL store.
        _query_head (str): Common prefixes and initial part of the SPARQL query.
    """

    def __init__(self):
        """
        Initializes the CoinSearchHandler with a specific SPARQL endpoint.
        """
        self.endpoint = "https://data.corpus-nummorum.eu/sparql"
        self.store = sparqlstore.SPARQLStore(self.endpoint)
        self.g = Graph(self.store)
        self._query_head = """
        PREFIX nmo: <http://nomisma.org/ontology#>
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        PREFIX dcterms: <http://purl.org/dc/terms/>
        """

    def executeQuery(self, query):
        """
        Executes a SPARQL query against the configured endpoint and returns the results.
        
        Parameters:
            query (str): The SPARQL query to be executed.

        Returns:
            list: A list of results obtained from the query execution.
        """
        return self.g.query(query)
    
    def generateCoinQuery(self, id, coin, searchType, isNegated=False):
        """
        Generates a SPARQL query part for a specific coin based on its attributes.
        
        Parameters:
            id (str): The identifier of the coin.
            coin (dict): A dictionary containing attributes of the coin to construct the query part.
            searchType (str): The type of search to be performed.
            isNegated (bool): A flag indicating whether the query part should be negated.

        Returns:
            str: A SPARQL query part specific to the provided coin attributes.
        """
        obverse_part = ""
        reverse_part = ""

        id_part = "?url dcterms:identifier ?id ."

        design_part = """OPTIONAL {
            ?url nmo:hasObverse ?obverse .
            ?obverse nmo:hasIconography ?obverseIconography .
        }"""

        thumbnail_obverse_part = """OPTIONAL {
            ?url nmo:hasObverse ?obverseSide .
            ?obverseSide foaf:thumbnail ?thumbnailObverse .
        }"""

        thumbnail_reverse_part = """OPTIONAL {
            ?url nmo:hasReverse ?reverseSide .
            ?reverseSide foaf:thumbnail ?thumbnailReverse .
        }"""

        description_obverse_part = """OPTIONAL {
            ?url nmo:hasObverse ?obverseSide .
            ?obverseSide dcterms:description ?descriptionObverse .
            FILTER (lang(?descriptionObverse) = "en")
        }"""

        description_reverse_part = """OPTIONAL {
            ?url nmo:hasReverse ?reverseSide .
            ?reverseSide dcterms:description ?descriptionReverse .
            FILTER (lang(?descriptionReverse) = "en")
        }"""

        weight_part = "OPTIONAL { ?url nmo:hasWeight ?weight . }"
        location_part = "OPTIONAL { ?url nmo:hasMint ?mint . }"
        date_part = "OPTIONAL { ?url nmo:hasDate ?date . FILTER (lang(?date) = 'en') }"
        max_diameter_part = "OPTIONAL { ?url nmo:hasMaxDiameter ?maxDiameter . }"

        if coin["obverse"]["coin"]:
            obverse_subject, obverse_predicate, obverse_object = self._extract_spo(coin["obverse"]["coin"])
            obverse_part = self._create_sparql_part(id, "obverse", obverse_subject, obverse_predicate, obverse_object, isNegated)

        if coin["reverse"]["coin"]:
            reverse_subject, reverse_predicate, reverse_object = self._extract_spo(coin["reverse"]["coin"])
            reverse_part = self._create_sparql_part(id, "reverse", reverse_subject, reverse_predicate, reverse_object, isNegated)

        type_part = "OPTIONAL { ?url nmo:hasTypeSeriesItem ?type . }"

        keywords_part = ""

        for kw in coin["obverse"]["keywords"]:
            if kw["negated"]:
                keywords_part += f"FILTER NOT EXISTS {{ ?obverseIconography dcterms:description ?obvDesc . FILTER regex(?obvDesc, \"{kw['text']}\", \"i\") }}\n"
            else:
                keywords_part += f"?obverseIconography dcterms:description ?obvDesc . FILTER regex(?obvDesc, \"{kw['text']}\")\n"

        for kw in coin["reverse"]["keywords"]:
            if kw["negated"]:
                keywords_part += f"FILTER NOT EXISTS {{ ?reverseIconography dcterms:description ?revDesc . FILTER regex(?revDesc, \"{kw['text']}\", \"i\") }}\n"
            else:
                keywords_part += f"?reverseIconography dcterms:description ?revDesc . FILTER regex(?revDesc, \"{kw['text']}\")\n"

        if searchType == "TypeSeriesItem":
            thumbnail_obverse_part = """
            {
            SELECT ?url (SAMPLE(?obvThumbnail) AS ?thumbnailObverse) (SAMPLE(?revThumbnail) AS ?thumbnailReverse) WHERE {
                ?numismaticObject nmo:hasTypeSeriesItem ?url ;
                                rdf:type nmo:NumismaticObject .
                OPTIONAL {
                    ?numismaticObject nmo:hasObverse ?obvSide .
                    ?obvSide dcterms:relation ?obverseRelation .
                    ?obverseRelation foaf:thumbnail ?obvThumbnail .
                }
                OPTIONAL {
                    ?numismaticObject nmo:hasObverse ?obvSide .
                    ?obvSide foaf:thumbnail ?obvThumbnail .
                }
                OPTIONAL {
                    ?numismaticObject nmo:hasReverse ?revSide .
                    ?revSide dcterms:relation ?reverseRelation .
                    ?reverseRelation foaf:thumbnail ?revThumbnail .
                }
                OPTIONAL {
                    ?numismaticObject nmo:hasReverse ?revSide .
                    ?revSide foaf:thumbnail ?revThumbnail .
                }
            } GROUP BY ?url
            }"""

            thumbnail_reverse_part = ""
        else:
            thumbnail_obverse_part = """
            OPTIONAL {
                ?url nmo:hasObverse ?obverseSide .
                ?obverseSide dcterms:relation ?obverseRelation .
                ?obverseRelation foaf:thumbnail ?thumbnailObverse .
            }
            OPTIONAL {
                ?url nmo:hasObverse ?obverseSide .
                ?obverseSide foaf:thumbnail ?thumbnailObverse .
            }
            """

            thumbnail_reverse_part = """
            OPTIONAL {
                ?url nmo:hasReverse ?reverseSide .
                ?reverseSide dcterms:relation ?reverseRelation .
                ?reverseRelation foaf:thumbnail ?thumbnailReverse .
            }
            OPTIONAL {
                ?url nmo:hasReverse ?reverseSide .
                ?reverseSide foaf:thumbnail ?thumbnailReverse .
            }
            """


        query = f"""
        {{
        ?url rdf:type nmo:{searchType} .
        {id_part}
        {design_part}
        {location_part}
        {obverse_part}
        {reverse_part}
        {thumbnail_obverse_part}
        {thumbnail_reverse_part}
        {description_obverse_part}
        {description_reverse_part}
        {weight_part}
        {date_part}
        {max_diameter_part}
        {type_part}
        {keywords_part}
        }}
        """
        return query

    def _extract_spo(self, coin_side):
        """
        Extracts subject, predicate, and object from a coin side specification.
        
        Parameters:
            coin_side (dict): A dictionary representing one side of a coin.

        Returns:
            tuple: A tuple containing the subject, predicate, and object extracted from the coin side.
        """
        subject = None
        predicate = None
        obj = None

        for item in coin_side:
            if item["category"] != "list_verb":
                if (subject) or (not subject and predicate):
                    obj = item["item"]["link"]
                else:
                    subject = item["item"]["link"]
            else:
                predicate = item["item"]["link"]
        return subject, predicate, obj

    def _create_sparql_part(self, id, side, subject, predicate, obj, isNegated):
        """
        Creates a SPARQL query part for a specific side of a coin based on subject, predicate, and object.
        
        Parameters:
            id (str): The identifier of the coin.
            side (str): The side of the coin ('obverse' or 'reverse').
            subject (str): The subject URI.
            predicate (str): The predicate URI.
            obj (str): The object URI.
            isNegated (bool): A flag indicating whether the query part should be negated.

        Returns:
            str: A SPARQL query part for the specified side of the coin.
        """
        sparql_part = f"""
        ?url nmo:has{side.capitalize()} ?{side}Side .
        ?{side}Side nmo:hasIconography ?{side}Iconography .
        ?{side}Iconography nmo:hasIconography ?{side}DesignIconography .
        ?{side}DesignIconography rdf:type rdf:Bag .
        ?{side}DesignIconography rdf:li ?{side}Description{id} .
        """
        if (isNegated):
            sparql_part += f"""
            FILTER NOT EXISTS {{
            ?{side}DesignIconography rdf:li ?{side}Description{id}2 .
            """
            if subject:
                sparql_part += f"?{side}Description{id}2 rdf:subject <{subject}> .\n"
            if predicate:
                sparql_part += f"?{side}Description{id}2 rdf:predicate <{predicate}> .\n"
            if obj:
                sparql_part += f"?{side}Description{id}2 rdf:object <{obj}> .\n"

            sparql_part += "}"
        else:
            if subject:
                sparql_part += f"?{side}Description{id} rdf:subject <{subject}> .\n"
            if predicate:
                sparql_part += f"?{side}Description{id} rdf:predicate <{predicate}> .\n"
            if obj:
                sparql_part += f"?{side}Description{id} rdf:object <{obj}> .\n"
        
        return sparql_part

    def _eliminate_not_brackets(self, expression):
        """
        Eliminates NOT brackets from a boolean term and returns the resulting expression.

        Parameters:
            expression (str): A boolean expression to be transformed.
        
        Returns:
            str: The transformed boolean expression with eliminated NOT brackets.
        """
        while "NOT (" in expression:
            pattern = r"NOT \(([^)]+)\)"

            def replace_negated_expression(match):
                inner_expression = match.group(1)
                transformed = re.sub(r"\bAND\b", " TEMP_AND ", inner_expression)
                transformed = re.sub(r"\bOR\b", " AND ", transformed)
                transformed = re.sub(r" TEMP_AND ", " OR ", transformed)
                transformed = re.sub(r"(\bC\d+\b)", r"NOT \1", transformed)
                transformed = re.sub(r"NOT NOT ", "", transformed)
                return f"({transformed})"

            booleanTerm = re.sub(pattern, replace_negated_expression, booleanTerm)
            booleanTerm = re.sub(r"NOT NOT ", "", booleanTerm)
            expression = booleanTerm

        expression = re.sub(r"\s+", " ", expression).strip()

        return expression

    def generateQuery(self, coins, booleanTerm, searchType):
        """
        Generates a complete SPARQL query based on a list of coins and a boolean term combining them.
        
        Parameters:
            coins (list): A list of dictionaries, each representing attributes of a coin.
            booleanTerm (str): A boolean expression combining the coins.
            searchType (str): The type of search to be performed.

        Returns:
            str: A complete SPARQL query constructed from the provided coins and boolean term.
        """
        booleanTerm = self._eliminate_not_brackets(booleanTerm)
        booleanTerm = booleanTerm.replace("(", "{").replace(")", "}")

        coin_dict = {f"C{i+1}": (i+1, coin) for i, coin in enumerate(coins)}

        for placeholder, (id, coin_data) in coin_dict.items():
            isNegated = "NOT " + placeholder in booleanTerm
            coinQueryPart = self.generateCoinQuery(id, coin_data, searchType, isNegated)
            booleanTerm = booleanTerm.replace("NOT " + placeholder if isNegated else placeholder, coinQueryPart)


        operators = {
            "AND": "",
            "OR": "UNION"
        }

        for operator, sparql_operator in operators.items():
            booleanTerm = booleanTerm.replace(operator, sparql_operator)

        combined_query = self._query_head
        combined_query += f"SELECT DISTINCT ?url ?thumbnailObverse ?thumbnailReverse ?descriptionObverse ?descriptionReverse ?date ?maxDiameter ?id ?weight ?type ?mint WHERE {{ {booleanTerm} }}"

        return combined_query