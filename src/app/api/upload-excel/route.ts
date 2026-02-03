import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save properly in public/uploads or a temp dir
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    try {
        await mkdir(uploadDir, { recursive: true });
    } catch (e) {}
    
    const filePath = path.join(uploadDir, file.name);
    await writeFile(filePath, buffer);

    // Call Python script to parse
    // python c:\autokim\python-core\services\excel_parser.py <file_path>
    // We need to modify parser to accept CLI arg if not yet supported, OR write a wrapper
    // Let's assume we invoke a wrapper or the script directly.
    // The previous python script had a `if __name__ == "__main__":` block but it was for testing.
    // We should probably modify python script to output JSON to stdout when run with an argument.
    
    const pythonScript = path.join(process.cwd(), 'python-core', 'services', 'excel_parser.py');
    const command = `python "${pythonScript}" "${filePath}"`; // We need to update python script to handle sys.argv
    
    // For now, let's just return success mockup to verify upload, 
    // BUT since I am an agent, I will update the python script in the next step to support CLI.
    
    // Actually I'll do it right now in my head: The python script needs to use sys.argv[1]
    
    // Implementing CLI call assuming python script is updated
    try {
        // We'll update python script to accept file path and print JSON
        // For this step, I'll write the API code that EXPECTS that behavior.
        const { stdout, stderr } = await execPromise(command);
        
        if (stderr) {
            console.warn("Python stderr:", stderr);
        }
        
        try {
            const scenes = JSON.parse(stdout);
            return NextResponse.json({ success: true, scenes });
        } catch (e) {
            console.error("Failed to parse Python output:", stdout);
            return NextResponse.json({ error: 'Failed to parse Excel data' }, { status: 500 });
        }
        
    } catch (error: any) {
        console.error("Python execution error:", error);
         return NextResponse.json({ error: error.message }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
