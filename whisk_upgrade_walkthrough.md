# Whisk Automation Upgrade Walkthrough

I have upgraded the Whisk integration with a new **Whisk Automation Pro** tool and enhanced backend capabilities.

## New Features

### 1. Whisk Automation Pro Tool
A dedicated interface for bulk image generation, accessible from the main toolbar (Zap icon).
- **Batch Processing:** Paste hundreds of prompts and generate them in sequence.
- **Dual Modes:**
  - **⚡ API Mode:** Uses a direct API approach (faster, runs in background).
  - **🐢 DOM Mode:** Uses the browser automation (slower, but "sees" what happens).
- **Filename Control:** Custom prefix and auto-numbering (e.g., `concept_art_001.jpg`).
- **Looping:** Generate multiple images per prompt (e.g., "3 images for each prompt").
- **Real-time Console:** View detailed logs of the process.

### 2. Backend Upgrades
- **Custom Filenames:** The backend now accepts a `filename` parameter to save files exactly as you want.
- **API Mode:** Added support for a lighter-weight execution path (`generate_whisk_api.py`) for faster processing.
- **Robust Queue:** The `generate-image-queued` endpoint now handles both modes and prevents browser crashes.

## How to Use

1. **Open the Tool:** Click the **Zap Icon** (⚡) in the bottom-left tool menu.
2. **Configure Settings:**
   - Select **Mode** (API recommended for speed).
   - Set **Images per Prompt** (e.g., 4 ranges).
   - Set **Save Folder** (defaults to `public/uploads/whisk_batch`).
3. **Enter Prompts:** Paste your list of prompts (one per line).
4. **Start:** Click **Start Automation**.
5. **Monitor:** Watch the progress bar and console logs.

## Technical Details

- **Frontend:** `src/components/tools/WhiskAutomation.tsx`
- **Backend:** `python-core/services/generate_whisk_api.py`, `python-core/main.py`
- **Integration:** `src/app/page.tsx`

## Verification
- Verified that the UI opens and closes.
- Verified that the Settings panel allows mode switching.
- Verified that the Backend accepts the new parameters (`mode`, `filename`).

### 3. Global Reference Images (Project Settings)
- **Problem:** Users had to upload reference images for every single scene.
- **Solution:** Added **"Whisk 전용 참조 이미지"** to Project Settings.
- **Benefit:** Upload Subject/Style/Composition references ONCE, and they are automatically applied to all scenes generated with Whisk.

### 4. Prompt Logic Customization (`src/lib/imageStyles.ts`)
- **Issue:** Reference images were causing "studio portrait" style outputs where the character excessively dominated the scene.
- **Fix:** 
    - Moved **Scene Description** to the very beginning of the prompt priority.
    - Added forced keywords (`Wide shot`, `Environmental view`) when references are used.
    - Softened character consistency instructions from "Use attached image" to "Blend naturally".
- **Result:** Scenes now prioritize the background/situation while keeping the character consistent but natural.

### 5. 참조 이미지를 위한 프록시 API 모드 (Proxy API Mode)
- **문제점:** 기존의 가벼운 "API 모드"는 단순 POST 요청 방식이라, 복잡한 UI 조작(파일 업로드)이 필요한 참조 이미지(피사체, 스타일, 구도) 기능을 지원하지 못했습니다.
- **해결책:** `generate_whisk_api.py` 내부에 **프록시 미들웨어**를 구현했습니다.
- **작동 원리:**
  1. API 요청에서 `참조 이미지`가 감지되면:
  2. 이전에 DOM 모드 실행 시 저장된 `api_debug.json`에서 유효한 쿠키를 추출합니다.
  3. 자동으로 **DOM 스크립트**(`generate_whisk.py`)를 **헤드리스 모드(화면 없음)**로 실행합니다.
  4. DOM 실행 결과를 파싱하여 백엔드가 기대하는 표준 API JSON 형식으로 변환해 반환합니다.
- **장점:** 이제 사용자는 "API 모드"를 켜둔 상태에서도 **참조 이미지**를 자유롭게 사용할 수 있습니다. 번거로운 브라우저 창 팝업 없이 백그라운드에서 처리가 가능합니다. 시스템은 텍스트 프롬프트에는 가벼운 API를, 참조 이미지가 필요할 때만 무거운 헤드리스 브라우저를 사용하여 효율적으로 작동합니다.

### 6. 프롬프트 및 참조 이미지 개선 (2025.01 기술 업데이트)
- **배경 우선 순위 강화 (Scene First):** 참조 이미지가 사용될 때 캐릭터 얼굴이 꽉 차는(얼빡샷) 현상을 해결했습니다.
    - `Wide angle shot`, `Environmental view`, `Background focus` 키워드를 프롬프트 최상단에 배치하고 가중치를 `:1.5`로 강화했습니다.
    - 캐릭터에 대해 `tiny character in distance` 지시어를 추가하여 배경 속에 자연스럽게 녹아들도록 유도했습니다.
- **멀티 레퍼런스 업로드 안정화:** 피사체/스타일/구도 3가지 이미지를 동시에 올릴 때 발생하는 UI 오류를 수정했습니다.
    - 각 이미지 업로드 후 **대화상자 강제 닫기** 로직을 추가하여 다음 업로드를 방해하지 않도록 했습니다.
    - 업로드 사이의 대기 로직을 개선하여 Whisk의 분석 시간을 충분히 확보했습니다.
