import zipfile
import json
import os

file_path = r"c:\autokim\0130.vrew"

try:
    with zipfile.ZipFile(file_path, 'r') as zip_ref:
        if 'project.json' in zip_ref.namelist():
            with zip_ref.open('project.json') as f:
                data = json.load(f)
                
                print("=== Project Meta ===")
                print(f"Version: {data.get('version')}")
                
                print("\n=== Files (Assets) ===")
                files = data.get('files', [])
                print(f"Total Files: {len(files)}")
                for i, file in enumerate(files):
                    print(f"[{i}] Name: {file.get('name')}")
                    print(f"    Type: {file.get('type')}")
                    print(f"    Path: {file.get('path')}")
                    print(f"    RelativePath: {file.get('relativePath')}")
                    print(f"    FileLocation: {file.get('fileLocation')}")
                    print(f"    SourceOrigin: {file.get('sourceOrigin')}")
                
                print("\n=== Scenes (First 1) ===")
                scenes = data.get('transcript', {}).get('scenes', [])
                for i, scene in enumerate(scenes[:1]):
                    print(f"Scene {i}: ID={scene.get('id')}")
                    for clip in scene.get('clips', [])[:2]:
                        print(f"  - Clip: {clip.get('id')}")
                    print("  - Captions:", len(scene.get('captions', [])))
                    
        else:
            print("project.json not found inside zip")

except Exception as e:
    print(f"Error: {e}")
