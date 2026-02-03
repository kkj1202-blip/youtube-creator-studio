import zipfile
import json
import os
import sys

def inspect_vrew_file(file_path):
    print(f"Inspecting: {file_path}")
    
    if not os.path.exists(file_path):
        print("File not found.")
        return

    try:
        with zipfile.ZipFile(file_path, 'r') as zip_ref:
            # List all files in the ZIP
            print("\nFiles in archive:")
            file_list = zip_ref.namelist()
            for file in file_list:
                print(f"- {file}")
            
            # Try to read 'project.json'
            target_file = next((f for f in file_list if f.endswith('.json')), None)
            
            if target_file:
                print(f"\nReading content of: {target_file}")
                with zip_ref.open(target_file) as f:
                    content = f.read().decode('utf-8')
                    try:
                        data = json.loads(content)
                        
                        if 'version' in data:
                            print(f"Project Version: {data['version']}")
                        else:
                            print("Project Version: Not found")

                        if 'files' in data and len(data['files']) > 0:
                            print(f"Files count: {len(data['files'])}")
                            print(f"First file sample keys: {list(data['files'][0].keys())}")
                            # Dump ALL files to see if there's an image
                            with open("dump.json", "w", encoding="utf-8") as outfile:
                                json.dump(data['files'], outfile, indent=2)
                            print("Dumped all files to dump.json")
                        
                        if 'transcript' in data:
                            print("Transcript found.")
                            # Dump transcript
                            with open('dump_transcript.json', 'w', encoding='utf-8') as outfile:
                                json.dump(data['transcript'], outfile, indent=2)
                            print("Dumped transcript to dump_transcript.json")
                        else:
                             print("No transcript found")

                    except json.JSONDecodeError as e:
                        print(f"Invalid JSON content: {e}")
            else:
                print("\nNo project.json found.")

    except zipfile.BadZipFile:
        print("Error: Not a valid zip file")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    inspect_vrew_file("0201.vrew")
    # inspect_vrew_file("0130.vrew")
