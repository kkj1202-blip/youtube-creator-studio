import asyncio
from playwright.async_api import async_playwright
import json
import os
import sys

# Function to find Chrome (reused)
def find_chrome_path():
    paths = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%PROGRAMFILES%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%PROGRAMFILES(X86)%\Google\Chrome\Application\chrome.exe")
    ]
    for path in paths:
        if os.path.exists(path):
            return path
    return None

async def harvest_token(cookies_path=None):
    chrome_path = find_chrome_path()
    if not chrome_path:
        print("ERROR: Chrome not found")
        return None

    user_data_dir = os.path.join(os.getenv('TEMP'), 'playwright_chrome_token_harvester')
    
    token = None
    
    async with async_playwright() as p:
        # Launch headless for speed (unless debugging needed, but headless usually works for token extraction if cookies are good)
        browser = await p.chromium.launch_persistent_context(
            user_data_dir=user_data_dir,
            executable_path=chrome_path,
            headless=True, 
            args=['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
            ignore_default_args=["--enable-automation"]
        )
        
        page = browser.pages[0] if browser.pages else await browser.new_page()
        
        # Load Cookies if provided
        if cookies_path and os.path.exists(cookies_path):
            try:
                with open(cookies_path, 'r', encoding='utf-8') as f:
                    cookies = json.load(f)
                    formatted_cookies = []
                    for c in cookies:
                        if c.get('domain') and c.get('name') and c.get('value'):
                            formatted_cookies.append({
                                'name': c['name'],
                                'value': c['value'],
                                'domain': c['domain'],
                                'path': c.get('path', '/'),
                                'secure': c.get('secure', True),
                                'httpOnly': c.get('httpOnly', True),
                                'sameSite': c.get('sameSite', 'Lax')
                            })
                    await browser.add_cookies(formatted_cookies)
            except Exception as e:
                print(f"Cookie load error: {e}")

        # Intercept requests to find Authorization header
        token_found_event = asyncio.Event()
        
        async def handle_request(request):
            nonlocal token
            if "googleapis.com" in request.url:
                headers = await request.all_headers()
                auth = headers.get("authorization")
                if auth and "Bearer" in auth:
                    token = auth
                    token_found_event.set()
        
        
        page.on("request", handle_request)
        
        try:
            print("Navigating to Whisk...")
            await page.goto("https://labs.google/whisk", timeout=45000)
            
            # 1. Wait for Network Capture
            try:
                await asyncio.wait_for(token_found_event.wait(), timeout=20.0)
            except asyncio.TimeoutError:
                print("Network capture timeout. Trying LocalStorage/Cookies fallback...")
            
            # 2. LocalStorage Fallback (Common in some Google apps, though Whisk uses internal auth)
            if not token:
                try:
                    # Execute script to try to find token in common storage locations
                    # This is speculative for Labs
                    pass 
                except: pass

        except Exception as e:
            print(f"Navigation/Extraction error: {e}")
        finally:
            await browser.close()
            
    return token

if __name__ == "__main__":
    # If run as script, print token to stdout
    cookies_file = r"c:\autokim\cookies.json" # Default path
    if len(sys.argv) > 1:
        cookies_file = sys.argv[1]
        
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        token = loop.run_until_complete(harvest_token(cookies_file))
        if token:
            print(token) # Print ONLY the token for pipe usage
        else:
            sys.exit(1)
    except Exception as e:
        sys.exit(1)
