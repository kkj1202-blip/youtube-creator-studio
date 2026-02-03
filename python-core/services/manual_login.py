import asyncio
from playwright.async_api import async_playwright
import json
import os
import sys

# Reused from generate_whisk.py
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

async def manual_login():
    chrome_path = find_chrome_path()
    if not chrome_path:
        print("Chrome not found!")
        return

    # Use the SAME stable profile as generate_whisk.py
    user_data_dir = os.path.join(os.getenv('TEMP'), 'playwright_chrome_stable_v2')
    
    # Lock Busting for Manual Login too
    lock_file = os.path.join(user_data_dir, 'SingletonLock')
    if os.path.exists(lock_file):
        try:
            os.remove(lock_file)
            print("Removed stale lock file.")
        except: pass

    print(f"Launching Browser for Login (Profile: {user_data_dir})")
    print("Please Login to Google in the opened window.")
    
    async with async_playwright() as p:
        browser = await p.chromium.launch_persistent_context(
            user_data_dir=user_data_dir,
            executable_path=chrome_path,
            headless=False, # HEADFUL
            args=[],
            ignore_default_args=["--enable-automation", "--no-sandbox"],
            viewport=None
        )
        
        page = browser.pages[0] if browser.pages else await browser.new_page()
        
        # Stealth
        await page.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        
        try:
            await page.goto("https://labs.google/whisk")
        except:
            print("Navigation error (might be okay if user is logging in)...")
        
        print("Waiting for user to login... (Press Ctrl+C to abort)")
        
        # Wait until we see the "Create" button or similar tool interface
        try:
            # Wait up to 5 minutes
            await page.wait_for_selector('button:has-text("Create"), button:has-text("New"), a[href*="/create"]', timeout=300000)
            print("Login Detected! Saving cookies...")
        except:
            print("Timeout waiting for login. Saving whatever cookies we have...")

        # Save Cookies
        cookies = await browser.cookies()
        
        # Save to root c:\autokim\cookies.json
        save_path = os.path.join(os.getcwd(), 'cookies.json')
        # Also save to c:\autokim\cookies.json explicitly if cwd is different
        if not os.path.exists(save_path):
             save_path = r'c:\autokim\cookies.json'

        with open(save_path, 'w', encoding='utf-8') as f:
            json.dump(cookies, f, indent=2)
            
        print(f"✅ Cookies saved to {save_path}")
        print("You can close the browser now.")
        
        await asyncio.sleep(3)
        await browser.close()

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    asyncio.run(manual_login())
