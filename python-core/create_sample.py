import pandas as pd
import os

def create_sample_excel():
    data = {
        "Timecode": ["00:00:00", "00:00:05", "00:00:10"],
        "Content": [
            "Scene 1: Intro - Dark city street", 
            "Scene 2: Protagonist enters", 
            "Scene 3: Close up of face"
        ],
        "Whisk Prompt": [
            "Cinematic, dark city street at night, wet pavement, neon lights, highly detailed, photorealistic, 8k",
            "A man in a trench coat walking, back view, mysterious atmosphere, dynamic lighting",
            "Extreme close up, man's face, determination, rain drops on face, pores visible, shallow depth of field"
        ]
    }
    
    df = pd.DataFrame(data)
    
    # Save to public downloads folder so it can be accessed
    output_dir = r"c:\autokim\public\downloads"
    os.makedirs(output_dir, exist_ok=True)
    
    output_path = os.path.join(output_dir, "sample_storyboard.xlsx")
    df.to_excel(output_path, index=False)
    print(f"Sample Excel created at: {output_path}")

if __name__ == "__main__":
    create_sample_excel()
