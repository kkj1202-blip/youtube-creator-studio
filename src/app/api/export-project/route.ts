import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import * as XLSX from 'xlsx';
import { exec } from 'child_process';

export async function POST(req: Request) {
  try {
    const { project } = await req.json();

    if (!project || !project.name) {
      return NextResponse.json({ error: 'Invalid project data' }, { status: 400 });
    }

    // 1. Create Export Directory
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const exportFolderName = `${project.name}_${timestamp}`;
    const exportBaseDir = path.join(process.cwd(), 'public', 'exports');
    const exportDir = path.join(exportBaseDir, exportFolderName);
    const imagesDir = path.join(exportDir, 'images');

    if (!fs.existsSync(exportBaseDir)) fs.mkdirSync(exportBaseDir);
    if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir);
    if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir);

    // 2. Prepare Data for Excel
    const excelData = [];

    // 3. Process Scenes
    for (const scene of project.scenes) {
      let imageFileName = '';
      
      if (scene.imageUrl) {
        try {
            // Determine source path
            let sourcePath = '';
            if (scene.imageUrl.startsWith('/uploads/')) {
                sourcePath = path.join(process.cwd(), 'public', scene.imageUrl.replace(/^\//, ''));
            } else if (scene.imageUrl.startsWith('http')) {
                // If remote (pollinations), might need to download. 
                // For now, if it's external, we leave it as URL or try to fetch?
                // User wants "Local file". Let's try to simple copy if local.
            } else if (fs.existsSync(scene.imageUrl)) {
                 sourcePath = scene.imageUrl;
            }

            if (sourcePath && fs.existsSync(sourcePath)) {
                const ext = path.extname(sourcePath);
                imageFileName = `scene_${scene.order + 1}${ext}`;
                const destPath = path.join(imagesDir, imageFileName);
                fs.copyFileSync(sourcePath, destPath);
            }
        } catch (e) {
            console.error(`Failed to copy image for scene ${scene.order}`, e);
        }
      }

      excelData.push({
        'Scene Number': scene.order + 1,
        'Script (Text)': scene.script,
        'Image': imageFileName, // Relative path for portability? Or full? Vrew usually likes full or relative.
        // Vrew specific format often just text. 
        // But for generic export:
        'Prompt': scene.imagePrompt,
        'Image Path': imageFileName ? path.join('images', imageFileName) : ''
      });
    }

    // 4. Generate Excel
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Storyboard");
    
    const excelPath = path.join(exportDir, `${project.name}_storyboard.xlsx`);
    XLSX.writeFile(workbook, excelPath);

    // 5. Open Explorer (Windows)
    exec(`explorer "${exportDir}"`);

    return NextResponse.json({ 
        success: true, 
        path: exportDir,
        message: `Exported to ${exportFolderName}` 
    });

  } catch (error: any) {
    console.error('Export failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
