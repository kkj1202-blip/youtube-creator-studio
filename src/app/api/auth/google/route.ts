
import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const pythonScript = path.join(process.cwd(), 'python-core', 'services', 'auth_helper.py');
    const pythonCmd = 'python'; // Or use specific venv path if needed

    console.log('[Auth] Starting Python auth helper...');
    
    return new Promise((resolve) => {
      // Use 'shell: true' for better Windows compatibility if needed, 
      // but 'python' usually works if in PATH.
      const process = spawn(pythonCmd, [pythonScript], { 
          stdio: ['ignore', 'pipe', 'pipe'], // Ignore stdin to prevent hanging
          detached: false 
      });
      
      let stdoutData = '';
      let stderrData = '';

      process.stdout.on('data', (data) => {
        const str = data.toString();
        // Log only important info to avoid flooding dev console which might crash it
        if (str.includes('Cookie found') || str.includes('Starting')) {
             console.log('[Python Log]', str.trim());
        }
        stdoutData += str;
      });

      process.stderr.on('data', (data) => {
        console.error('[Python Err]', data.toString());
        stderrData += data.toString();
      });

      // Handle process launch error (e.g. python not found)
      process.on('error', (err) => {
         console.error('[Spawn Error]', err);
         resolve(NextResponse.json({ success: false, error: 'Failed to launch Python script', details: String(err) }, { status: 500 }));
      });

      process.on('close', (code) => {
        console.log(`[Auth] Script exited with code ${code}`);
        if (code !== 0) {
          resolve(NextResponse.json({ success: false, error: 'Script failed or was closed', details: stderrData || 'No error details' }, { status: 500 }));
          return;
        }

        // Parse Output
        const startMarker = '---COOKIE_START---';
        const endMarker = '---COOKIE_END---';
        const startIndex = stdoutData.indexOf(startMarker);
        const endIndex = stdoutData.indexOf(endMarker);

        if (startIndex !== -1 && endIndex !== -1) {
          const jsonStr = stdoutData.substring(startIndex + startMarker.length, endIndex).trim();
          try {
             // Validate JSON
             JSON.parse(jsonStr);
             resolve(NextResponse.json({ success: true, cookies: jsonStr }));
          } catch (e) {
             resolve(NextResponse.json({ success: false, error: 'Invalid JSON output from script' }, { status: 500 }));
          }
        } else {
          resolve(NextResponse.json({ success: false, error: 'Cookie not found in output' }, { status: 500 }));
        }
      });
    });
  } catch (error) {
    console.error('[Route Error]', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
