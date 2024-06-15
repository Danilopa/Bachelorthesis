from django.shortcuts import render
from django.http import HttpResponse, JsonResponse
from django.template import loader
from django.views.decorators.csrf import csrf_exempt

from services.CoinSearchHandler import CoinSearchHandler
from services.CustomDataFrame import Dataframes
from services.Helper import Helper

import json
import csv

import pandas as pd

database = Dataframes()
coinSearchHandler = CoinSearchHandler()
helper = Helper("newapp/ressources/mintMap.csv")

#mintMap_df = pd.read_csv("newapp/ressources/mintMap.csv")
#mintMap_df = mintMap_df.set_index('mint')
#mintMap = mintMap_df['mintLabel'].to_dict()

mintMap = helper.get_mint_map()


def index(request):
	"""
	Renders the main index page of the web application.

	Parameters:
		request: The HTTP request object.

	Returns:
		HttpResponse: The rendered index page.
	
	Author: Danilo Pantic
	"""
	template = loader.get_template('index.html')

	return HttpResponse(template.render())


def getRecommendations(q, scope):
	"""
	Fetches recommendations based on a query and scope from the dataframes.

	Parameters:
		q (str): The search query.
		scope (dict): A dictionary indicating which tables to search in.

	Returns:
		dict: A dictionary containing search results from different dataframes.
	
	Author: Danilo Pantic
	"""
	out = {}

	column_mapping = {
		'list_animal': ['name_en', 'name_ger', 'alternativenames_en', 'alternativenames_ger'],
		'list_obj': ['name_en', 'name_ger', 'alternativenames_en', 'alternativenames_ger'],
		'list_person': ['name', 'name_german', 'alternativenames'],
		'list_plant': ['name_en', 'name_ger', 'alternativenames_en', 'alternativenames_ger'],
		'list_verb': ['name_en', 'name_ger', 'alternativenames_en', 'alternativenames_ger'],
		'hierarchy': ['class']
	}

	for table in scope.keys():
		if scope[table]:
			df = database.get(table)
			if df is not None:
				search_columns = column_mapping.get(table, [])
				search_results = []
				for column in search_columns:
					results = df.search(column, q)
					for result in results:
						search_results.append(result)
				out[table] = search_results

				print(table, out.keys())
			else:
				out[table] = []
	return out


def MultiValueDict2Dict(key, mvd):
	"""
	Converts a MultiValueDict to a regular dictionary filtering by a specific key.

	Parameters:
		key (str): The key to filter by.
		mvd (django.utils.datastructures.MultiValueDict): The MultiValueDict to convert.

	Returns:
		dict: A dictionary with filtered data.
	
	Author: Mohammed Sayed Mahmod
	"""
	out = {}

	for k in mvd.keys():
		if key in k:
			new_key = k[k.find("[") + 1:k.find("]")]
			
			out[new_key] = mvd[k][0] == "true"

	return out


def convertId(id_str):
	"""
	Converts an ID string to a usable format.

	Parameters:
		id_str (str): The ID string to convert.

	Returns:
		str: The converted ID.
	
	Author: Danilo Pantic
	"""
	if "coin_id=" in id_str:
		return id_str.split("coin_id=")[1]
	else:
		return id_str


def download_search_results(request):
	"""
	Handles the downloading of search results in various formats.

	Parameters:
		request: The HTTP request object.

	Returns:
		HttpResponse: A response object with the file download or an error message.
	
	Author: Mohammed Sayed Mahmod
	"""
	if request.method == "POST":
		fileType = request.POST["fileType"]
		searchType = request.POST["searchType"]
		query = request.POST["q"]

		results = coinSearchHandler.executeQuery(query)
		
		if fileType == "csv":
			response = HttpResponse(content_type='text/csv')
			response['Content-Disposition'] = f'attachment; filename="{searchType}_search_results.csv"'

			writer = csv.writer(response)
			writer.writerow([
				"Type", "URL", "Thumbnail Obverse", "Thumbnail Reverse", "ID", 
				"Weight", "Obverse Description", "Reverse Description", 
				"Date", "Max Diameter", "Location", "Region"
			])

			for row in results:
				writer.writerow([
					searchType,
					str(row.url) if row.url else "",
					str(row.thumbnailObverse) if row.thumbnailObverse else "static/no_image.jpg",
					str(row.thumbnailReverse) if row.thumbnailReverse else "static/no_image.jpg",
					convertId(str(row.id)),
					f"{row.weight} g" if row.weight else "",
					str(row.descriptionObverse) if row.descriptionObverse else "",
					str(row.descriptionReverse) if row.descriptionReverse else "",
					str(row.date) if row.date else "",
					f"{row.maxDiameter} mm" if row.maxDiameter else "",
					mintMap.get(str(row.mint), "") if row.mint else "",
					""
				])

			return response
		else:
			return JsonResponse({"error": "Unsupported fileType"}, status=400)
	else:
		return HttpResponse(status=405)


