import asyncio
from playwright.async_api import async_playwright
import json
import os
import sys

def find_chrome_path():
    """Find the Google Chrome executable on Windows."""
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

async def get_google_cookies():
    print("Starting browser for Google Login...")
    
    chrome_path = find_chrome_path()
    if chrome_path:
        print(f"Found Chrome at: {chrome_path}")
    else:
        print("Chrome not found, falling back to bundled Chromium (might fail security check).")

    async with async_playwright() as p:
        # Launch args - Remove --no-sandbox to avoid "Malform Request" / "Unsupported Flag" errors
        launch_args = [
            '--disable-blink-features=AutomationControlled',
            '--start-maximized'
        ]
        
        # Use launch_persistent_context to better simulate a real user profile session
        # We use a temp dir for user_data to avoid locking the user's main profile
        user_data_dir = os.path.join(os.getenv('TEMP'), 'playwright_chrome_profile')
        
        try:
            browser_context = await p.chromium.launch_persistent_context(
                user_data_dir=user_data_dir,
                executable_path=chrome_path, # Use real Chrome
                headless=False,
                args=launch_args,
                ignore_default_args=["--enable-automation"],
                viewport=None
            )
        except Exception as e:
            print(f"Failed to launch Chrome: {e}")
            print("Retrying with bundled Chromium...")
            browser_context = await p.chromium.launch_persistent_context(
                user_data_dir=user_data_dir,
                headless=False,
                args=launch_args,
                channel="chrome",
                ignore_default_args=["--enable-automation"],
                viewport=None
            )

        page = browser_context.pages[0] if browser_context.pages else await browser_context.new_page()
        
        # STEALTH: Hide webdriver property
        await page.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });
        """)

        print("Navigating to Google Whisk...")
        try:
            # Navigate cleanly and existing redirects will handle login
            await page.goto("https://labs.google/whisk", timeout=60000)
        except Exception as e:
            print(f"Navigation error: {e}")

        print("Please log in to your Google account in the opened window.")
        print("Waiting for '__Secure-1PSID' cookie...")

        # Poll for cookie
        found_cookie = None
        for _ in range(300): # Wait up to 5 minutes
            try:
                cookies = await browser_context.cookies()
                for cookie in cookies:
                    if cookie['name'] == '__Secure-1PSID' and '.google.com' in cookie['domain']:
                        found_cookie = cookie
                        break
            except Exception as e:
                print(f"Polling error (User closed window?): {e}")
                break
            
            if found_cookie:
                print("Cookie found!")
                break
            
            await asyncio.sleep(1)
            
        if found_cookie:
            all_cookies = await browser_context.cookies()
            google_cookies = [c for c in all_cookies if 'google' in c['domain']]
            cookie_json = json.dumps(google_cookies)
            
            print(f"Successfully extracted {len(google_cookies)} cookies.")
            await browser_context.close()
            return cookie_json
        else:
            print("Timeout waiting for login.")
            await browser_context.close()
            return None

if __name__ == "__main__":
    # Remove explicit SelectorEventLoopPolicy as Playwright requires ProactorEventLoop (default on Windows)
    # if sys.platform == 'win32':
    #     asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    result = loop.run_until_complete(get_google_cookies())
    if result:
        print("---COOKIE_START---")
        print(result)
        print("---COOKIE_END---")
    else:
        print("FAILED")
