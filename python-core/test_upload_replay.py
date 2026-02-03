import requests
import json
import base64
import os

def test_upload_replay():
    trace_path = r"c:\autokim\public\uploads\trace_1769421236955_POST.json"
    
    with open(trace_path, "r", encoding="utf-8") as f:
        trace = json.load(f)

    url = trace["url"]
    headers = trace["headers"]
    
    # Check if we should use the string payload or parsed json
    raw_payload_str = trace["payload"]
    
    # We will try to send a very small test image instead of the huge one to see if it works
    # 1x1 white pixel jpeg
    small_b64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD3+iiigD//2Q=="
    
    # Modify the payload to use the small image
    try:
        payload_dict = json.loads(raw_payload_str)
        payload_dict["json"]["uploadMediaInput"]["rawBytes"] = small_b64
        final_payload = json.dumps(payload_dict)
    except:
        final_payload = raw_payload_str # Fallback to original if parsing fails

    print(f"Replaying upload to {url}...")
    try:
        response = requests.post(url, headers=headers, data=final_payload)
        print(f"Status Code: {response.status_code}")
        print("Response Body:")
        print(response.text[:1000]) # Print first 1000 chars
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_upload_replay()
