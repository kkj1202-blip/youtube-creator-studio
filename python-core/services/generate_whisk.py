import asyncio
from playwright.async_api import async_playwright
import json
import os
import sys
import argparse
import base64
import time
import uuid
import shutil

# Re-use the robust path finding logic
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

async def generate_images(prompt, cookies_path, output_dir, count=1, reference_image=None, subject=None, style=None, composition=None, headless=False, filename=None):
    # Wrapper to call harvest...
    await harvest_whisk_credits_and_token(prompt, cookies_path, output_dir, count, subject, style, composition, reference_image, headless=headless, filename=filename)

async def harvest_whisk_credits_and_token(prompt, cookies_path, output_dir, count=1, subject=None, style=None, composition=None, reference_image=None, headless=False, filename=None):
    # DEBUG: Print received arguments for reference images
    print(f"[Reference Debug] subject={subject}")
    print(f"[Reference Debug] style={style}")
    print(f"[Reference Debug] composition={composition}")
    print(f"[Reference Debug] reference_image={reference_image}")
    
    # Consolidate reference images for processing
    references_to_upload_paths = []
    if subject: references_to_upload_paths.append(subject)
    if composition: references_to_upload_paths.append(composition)
    if style: references_to_upload_paths.append(style)
    if reference_image: references_to_upload_paths.append(reference_image) # For backward compatibility or general reference

    chrome_path = find_chrome_path()
    
    async with async_playwright() as p:
        launch_args = []
        
        # Use a stable profile to persist Auth/Cookies, but CLEAN LOCKS first
        user_data_dir = os.path.join(os.getenv('TEMP'), 'playwright_chrome_stable_v2')
        print(f"DEBUG: Using stable profile dir: {user_data_dir}")

        # Lock Busting: Remove SingletonLock if it exists to prevent 'hanging'
        lock_file = os.path.join(user_data_dir, 'SingletonLock')
        if os.path.exists(lock_file):
            print("Found stale SingletonLock, removing...")
            try:
                os.remove(lock_file)
            except Exception as e:
                print(f"Warning: Could not remove lock file: {e}")
        
        input_ignore_default_args = ["--enable-automation"]
        
        # KEY FIX: Force HEADFUL mode only if NOT explicitly requested headless
        # But we obey the argument now to support "API-like" background mode.
        # headless = False (Removed forced override)
        
        # Always remove --no-sandbox because we are now always in headful (user-facing) mode
        # to ensure no warning bar appears.
        input_ignore_default_args.append("--no-sandbox")

        browser = await p.chromium.launch_persistent_context(
            user_data_dir=user_data_dir,
            executable_path=chrome_path,
            headless=headless,
            args=launch_args,
            ignore_default_args=input_ignore_default_args,
            viewport=None
        )
        
        page = browser.pages[0] if browser.pages else await browser.new_page()
        
        # Stealth
        await page.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")

        # --- API TOKEN CAPTURE (For API Mode) ---
        # Captures the Whisk generation request to enable fast API mode
        async def on_request(request):
            url = request.url
            method = request.method
            url_lower = url.lower()
            
            # Only capture the main Whisk generation request
            # URL pattern: https://aisandbox-pa.googleapis.com/v1/whisk:generateImage
            if method == "POST" and "whisk" in url_lower and ("generate" in url_lower or "batchexecute" in url_lower):
                try:
                    # Ignore telemetry
                    if "play-log" in url or "clearcut" in url: 
                        return

                    post_data = request.post_data
                    
                    if post_data:
                        # Save ONLY the main generation request for API mode
                        api_creds = {
                            "url": url,
                            "headers": dict(request.headers),
                            "payload": post_data,
                            "captured_at": int(time.time() * 1000)
                        }
                        
                        # Save to FIXED location for API mode to read
                        api_debug_path = r"c:\autokim\public\uploads\api_debug.json"
                        with open(api_debug_path, "w", encoding="utf-8") as f:
                            json.dump(api_creds, f, indent=2, ensure_ascii=False)
                        print(f"[Token Capture] Saved API credentials to {api_debug_path}")
                                
                except Exception as e:
                    pass

        page.on("request", on_request)
        # -------------------

        # Set cookies
        # Set cookies
        try:
            cookies = []
            if os.path.exists(cookies_path):
                with open(cookies_path, 'r', encoding='utf-8') as f:
                    cookies = json.load(f)
            else:
                # Fallback: maybe it's a raw string?
                try:
                    cookies = json.loads(cookies_path)
                except:
                    print(f"Cookie file not found: {cookies_path}")
                    
            formatted_cookies = []
            for c in cookies:
                cookie = {
                    'name': c.get('name'),
                    'value': c.get('value'),
                    'domain': c.get('domain'),
                    'path': c.get('path', '/'),
                    'secure': c.get('secure', True),
                    'httpOnly': c.get('httpOnly', True),
                    'sameSite': c.get('sameSite', 'Lax')
                }
                # Playwright complains if fields are None, so filter them
                cookie = {k: v for k, v in cookie.items() if v is not None}
                formatted_cookies.append(cookie)
                
            if formatted_cookies:
                await browser.add_cookies(formatted_cookies)
                
        except Exception as e:
            print(f"Cookie Error: {e}")
            await browser.close()
            return

        try:
            # DIRECT URL FOUND VIA SEARCH: https://labs.google/fx/tools/whisk
            # This bypasses the main landing page generic button issues.
            target_url = "https://labs.google/fx/tools/whisk"
            print(f"Navigating directly to Tool URL: {target_url}")
            await page.goto(target_url, timeout=60000)
            
            # Handler for Redirects (e.g. if it defaults to Library)
            print("Checking page state...")
            try:
                # 1. Check if we are on Library page (User reported this issue)
                if "library" in page.url:
                    print("Detected 'Library' page (Wrong turn). Redirecting to Tool...")
                    # Try clicking "Create" first as it mimics user behavior
                    create_btn = await page.wait_for_selector('a[href*="/tools/whisk"], button:has-text("Create New"), a[href$="/tool"]', timeout=3000)
                    if create_btn:
                         await create_btn.click()
                    else:
                         # Force goto
                         await page.goto(target_url, timeout=30000)
                
                # 2. Check for Landing Page "Open Tool"
                print("Looking for Entry Button (Landing Page)...")
                try:
                    # Broaden the scope: Look for ANY button/link that looks like a "Start" action
                    # '도구 열기', 'Open tool', 'Get started', 'Try it now'
                    entry_selectors = [
                        'button:has-text("도구 열기")', 'a:has-text("도구 열기")',
                        'button:has-text("Open tool")', 'a:has-text("Open tool")',
                        'button:has-text("Try Whisk")', 'a:has-text("Try Whisk")'
                    ]
                    
                    found_entry = False
                    for sel in entry_selectors:
                        try:
                            btn = await page.wait_for_selector(sel, timeout=2000)
                            if btn and await btn.is_visible():
                                print(f"Found Entry Button: {sel}")
                                await btn.click()
                                found_entry = True
                                break
                        except: continue
                    
                    if not found_entry:
                        print("Standard selectors failed. Trying JS Force Click...")
                        # Javascript fallback: find any element with '도구 열기' text and click it
                        clicked = await page.evaluate("""() => {
                            const targets = Array.from(document.querySelectorAll('button, a, div[role="button"]'));
                            const btn = targets.find(el => el.innerText.includes('도구 열기') || el.innerText.includes('Open tool'));
                            if (btn) {
                                btn.click();
                                return true;
                            }
                            return false;
                        }""")
                        if clicked:
                            print("JS Force Click successful.")
                    
                    await page.wait_for_load_state('networkidle')

                except Exception as e:
                    print(f"Navigation check info: {e}")
            except Exception as e:
                print(f"Outer navigation check warning: {e}")

            # --- LOGIN CHECK (CRITICAL) ---
            print("Checking for Login/Auth redirection...")
            try:
                # Common Google Login indicators
                login_selectors = [
                    'h1:has-text("Sign in")', 'h1:has-text("로그인")',
                    'div[role="heading"]:has-text("Sign in")',
                    'input[type="email"]',
                    'text="Choose an account"',
                    'a[href*="accounts.google.com"]'
                ]
                for sel in login_selectors:
                    if await page.query_selector(sel):
                        print("CRITICAL: Redirected to Login Page. Cookies might be expired.")
                        print(json.dumps({"error": "LOGIN_REQUIRED"}))
                        # Take screenshot of login page
                        await page.screenshot(path=os.path.join(output_dir, "login_required.png"))
                        sys.exit(1)
            except Exception as e:
                # If sys.exit(1) triggered, this catch might catch it? No, SystemExit is BaseException.
                # But just in case
                 if isinstance(e, SystemExit): raise e
                 print(f"Login check warning: {e}")
            # ------------------------------

            # --- POPUP / AD KILLER ---
            print("Checking for popups/ads...")
            try:
                # Common selectors for Google Labs/Generic modals
                popup_selectors = [
                    'button:has-text("닫기")', 'button[aria-label="닫기"]',
                    'button:has-text("Agree")', 'button:has-text("Dong-ui")', 'button:has-text("동의")',
                    'button:has-text("Got it")', 'button:has-text("확인")',
                    'button:has-text("Continue")', 'button:has-text("계속")',
                    'button:has-text("No thanks")', 'button:has-text("괜찮습니다")',
                    'div[role="dialog"] button[aria-label="Close"]',
                    'div[role="dialog"] button:has-text("Close")'
                ]
                
                # Check for popups for a few seconds (they might animate in)
                for _ in range(3): 
                    for selector in popup_selectors:
                        try:
                            # Short timeout for checking each
                            btn = await page.wait_for_selector(selector, timeout=500)
                            if btn and await btn.is_visible():
                                print(f"Dismissing popup: {selector}")
                                await btn.click()
                                await page.wait_for_timeout(500) # Wait for dismissal
                        except:
                            continue
                    await page.wait_for_timeout(500)
            except Exception as e:
                print(f"Popup check warning: {e}")
            # -------------------------

            # Wait for textarea (The main indicator we are in the tool)
            print("Waiting for prompt input (textarea)...")
            try:
                textarea = await page.wait_for_selector('textarea', timeout=30000) # Increased to 30s
            except:
                print("Textarea not found immediately. Looking for 'Start Creating' buttons...")
                start_btn = await page.wait_for_selector('button:has-text("Create"), button:has-text("Start")', timeout=10000) # Increased to 10s
                if start_btn:
                    await start_btn.click()
                    textarea = await page.wait_for_selector('textarea', timeout=30000)
                else:
                    raise Exception("Could not find prompt input field")
            
            # --- INPUT PROMPT INTO TEXTAREA ---
            print(f"Filling prompt: {prompt[:50]}...")
            await textarea.fill(prompt)
            await page.wait_for_timeout(1000)  # Wait for UI to update
            
            # --- REFERENCE IMAGE UPLOAD (ROBUST TRIPLE SLOT ENGINE) ---
            references_to_upload = []
            if subject: references_to_upload.append(("Subject", subject, ["피사체", "Subject", "Person"]))
            if composition: references_to_upload.append(("Composition", composition, ["장면", "Scene", "Composition", "Background"]))
            if (style): references_to_upload.append(("Style", style, ["스타일", "Style", "Vibe"]))
            
             # References processing
            # Start fresh with new list based on args
            # (Lines 33-38 in previous edit already consolidated them into references_to_upload_paths)
            
            if references_to_upload:
                print(f"Processing {len(references_to_upload)} reference images...")
                
                # Find ALL file inputs first to analyze the layout
                all_inputs = await page.query_selector_all('input[type="file"]')
                print(f"DEBUG: detected {len(all_inputs)} file inputs on page.")

                for i, (ref_type, ref_path, keywords) in enumerate(references_to_upload):
                    if not os.path.exists(ref_path):
                        print(f"ERROR: File not found: {ref_path}")
                        continue
                    
                    print(f"Processing {ref_type} upload: {os.path.basename(ref_path)}")
                    uploaded = False
                    
                    # Strategy 1: Find by matching labels
                    for kw in keywords:
                        try:
                            # Try to find a element that contains the keyword and has a file input nearby
                            # We look for a container div that has the text and an input[type="file"] inside
                            target_input = await page.query_selector(f'div:has-text("{kw}") >> input[type="file"]')
                            if not target_input:
                                # Fallback: find the element with text, then find the sibling/parent input
                                label_el = await page.query_selector(f'text="{kw}"')
                                if label_el:
                                    # Search up to 3 levels up for an input
                                    curr = label_el
                                    for _ in range(3):
                                        curr = await curr.query_selector('xpath=..')
                                        if not curr: break
                                        target_input = await curr.query_selector('input[type="file"]')
                                        if target_input: break

                            if target_input:
                                await target_input.set_input_files(ref_path)
                                print(f"SUCCESS: Uploaded {ref_type} via label '{kw}'")
                                print("DEBUG: Uploaded. Waiting 20s for Whisk analysis...")
                                await page.wait_for_timeout(20000)
                                uploaded = True
                                break
                        except: continue
                    
                    # Strategy 2: Order-based fallback (Subject:0, Scene:1, Style:2)
                    if not uploaded:
                        slot_idx = i if i < len(all_inputs) else (i % 3 if len(all_inputs) >= 3 else 0)
                        if slot_idx < len(all_inputs):
                            try:
                                await all_inputs[slot_idx].set_input_files(ref_path)
                                print(f"SUCCESS: Uploaded {ref_type} via slot index {slot_idx}")
                                print("DEBUG: Uploaded. Waiting 20s for Whisk analysis...")
                                await page.wait_for_timeout(20000)
                                uploaded = True
                            except Exception as e:
                                print(f"Index upload failed: {e}")

                    # Strategy 3: Click-and-Choose fallback
                    if not uploaded:
                        try:
                            # 1. Check if a Dialog/Modal is ALREADY open
                            dialog = await page.query_selector('div[role="dialog"]')
                            
                            if dialog and await dialog.is_visible():
                                print("DEBUG: Reference dialog is detected as OPEN. Searching inside...")
                                file_input = await dialog.query_selector('input[type="file"]')
                                if file_input:
                                    print("DEBUG: Found hidden file input in dialog! Setting files directly...")
                                    await file_input.set_input_files(ref_path)
                                    print("DEBUG: Uploaded. Waiting 20s for Whisk analysis...")
                                    await page.wait_for_timeout(20000)
                                    uploaded = True
                                else:
                                    upload_btn_selectors = [
                                        'button:has-text("Upload")', 'button:has-text("업로드")',
                                        'div[role="button"]:has-text("Upload")', 'div[role="button"]:has-text("업로드")',
                                        'button[aria-label*="Upload"]', 'div[class*="upload"]'
                                    ]
                                    for btn_sel in upload_btn_selectors:
                                        btn = await dialog.query_selector(btn_sel)
                                        if btn and await btn.is_visible():
                                            print(f"DEBUG: Clicking upload button in dialog: {btn_sel}")
                                            async with page.expect_file_chooser(timeout=15000) as fc_info:
                                                await btn.click()
                                            file_chooser = await fc_info.value
                                            await file_chooser.set_files(ref_path)
                                            print("DEBUG: Uploaded. Waiting 20s for Whisk analysis...")
                                            await page.wait_for_timeout(20000)
                                            uploaded = True
                                            break
                            
                            # 2. If NOT uploaded yet (Dialog wasn't open or failed), try opening it
                            if not uploaded:
                                print(f"DEBUG: Dialog not open or failed. Attempting to open Ref menu {i}...")
                                candidate_selectors = [
                                    'button[aria-label*="Reference"]', 'button[aria-label="Ref"]',
                                    'button:has-text("Reference")', 'button:has-text("Start with image")',
                                    'button:has-text("이미지")', 'button:has(svg):has-text("Ref")'
                                ]
                                
                                for sel in candidate_selectors:
                                    candidates = await page.query_selector_all(sel)
                                    visible_candidates = [c for c in candidates if await c.is_visible()]
                                    
                                    if len(visible_candidates) > i:
                                        print(f"DEBUG: Clicking main Ref button via '{sel}' index {i}")
                                        try:
                                            async with page.expect_file_chooser(timeout=10000) as fc_info:
                                                await visible_candidates[i].click()
                                            await fc_info.value.set_files(ref_path)
                                            print("DEBUG: Uploaded. Waiting 20s for Whisk analysis...")
                                            await page.wait_for_timeout(20000)
                                            uploaded = True
                                            break
                                        except:
                                            print("DEBUG: Clicked but no immediate file chooser. Checking for new input/modal...")
                                            await page.wait_for_timeout(2000)
                                            file_input = await page.query_selector('input[type="file"]')
                                            if file_input:
                                                 await file_input.set_input_files(ref_path)
                                                 print("DEBUG: Uploaded. Waiting 20s for Whisk analysis...")
                                                 await page.wait_for_timeout(20000)
                                                 uploaded = True
                                                 break
                                            
                        except Exception as e:
                            print(f"DEBUG: Complex upload strategy failed: {e}")
                            pass

                        # --- VISUAL VERIFICATION STEP ---
                        if uploaded:
                             print(f"Verifying upload for {ref_type}...")
                             await page.wait_for_timeout(3000) # Give it time to render thumbnail
                             
                             preview_imgs = await page.query_selector_all('div[role="dialog"] img, div[class*="reference"] img, img[alt*="Reference"]')
                             if len(preview_imgs) > 0:
                                 print(f"VERIFIED: Found {len(preview_imgs)} reference thumbnails in UI.")
                             else:
                                 print(f"WARNING: Upload reported success but no visual thumbnail found for {ref_type}.")
                        else:
                            print(f"FAILED to upload {ref_type} - No strategy worked.")
    
                        # --- DIALOG CLOSING & RESET STEP (SAFER VERSION) ---
                        if uploaded:
                            # If a dialog is still open, we MUST close it so the next reference can be clicked
                            try:
                                dialog = await page.query_selector('div[role="dialog"]')
                                if dialog and await dialog.is_visible():
                                    print("DEBUG: Dialog still open after upload. Closing it...")
                                    # Try clicking a generic "Done", "Confirm", "Close" button
                                    close_btn = await dialog.query_selector('button:has-text("Done"), button:has-text("Confirm"), button[aria-label="Close"]')
                                    if close_btn:
                                        await close_btn.click()
                                    else:
                                        # Fallback: Press Escape
                                        await page.keyboard.press("Escape")
                                    await page.wait_for_timeout(1000)
                            except:
                                pass

                        if uploaded:
                            print(f"Waiting 20s for {ref_type} processing (Whisk analysis)...")
                            await page.wait_for_timeout(20000)
                        else:
                            print(f"CRITICAL ERROR: Failed to upload {ref_type} reference.")

            # =============================================================
            # --- PRE-GENERATION CHECK (CRITICAL) ---
            # =============================================================
            # Take a screenshot right before generating to PROVE references are there
            try:
                debug_verify_path = os.path.join(output_dir, "debug_references_before_generate.png")
                await page.screenshot(path=debug_verify_path)
                print(f"DEBUG: Saved pre-generation verification screenshot: {debug_verify_path}")
            except: pass

            # =============================================================
            # --- GENERATION LOGIC (ALWAYS RUNS, REGARDLESS OF REFERENCES) ---
            # =============================================================
            
            # --- PRE-GENERATION BLOB SCAN ---
            # To prevent scraping old images as "Result", scan before clicking generate
            try:
                existing_blobs = await page.evaluate('''() => {
                    return Array.from(document.querySelectorAll('img[src^="blob:"]')).map(img => img.src);
                }''')
                print(f"DEBUG: Found {len(existing_blobs)} existing blobs (to ignore).")
            except:
                existing_blobs = []
                print("DEBUG: Could not scan existing blobs, using empty list.")
            existing_blob_set = set(existing_blobs)

            # Click Generate - ROBUST STRATEGY
            print("Submitting prompt...")
            # RE-FOCUS TEXTAREA (Critical Fix for "Stuck after Upload")
            try:
                textarea = await page.wait_for_selector('textarea', state='visible', timeout=5000)
                await textarea.click(force=True)
                print("Refocused textarea.")
            except:
                print("Warning: Could not re-focus textarea. Trying to proceed anyway...")

            # Try finding the submit button
            submit_clicked = False
            submit_btn = None
            try:
                submit_btn = await page.wait_for_selector(
                     'button[aria-label*="Generate"], button[aria-label*="Create"], button[aria-label*="Send"], button:has(svg) >> visible=true', 
                    timeout=5000
                )
                
                if submit_btn:
                     btn_text = await submit_btn.inner_text()
                     # Avoid clicking "Upload" buttons by mistake
                     if "Upload" not in btn_text and "plus" not in await submit_btn.inner_html():
                        await submit_btn.click()
                        submit_clicked = True
                        print("Clicked Submit Button.")
            except Exception as e:
                print(f"Button click failed: {e}")

            if not submit_clicked:
                print("Falling back to Enter key...")
                val = await textarea.input_value()
                if not val:
                    await textarea.fill(prompt)
                await textarea.press("Enter")
            
            print("Waiting for generation (looking for NEW blobs)...")
            generation_success = False
            
            # PRODUCTION GRADE TIMEOUT: 180s (Whisk can be slow)
            for wait_tick in range(180): 
                # Smart Retry: If 30 seconds passed and no new images, click generate again
                if wait_tick == 30 and not generation_success:
                     print("DEBUG: Generation taking too long. Clicking 'Generate' again (Retry Strategy)...")
                     try:
                         if submit_btn and await submit_btn.is_visible():
                             await submit_btn.click()
                         else:
                             await textarea.press("Enter")
                     except: pass

                # Check errors
                error_selectors = [
                    'text="Policy violation"', 'text="Safety guidelines"', 
                    'text="Something went wrong"', 'text="Unable to generate"',
                    'div[role="alert"]', 'span:has-text("policy")'
                ]
                for sel in error_selectors:
                    try:
                        error_el = await page.query_selector(sel)
                        if error_el and await error_el.is_visible():
                            error_text = await error_el.inner_text()
                            print(json.dumps({"error": f"WHISK_POLICY_VIOLATION: {error_text}"}))
                            sys.exit(1)
                    except: continue
                
                # Check for NEW images
                current_blobs = await page.evaluate('''() => {
                    return Array.from(document.querySelectorAll('img[src^="blob:"]')).map(img => img.src);
                }''')
                
                # Filter for ones we haven't seen
                new_blobs = [b for b in current_blobs if b not in existing_blob_set]
                
                if len(new_blobs) > 0:
                    print(f"DEBUG: Detected {len(new_blobs)} NEW generated images!")
                    generation_success = True
                    break
                    
                await page.wait_for_timeout(1000)
            
            # --- END GENERATION WAIT LOOP ---

            # Scrape ONLY new images
            await page.wait_for_timeout(3000) # Wait for high-res load

            print("Extracting images...")
            # Pass the existing set to the evaluator to filter
            images_data = await page.evaluate(f'''async (existingSrcs) => {{
                const existingSet = new Set(existingSrcs);
                const images = Array.from(document.querySelectorAll('img'));
                
                // Filter: Must be blob/data AND NOT in the existing set
                const candidates = images.filter(img => {{
                    const isBlob = img.src.startsWith('blob:') || img.src.startsWith('data:');
                    if (!isBlob) return false;
                    return !existingSet.has(img.src);
                }});
                
                const results = [];
                for (const img of candidates) {{
                    if (img.width < 200) continue; 
                    try {{
                        const response = await fetch(img.src);
                        const blob = await response.blob();
                        const reader = new FileReader();
                        const dataUrl = await new Promise(resolve => {{
                            reader.onloadend = () => resolve(reader.result);
                            reader.readAsDataURL(blob);
                        }});
                        results.push(dataUrl);
                    }} catch (e) {{ console.error(e); }}
                }}
                return results;
            }}''', existing_blobs)
            
            saved_files = []
            if not os.path.exists(output_dir):
                os.makedirs(output_dir)

            for i, data_url in enumerate(images_data):
                if not data_url: continue
                header, encoded = data_url.split(",", 1)
                data = base64.b64decode(encoded)
                
                ext = "png"
                if "jpeg" in header: ext = "jpg"
                if "webp" in header: ext = "webp"
                
                filename = f"whisk_{uuid.uuid4()}.{ext}"
                filepath = os.path.join(output_dir, filename)
                
                with open(filepath, "wb") as f:
                    f.write(data)
                
                saved_files.append(f"/uploads/{filename}")
            
            # Filter to unique contents or just return all (user can select)
            # For now return all
            
            print("---RESULT_START---")
            print(json.dumps(saved_files))
            print("---RESULT_END---")
            sys.stdout.flush()  # Ensure output is captured by subprocess
            
        except Exception as e:
            print(f"Error during generation: {e}")
            # Take a screenshot of the error state
            try:
                error_shot = os.path.join(output_dir, f"error_state_{uuid.uuid4()}.png")
                await page.screenshot(path=error_shot)
                print(f"Saved error screenshot to {error_shot}")
            except: pass
            
            # Reduce fatal crashes by waiting
            print("CRITICAL: Browser kept open for debugging. Check the window.")
            # In production/automation we might want to close, but for now we need to see why it fails
            # await asyncio.sleep(10) 
            sys.exit(1) # FORCE EXIT CODE 1 ON FAILURE
            
        finally:
             if browser:
                print("Closing browser in 5 seconds (Automation Complete)...")
                await asyncio.sleep(5)
                try:
                    await browser.close()
                except: pass

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--prompt", required=True)
    parser.add_argument("--cookies", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--count", type=int, default=1, help="Number of images to generate")
    parser.add_argument("--reference_image", action='append', help="Path to reference image local file (legacy)")
    parser.add_argument("--subject", help="Path to Subject reference image")
    parser.add_argument("--style", help="Path to Style reference image")
    parser.add_argument("--composition", help="Path to Composition/Scene reference image")
    parser.add_argument("--headless", action="store_true", help="Run in headless mode")
    parser.add_argument("--filename", help="Specific filename for the output (optional)")
    args = parser.parse_args()
    
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(generate_images(
        args.prompt, args.cookies, args.output, args.count, 
        args.reference_image, args.subject, args.style, args.composition,
        headless=args.headless, filename=args.filename
    ))
