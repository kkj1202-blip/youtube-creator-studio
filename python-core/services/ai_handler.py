
import os
from openai import OpenAI
from elevenlabs.client import ElevenLabs

class AIHandler:
    def __init__(self):
        self._openai = None
        self._eleven = None

    @property
    def openai(self):
        if not self._openai:
            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key:
                print("Warning: OPENAI_API_KEY not found.")
                return None
            self._openai = OpenAI(api_key=api_key)
        return self._openai

    @property
    def eleven(self):
        if not self._eleven:
            api_key = os.getenv("ELEVENLABS_API_KEY")
            if not api_key:
                print("Warning: ELEVENLABS_API_KEY not found.")
                return None
            self._eleven = ElevenLabs(api_key=api_key)
        return self._eleven


    def transcribe(self, audio_path, api_key=None):
        client = OpenAI(api_key=api_key) if api_key else self.openai
        if not client:
            raise ValueError("OpenAI API Key not provided (env or header)")
            
        with open(audio_path, "rb") as audio_file:
            transcript = client.audio.transcriptions.create(
                model="whisper-1", 
                file=audio_file,
                response_format="verbose_json",
                timestamp_granularities=["word"]
            )
        return transcript

    def translate(self, text, target_lang="ja", tone="casual", api_key=None):
        client = OpenAI(api_key=api_key) if api_key else self.openai
        if not client:
            raise ValueError("OpenAI API Key not provided (env or header)")

        # Specialized Persona for Japanese Localization
        if target_lang == "ja":
            system_prompt = (
                "You are a top-tier Japanese YouTuber (20s, energetic, trendsetter). "
                "Your task is to RE-WRITE the following Korean text into natural, viral Japanese. "
                "CRITICAL RULES:\n"
                "1. DO NOT translate literally. Adapt the underlying MEANING to Japanese internet culture.\n"
                "2. Use natural sentence endings (～だよ, ～じゃん, ～でしょ) matching a high-energy vibe.\n"
                "3. Use Japanese slang/memes (e.g., 草, 尊い, エモい, ww) where appropriate for emotion.\n"
                "4. Maintain the original emotional peaks but express them in a Japanese way.\n"
                "5. Optimize for 'Audio Flow' - strictly avoid stiff written-style Japanese.\n"
                "6. If the source is boring, make it exciting."
            )
        else:
            system_prompt = f"You are a trendy YouTuber in {target_lang}. Translate naturally using local memes and casual tone."

        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": text}
            ]
        )
        return response.choices[0].message.content

    def generate_voice(self, text, voice_id="JBFqnCBsd6RMkjVDRZzb", api_key=None): # Default Adam voice
        """
        Generate audio using ElevenLabs.
        Returns: Audio bytes generator or bytes
        """
        client = ElevenLabs(api_key=api_key) if api_key else self.eleven
        if not client:
            raise ValueError("ElevenLabs API Key not provided (env or header)")

        try:
            audio_generator = client.text_to_speech.convert(
                text=text,
                voice_id=voice_id,
                model_id="eleven_multilingual_v2"
            )
            # Collect all chunks into a single byte array
            audio_data = b"".join(chunk for chunk in audio_generator)
            return audio_data
        except Exception as e:
            print(f"ElevenLabs TTS Error: {e}")
            raise e

ai_handler = AIHandler()
