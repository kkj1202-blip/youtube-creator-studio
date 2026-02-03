import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

// Helper function to run Python script and capture output
async function runPythonScript(pythonCmd: string, args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve) => {
        const child = spawn(pythonCmd, args, {
            env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
            shell: false
        });
        let stdout = '';
        let stderr = '';
        
        // Handle encoding explicitly
        child.stdout.setEncoding('utf8');
        child.stderr.setEncoding('utf8');
        
        child.stdout.on('data', (data: string) => { stdout += data; });
        child.stderr.on('data', (data: string) => { stderr += data; });
        
        child.on('close', (exitCode) => {
            resolve({ stdout, stderr, exitCode: exitCode ?? 1 });
        });
    });
}


export async function POST(req: Request) {
  try {
    const { 
        prompt, 
        cookies, 
        count = 1, 
        referenceImageUrls = [], 
        referenceImages = null,
        subject = null,
        style = null,
        composition = null
    } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }
    
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    const pythonCmd = 'python';
    
    // Check if references are provided (forces DOM mode)
    const hasReferences = subject || style || composition || (referenceImages && referenceImages.length > 0);
    
    // =============================================================
    // TRY API MODE FIRST (Fast, no browser needed)
    // =============================================================
    if (!hasReferences) {
        const apiCredsPath = path.join(process.cwd(), 'public', 'uploads', 'api_debug.json');
        
        if (fs.existsSync(apiCredsPath)) {
            console.log('[Whisk Route] Attempting API mode first...');
            
            const apiScriptPath = path.join(process.cwd(), 'python-core', 'services', 'generate_whisk_api.py');
            const apiArgs = [
                apiScriptPath,
                '--prompt', prompt,
                '--output', uploadDir,
                '--creds', apiCredsPath
            ];
            
            console.log('[Whisk Route] API Mode Args:', apiArgs.join(' '));
            
            const apiResult = await runPythonScript(pythonCmd, apiArgs);
            
            // Parse API result
            try {
                const apiOutput = apiResult.stdout.trim();
                // Match JSON object (using \s\S instead of 's' flag for compatibility)
                const jsonMatch = apiOutput.match(/\{[\s\S]*\}/);
                
                if (jsonMatch) {
                    const result = JSON.parse(jsonMatch[0]);
                    
                    if (result.success && result.image_path) {
                        // API SUCCESS!
                        const relativePath = result.image_path.replace(/.*public/, '').replace(/\\/g, '/');
                        console.log('[Whisk Route] API Mode SUCCESS:', relativePath);
                        return NextResponse.json({ 
                            images: [relativePath], 
                            success: true,
                            mode: 'API'
                        });
                    }
                    
                    // Check for fallback triggers
                    if (result.error === 'CREDENTIALS_EXPIRED' || result.error?.includes('CREDENTIALS')) {
                        console.log('[Whisk Route] API credentials expired, falling back to DOM mode...');
                    } else if (result.error) {
                        console.log('[Whisk Route] API error:', result.error, '- falling back to DOM mode...');
                    }
                }
            } catch {
                console.log('[Whisk Route] API output parse failed, falling back to DOM mode...');
            }
        } else {
            console.log('[Whisk Route] No API credentials found, using DOM mode directly.');
        }
    } else {
        console.log('[Whisk Route] References detected, using DOM mode directly (API does not support references).');
    }

    // =============================================================
    // FALLBACK: DOM MODE (Browser automation)
    // =============================================================
    console.log('[Whisk Route] Using DOM mode...');

    // 1. Resolve Cookie Path
    // Priority: 1. cookies.json in root (Global) 2. Temp file from payload
    let cookiesPath = path.join(process.cwd(), 'cookies.json');
    let usingTempCookies = false;

    if (!fs.existsSync(cookiesPath)) {
        if (cookies) {
            // Write temporary cookies file
            const tempDir = os.tmpdir();
            cookiesPath = path.join(tempDir, `whisk_cookies_${Date.now()}.json`);
            const cookieContent = typeof cookies === 'string' ? cookies : JSON.stringify(cookies);
            fs.writeFileSync(cookiesPath, cookieContent);
            usingTempCookies = true;
        } else {
            return NextResponse.json({ error: 'No cookies found. Please save cookies in checking.' }, { status: 400 });
        }
    }

    // 2. Prepare Python Command
    const scriptPath = path.join(process.cwd(), 'python-core', 'services', 'generate_whisk.py');
    
    // Helper to resolve local paths
    const getLocalPath = (url?: string) => {
        if (!url) return null;
        if (url.startsWith('/uploads/')) {
            return path.join(process.cwd(), 'public', url.replace(/^\//, ''));
        }
        // If it's an absolute path that exists
        if (fs.existsSync(url)) return url;
        return null; 
    };

    const args = [
        scriptPath,
        '--prompt', prompt,
        '--output', uploadDir,
        '--cookies', cookiesPath,
        '--count', String(count),
        '--headless' // Always force headless for user experience
    ];

    // References
    const subjectPath = getLocalPath(referenceImages?.subject) || (referenceImageUrls[0] ? getLocalPath(referenceImageUrls[0]) : null);
    const stylePath = getLocalPath(referenceImages?.style);
    const compositionPath = getLocalPath(referenceImages?.composition);

    if (subjectPath) args.push('--subject', subjectPath);
    if (stylePath) args.push('--style', stylePath);
    if (compositionPath) args.push('--composition', compositionPath);

    console.log('[Whisk Route] Spawning:', 'python', args.join(' '));

    // 3. Execute
    const child = spawn(pythonCmd, args);

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => { stdout += data.toString(); });
    child.stderr.on('data', (data) => { stderr += data.toString(); });

    const exitCode = await new Promise((resolve) => {
        child.on('close', resolve);
    });

    // Cleanup temp cookies
    if (usingTempCookies && fs.existsSync(cookiesPath)) {
        try { fs.unlinkSync(cookiesPath); } catch { /* ignore */ }
    }

    if (exitCode !== 0) {
        console.error('[Whisk Route] Python Script Failed:', stderr);
        // Try to find specific error messages
        let errorMessage = 'Generation Script Failed';
        if (stderr.includes('Cookie Error')) errorMessage = 'Cookie Login Failed';
        if (stderr.includes('Timeout')) errorMessage = 'Browser Timeout';
        
        return NextResponse.json({ 
            error: errorMessage, 
            details: stderr,
            stdout: stdout 
        }, { status: 500 });
    }

    // 4. Parse Output
    const startMarker = '---RESULT_START---';
    const endMarker = '---RESULT_END---';
    const sIdx = stdout.indexOf(startMarker);
    const eIdx = stdout.indexOf(endMarker);

    if (sIdx !== -1 && eIdx !== -1) {
        const jsonStr = stdout.substring(sIdx + startMarker.length, eIdx).trim();
        try {
            const images = JSON.parse(jsonStr);
            return NextResponse.json({ images, success: true, mode: 'DOM' });
        } catch {
            return NextResponse.json({ error: 'Failed to parse JSON result', details: stdout }, { status: 500 });
        }
    } else {
        return NextResponse.json({ error: 'No structured result found', details: stdout }, { status: 500 });
    }

  } catch (error: unknown) {
    console.error('[Whisk Route Error]', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
