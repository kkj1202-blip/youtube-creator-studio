import zipfile
import json
from pathlib import Path
import os

# 0201.vrew에서 오디오 파일을 추출해서 테스트용 vrew 생성
# 이미지만 있는 케이스를 "Vrew에서 지원하는 형식"으로 변환

with zipfile.ZipFile('0201.vrew', 'r') as zf:
    # project.json 로드
    with zf.open('project.json') as f:
        data = json.loads(f.read().decode('utf-8'))
    
    # 이미지 로드
    img_data = zf.read('media/39777b91-eead-4cfc-b7f9-76302d41795a.png')
    
    # 오디오 로드
    audio_data = zf.read('media/sLczG-3IxF.mp3')

# 오디오 없는 버전 만들기 (텍스트만)
no_audio_data = json.loads(json.dumps(data))  # deep copy

# files에서 오디오 제거
no_audio_data['files'] = [f for f in no_audio_data['files'] if f.get('type') != 'AVMedia']

# words에서 mediaId 제거
for scene in no_audio_data['transcript']['scenes']:
    for clip in scene.get('clips', []):
        for word in clip.get('words', []):
            if 'mediaId' in word:
                del word['mediaId']

# ttsClipInfosMap 비우기
no_audio_data['props']['ttsClipInfosMap'] = {}

# 새 ZIP 생성
with zipfile.ZipFile('test_no_audio.vrew', 'w', compression=zipfile.ZIP_STORED) as zf:
    zf.writestr('project.json', json.dumps(no_audio_data, ensure_ascii=False, separators=(',', ':')))
    zf.writestr('media/39777b91-eead-4cfc-b7f9-76302d41795a.png', img_data)

print("Created test_no_audio.vrew - 원본에서 오디오만 제거한 버전")

# 파일 목록 확인
with zipfile.ZipFile('test_no_audio.vrew', 'r') as zf:
    print("\n파일 목록:")
    for info in zf.infolist():
        print(f"  {info.filename}: {info.file_size} bytes")
