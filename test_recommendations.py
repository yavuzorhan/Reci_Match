
import requests
import json

def test_recommendations():
    url = "http://127.0.0.1:8000/api/recipes/recommendations"
    payload = {
        "selected_ingredient_ids": [1, 4], # yumurta, pirinc
        "pantry_ingredient_ids": [],
        "disliked_ingredient_ids": [],
        "cooking_types": [],
        "exclude_disliked": False,
        "user_id": 7,
        "source": None,
        "healthy_only": False
    }
    
    try:
        response = requests.post(url, json=payload)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            results = response.json()
            print(f"Found {len(results)} recommendations")
            if results:
                print(f"Top result: {results[0]['name']} (Score: {results[0]['score']})")
        else:
            print(f"Error: {response.text}")
    except Exception as e:
        print(f"Connection error: {e}")

if __name__ == "__main__":
    test_recommendations()
