import requests
import json
import os
import sys
import base64
import time
import argparse
from datetime import datetime

# Setup encoding for console output (both stdout and stderr)
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
sys.stderr.reconfigure(encoding='utf-8', errors='replace')

def generate_image_api(prompt, output_dir, credentials_path, **kwargs):
    # 1. Load Credentials
    if not os.path.exists(credentials_path):
        print(json.dumps({"error": "No API credentials found. Please run the Standard (DOM) mode once to capture credentials."}))
        sys.exit(1)

    try:
        with open(credentials_path, "r", encoding="utf-8") as f:
            creds = json.load(f)
    except Exception as e:
        print(json.dumps({"error": f"Failed to load credentials: {str(e)}"}))
        sys.exit(1)

    url = creds.get("url")
    headers = creds.get("headers", {})
    
    # Ensure correct content type
    headers["Content-Type"] = "text/plain;charset=UTF-8"
    
    # 2. Prepare Payload
    try:
        # The payload in debug file is a stringified JSON
        base_payload = json.loads(creds.get("payload", "{}"))
        
        def recursive_update(data, target_key, new_value):
            if isinstance(data, dict):
                for k, v in data.items():
                    if k == target_key:
                        data[k] = new_value
                    else:
                        recursive_update(v, target_key, new_value)
            elif isinstance(data, list):
                for item in data:
                    recursive_update(item, target_key, new_value)

        # Update prompt and seed recursively
        import random
        recursive_update(base_payload, "prompt", prompt)
        recursive_update(base_payload, "seed", random.randint(100000, 999999))
        
        payload = base_payload
        
    except Exception as e:
        print(json.dumps({"error": f"Failed to prepare payload: {str(e)}"}))
        sys.exit(1)

    # 3. Send Request
    print(f"Generating image via API for prompt: {prompt[:30]}...", file=sys.stderr)
    
    try:
        # Use data=json.dumps() instead of json= for text/plain compatibility
        response = requests.post(url, headers=headers, data=json.dumps(payload), timeout=60)
        
        if response.status_code != 200:
            # Check for auth errors
            if response.status_code in [401, 403]:
                print(json.dumps({"error": "CREDENTIALS_EXPIRED", "details": "The Google auth token has expired. Please run in Standard Mode once to refresh."}))
                sys.exit(1)
            else:
                print(json.dumps({"error": f"API Request failed with status {response.status_code}", "body": response.text[:200]}))
                sys.exit(1)
                
    except Exception as e:
        print(json.dumps({"error": f"Network error: {str(e)}"}))
        sys.exit(1)

    # 4. Process Response
    try:
        data = response.json()
        
        # Navigate JSON path: imagePanels[0] -> generatedImages[0] -> encodedImage
        images_list = data.get("imagePanels", [])
        if not images_list:
            print(json.dumps({"error": "No image panels in response", "response": str(data)[:200]}))
            sys.exit(1)
            
        generated = images_list[0].get("generatedImages", [])
        if not generated:
            print(json.dumps({"error": "No generated images in response"}))
            sys.exit(1)
            
        b64_data = generated[0].get("encodedImage")
        if not b64_data:
            print(json.dumps({"error": "No encodedImage data found"}))
            sys.exit(1)

        # 5. Save Image
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
            
        if kwargs.get('filename'):
            filename = kwargs['filename']
            # Ensure extension
            if not filename.lower().endswith(('.jpg', '.png', '.webp')):
                 filename += ".jpg"
        else:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"whisk_api_{timestamp}.jpg"
            
        filepath = os.path.join(output_dir, filename)
        
        with open(filepath, "wb") as f:
            f.write(base64.b64decode(b64_data))
            
        # Success Output
        print(json.dumps({
            "success": True, 
            "image_path": filepath,
            "mode": "API"
        }))
        
    except Exception as e:
        print(json.dumps({"error": f"Processing error: {str(e)}"}))
        sys.exit(1)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Generate image using Whisk API')
    parser.add_argument('--prompt', type=str, required=True, help='Prompt for image generation')
    parser.add_argument('--output', type=str, default='public/uploads', help='Output directory')
    parser.add_argument('--filename', type=str, help='Specific filename to save as')
    parser.add_argument('--creds', type=str, default=r'c:\autokim\public\uploads\api_debug.json', help='Path to credentials JSON')
    
    # Reference flags (Trigger fallback if used)
    parser.add_argument('--subject', type=str, help='Subject reference path')
    parser.add_argument('--style', type=str, help='Style reference path')
    parser.add_argument('--composition', type=str, help='Composition reference path')
    parser.add_argument('--cookies', type=str, help='Path to cookies.json (for reliable proxy auth)')
    
    args = parser.parse_args()
    
    # Check for references
    if args.subject or args.style or args.composition:
        print(f"References detected ({args.subject or ''} {args.style or ''} {args.composition or ''}). Switching to Headless DOM Mode proxy...", file=sys.stderr)
        
        # 1. Determine Cookies for Proxy
        proxy_cookies_path = None
        
        if args.cookies and os.path.exists(args.cookies):
            print(f"Using provided cookies file for proxy: {args.cookies}", file=sys.stderr)
            proxy_cookies_path = args.cookies
        else:
            # Fallback: Extract from API Creds headers (Legacy/Fragile)
            try:
                print("Extracting cookies from API headers for proxy (Fallback method)...", file=sys.stderr)
                with open(args.creds, "r", encoding="utf-8") as f:
                    creds_data = json.load(f)
                
                cookie_header = creds_data.get("headers", {}).get("cookie", "") or creds_data.get("headers", {}).get("Cookie", "")
                
                if not cookie_header:
                    print(json.dumps({"error": "No cookies found in API credentials to bridge to DOM mode."}))
                    sys.exit(1)
                
                # Simple cookie parsing (Name=Value; ...)
                playwright_cookies = []
                for c_str in cookie_header.split(";"):
                    if "=" in c_str:
                        name, value = c_str.strip().split("=", 1)
                        playwright_cookies.append({
                            "name": name,
                            "value": value,
                            "domain": ".google.com",
                            "path": "/",
                        })
                
                temp_cookie_path = os.path.join(os.path.dirname(args.creds), "temp_bridge_cookies.json")
                with open(temp_cookie_path, "w", encoding="utf-8") as f:
                    json.dump(playwright_cookies, f)
                
                proxy_cookies_path = temp_cookie_path
                    
            except Exception as e:
                print(json.dumps({"error": f"Failed to bridge cookies: {str(e)}"}))
                sys.exit(1)

        # 2. Call generate_whisk.py (DOM) in Headless Mode
        import subprocess
        
        dom_script = os.path.join(os.path.dirname(__file__), "generate_whisk.py")
        dom_script = os.path.join(os.path.dirname(__file__), "generate_whisk.py")
        cmd = [
            sys.executable, dom_script,
            "--prompt", args.prompt,
            "--cookies", proxy_cookies_path,
            "--output", args.output,
            "--headless"  # Enable Headless!
        ]
        
        if args.filename:
            cmd.extend(["--filename", args.filename])
        if args.subject:
            cmd.extend(["--subject", args.subject])
        if args.style:
            cmd.extend(["--style", args.style])
        if args.composition:
            cmd.extend(["--composition", args.composition])
            
        try:
            # Run and capture output
            result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8')
            
            # Check for generic failure
            if result.returncode != 0:
                print(json.dumps({"error": f"DOM Proxy Failed (RC {result.returncode})", "details": result.stderr}))
                sys.exit(1)
                
            # Parse the DOM output (looking for ---RESULT_START---)
            import re
            match = re.search(r"---RESULT_START---([\s\S]*?)---RESULT_END---", result.stdout)
            
            if match:
                try:
                    files = json.loads(match.group(1).strip())
                    if files:
                        # Success! Convert to API format
                        # contents of files[0] is "/uploads/filename.jpg"
                        # We need absolute path for image_path, as per normal API behavior expectation in main.py?
                        # main.py expects: {"success": True, "image_path": absolute_path, "mode": "API"}
                        
                        relative_path = files[0]
                        abs_path = os.path.join(args.output, os.path.basename(relative_path))
                        
                        print(json.dumps({
                            "success": True,
                            "image_path": abs_path,
                            "mode": "API-Proxy"
                        }))
                        sys.exit(0)
                        
                except Exception as parse_e:
                     print(json.dumps({"error": f"Failed to parse inner JSON: {parse_e}", "raw": result.stdout[:200]}))
                     sys.exit(1)
            
            # Fallback if no specific result marker
            print(json.dumps({"error": "No result marker found in DOM output", "raw": result.stdout[:500]}))
            sys.exit(1)
            
        except Exception as e:
             print(json.dumps({"error": f"Failed to execute DOM proxy: {str(e)}"}))
             sys.exit(1)
    
    generate_image_api(args.prompt, args.output, args.creds, filename=args.filename)
