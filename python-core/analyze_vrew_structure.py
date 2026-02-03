import zipfile
import json
import os

if __name__ == "__main__":
    try:
        with zipfile.ZipFile('c:\\autokim\\0130.vrew', 'r') as z:
            if 'project.json' in z.namelist():
                with z.open('project.json') as f:
                    data = json.load(f)
                    
                    print("\n[FILES SAMPLE]")
                    if 'files' in data and len(data['files']) > 0:
                        print(json.dumps(data['files'][0], indent=2, ensure_ascii=False))
                    
                    print("\n[TRANSCRIPT KEYS]")
                    if 'transcript' in data:
                        print(data['transcript'].keys())

                    print("\n[TEMPLATE DATA TO COPY]")
                    template_keys = ['version', 'props', 'globalEffects', 'styles', 'remixInfos']
                    for k in template_keys:
                        if k in data:
                            print(f"--- {k} ---")
                            # print(json.dumps(data[k], indent=2, ensure_ascii=False)) # Commented out to reduce noise
                        else:
                            print(f"MISSING: {k}")
                    
                    print("\n[DOC INFO]")
                    if 'docInfo' in data:
                        print(json.dumps(data['docInfo'], indent=2, ensure_ascii=False))
            else:
                print("project.json not found")

    except Exception as e:
        print(f"Error: {e}")