@csrf_exempt
def log(request):
	"""
	Endpoint for logging events from the front end.

	Parameters:
		request: The HTTP request object.

	Returns:
		JsonResponse: A response indicating success or failure of the log operation.
	
	Author: Mohammed Sayed Mahmod
	"""
	if request.method == 'POST':
		try:
			data = json.loads(request.body.decode('utf-8'))
			uuid = data.get('uuid')
			design = data.get('design')
			event = data.get('event')
			log_data = data.get('data')
			timestamp = data.get('timestamp')

			with open("newapp/logs/log.csv", "a+", newline='') as f:
				writer = csv.writer(f)
				writer.writerow([uuid, design, event, log_data, timestamp])

			return JsonResponse({"success": True, "message": "Log saved"})
		except json.JSONDecodeError:
			return JsonResponse({"success": False, "message": "Invalid JSON"})
		except Exception as e:
			return JsonResponse({"success": False, "message": str(e)})
	else:
		return JsonResponse({"success": False, "message": "Only POST method allowed"})


@csrf_exempt
def callback(request):
	"""
	The main callback endpoint for handling various actions from the frontend.

	Parameters:
		request: The HTTP request object.

	Returns:
		JsonResponse: A response object with the result of the action or an error message.
	
	Author: Mohammed Sayed Mahmod
	"""
	response = {"success": False}
	if request.method == "POST":
		if "action" in request.POST:
			a = request.POST["action"]
			if a == "getRecommendations":
				scope = MultiValueDict2Dict("scope", dict(request.POST))
				json_result = getRecommendations(request.POST["q"], scope)

				response["result"] = json_result
				response["success"] = True
			elif a == "generateQuery":
				coins = json.loads(request.POST["coins"])
				relationString = request.POST["relationString"]
				searchType = request.POST["searchType"]

				print(relationString)

				response["result"] = coinSearchHandler.generateQuery(coins, relationString, searchType)
				response["success"] = True
			elif a == "searchCoin":
				searchType = request.POST["searchType"]
				results = coinSearchHandler.executeQuery(request.POST["q"])

				result = []
				
				for row in results:
					category = row.type if searchType == "NumismaticObject" else "TYPE" if searchType == "TypeSeriesItem" else None

					result_item = {
						"type": searchType,
						"url": str(row.url) if row.url else None,
						"thumbnailObverse": str(row.thumbnailObverse) if row.thumbnailObverse else "static/no_image.jpg",
						"thumbnailReverse": str(row.thumbnailReverse) if row.thumbnailReverse else "static/no_image.jpg",
						"descriptionObverse": str(row.descriptionObverse) if row.descriptionObverse else None,
						"descriptionReverse": str(row.descriptionReverse) if row.descriptionReverse else None,
						"date": str(row.date) if row.date else None,
						"maxDiameter": float(row.maxDiameter) if row.maxDiameter else None,
						"id": convertId(row.id),
						"category": category,
						"weight": float(row.weight) if row.weight else None,
						"location": mintMap.get(str(row.mint), None) if searchType == "NumismaticObject" else "TYPE",
						"region": None if searchType == "NumismaticObject" else convertId(row.id)
					}

					result.append(result_item)

				response["success"] = True
				response["result"] = result
				response["length"] = len(results)
			elif a == "download":
				return download_search_results(request)

	return JsonResponse(response, safe=False)