import requests
import json
import base64
import os

def test_caption():
    # Load the captured trace
    trace_path = r"c:\autokim\public\uploads\trace_1769420057591_POST.json"
    if not os.path.exists(trace_path):
        print("Trace file not found!")
        return

    with open(trace_path, "r", encoding="utf-8") as f:
        trace = json.load(f)

    url = trace["url"]
    headers = trace["headers"]
    
    # Extract the payload (it's a JSON string inside 'payload')
    # The trace saver saved it as: "payload": "{\"json\": ...}"
    # So strictly speaking, requests.post needs the raw string body? 
    # Or implies it was x-www-form-urlencoded?
    # Let's check Content-Type
    print(f"Content-Type: {headers.get('content-type')}")
    
    payload = trace["payload"]
    # If the payload in trace is already a string, we might need to send it as is, or parse it if we want to modify.
    # But for replay, sending as is is best.
    
    print(f"Sending request to {url}...")
    try:
        response = requests.post(url, headers=headers, data=payload)
        print(f"Status Code: {response.status_code}")
        print("Response Body:")
        
        try:
            data = response.json()
            print(json.dumps(data, indent=2, ensure_ascii=False))
            
            # Check for Media ID or similar
            # Whisk usually returns something like "mediaId" or "blobId"
        except:
            print(response.text)
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_caption()
