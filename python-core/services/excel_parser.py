import pandas as pd
import json
import os

def parse_storyboard(file_path):
    """
    Parses the Excel storyboard and returns a list of scene objects.
    Expected columns: 'Timecode', 'Content' (or '주요 내용'), 'Whisk Prompt'
    """
    try:
        df = pd.read_excel(file_path)
        
        # Normalize column names (strip whitespace, lower case match)
        df.columns = [str(c).strip() for c in df.columns]
        
        # Identify critical columns
        prompt_col = None
        content_col = None
        time_col = None
        
        for col in df.columns:
            if "prompt" in col.lower() and "whisk" in col.lower():
                prompt_col = col
            elif "content" in col.lower() or "내용" in col:
                content_col = col
            elif "time" in col.lower() or "시간" in col:
                time_col = col
        
        if not prompt_col:
            raise ValueError(f"Could not find 'Whisk Prompt' column in {df.columns}")
            
        scenes = []
        for idx, row in df.iterrows():
            prompt = str(row[prompt_col]) if pd.notna(row[prompt_col]) else ""
            content = str(row[content_col]) if content_col and pd.notna(row[content_col]) else ""
            timecode = str(row[time_col]) if time_col and pd.notna(row[time_col]) else f"{idx}"
            
            if not prompt.strip():
                continue
                
            scenes.append({
                "id": f"scene_{idx+1}",
                "index": idx + 1,
                "timecode": timecode,
                "content": content,
                "prompt": prompt,
                "status": "pending"
            })
            
        return scenes
        
    except Exception as e:
        print(f"Excel parsing error: {e}")
        return []

import sys

if __name__ == "__main__":
    if len(sys.argv) > 1:
        # CLI Mode (Production)
        file_path = sys.argv[1]
        if not os.path.exists(file_path):
            print(json.dumps({"error": "File not found"}))
            sys.exit(1)
            
        scenes = parse_storyboard(file_path)
        print(json.dumps(scenes, ensure_ascii=False))
    else:
        # Test Mode
        dummy_data = {
        "Timecode": ["00:00:00", "00:00:05"],
        "주요 내용": ["Intro", "Action"],
        "Whisk Prompt (영문)": ["A cat on a roof", "A dog in a park"]
    }
    df = pd.DataFrame(dummy_data)
    test_path = "test_storyboard.xlsx"
    df.to_excel(test_path, index=False)
    
    print("Testing parser...")
    scenes = parse_storyboard(test_path)
    print(json.dumps(scenes, indent=2, ensure_ascii=False))
    
    # Cleanup
    if os.path.exists(test_path):
        os.remove(test_path)
