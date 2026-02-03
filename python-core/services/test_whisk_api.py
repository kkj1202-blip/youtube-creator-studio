import requests
import json
import os

def test_api():
    # Load captured debug info
    debug_file = r"c:\autokim\public\uploads\api_debug.json"
    if not os.path.exists(debug_file):
        print("Debug file not found")
        return

    with open(debug_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    url = data["url"]
    headers = data["headers"]
    
    # Ensure content-type
    headers["Content-Type"] = "text/plain;charset=UTF-8"
    
    # Use a new prompt to verify it's working
    payload_str = data["payload"]
    payload = json.loads(payload_str)
    payload["prompt"] = "a beautiful futuristic city, cyberpunk, neon lights, 8k, detailed"
    payload["seed"] = 123456 # Change seed

    print(f"Sending API request to {url}...")
    try:
        response = requests.post(url, headers=headers, json=payload)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            print("Response Headers:", response.headers)
            print("Response Body Snippet:", response.text[:1000])
            
            # Save full response for analysis
            with open(r"c:\autokim\public\uploads\api_response.json", "w", encoding="utf-8") as f:
                f.write(response.text)
            print("Saved full response to api_response.json")
        else:
            print("Error Response:", response.text)
            
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    test_api()
