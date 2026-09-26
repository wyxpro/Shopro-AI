/**
 * Audio AI Service — SiliconFlow Integration
 * 语音识别: TeleAI/TeleSpeechASR
 * 语音合成: FunAudioLLM/CosyVoice2-0.5B
 */

const SILICONFLOW_API_KEY =
  (import.meta.env.VITE_SILICONFLOW_API_KEY as string) || "";

const SILICONFLOW_BASE_URL =
  (import.meta.env.VITE_SILICONFLOW_BASE_URL as string) ||
  "/siliconflow-api/v1";

export interface TranscriptionOptions {
  file: Blob | File;
  model?: string; // Default: 'TeleAI/TeleSpeechASR'
}

export interface SpeechOptions {
  input: string;
  voice?: string; // Default: 'fnlp/MOSS-TTSD-v0.5:alex'
  model?: string; // Default: 'FunAudioLLM/CosyVoice2-0.5B'
  response_format?: 'mp3' | 'wav' | 'opus';
  stream?: boolean;
}

/**
 * 将 Base64 字符串转换为 Blob (默认 WAV 格式)
 */
export function base64ToBlob(base64Data: string, contentType = 'audio/wav'): Blob {
  const cleanBase64 = base64Data.replace(/^data:audio\/\w+;base64,/, '');
  const byteCharacters = atob(cleanBase64);
  const byteArrays = [];
  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }
  return new Blob(byteArrays, { type: contentType });
}

/**
 * 语音转写 (ASR) - 基于 TeleAI/TeleSpeechASR 与 SenseVoiceSmall 自动降级模型
 */
export async function transcribeAudio(options: TranscriptionOptions): Promise<{ text: string }> {
  const { file, model = 'TeleAI/TeleSpeechASR' } = options;

  // 优先使用 Vite 代理端点，避免跨域 OPTIONS 预检 405
  const endpoints = [
    '/siliconflow-api/v1/audio/transcriptions',
    'https://api.siliconflow.cn/v1/audio/transcriptions',
  ];

  const modelsToTry = [model, 'FunAudioLLM/SenseVoiceSmall'];
  let lastError: Error | null = null;

  for (const endpoint of endpoints) {
    for (const currentModel of modelsToTry) {
      try {
        const formData = new FormData();
        const fileName = file instanceof File ? file.name : (file.type.includes('mp3') ? 'audio.mp3' : 'audio.wav');
        formData.append('file', file, fileName);
        formData.append('model', currentModel);

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${SILICONFLOW_API_KEY}`,
          },
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          return { text: data.text || '' };
        }

        const errText = await response.text().catch(() => '');
        lastError = new Error(`TeleSpeech ASR API error (${response.status}): ${errText || response.statusText}`);
      } catch (err) {
        lastError = err as Error;
      }
    }
  }

  throw lastError || new Error("TeleSpeech ASR 语音识别暂不可用，请稍后重试");
}

/**
 * 情感语音合成 (TTS) - 基于 FunAudioLLM/CosyVoice2-0.5B 模型
 */
export async function synthesizeSpeech(options: SpeechOptions): Promise<{ audioUrl: string; blob: Blob }> {
  const {
    input,
    voice = 'fnlp/MOSS-TTSD-v0.5:alex',
    model = 'FunAudioLLM/CosyVoice2-0.5B',
    response_format = 'mp3',
    stream = false,
  } = options;

  const endpoints = [
    'https://api.siliconflow.cn/v1/audio/speech',
    '/siliconflow-api/v1/audio/speech',
  ];

  let lastError: Error | null = null;

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SILICONFLOW_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          input,
          voice,
          response_format,
          stream,
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const audioUrl = URL.createObjectURL(blob);
        return { audioUrl, blob };
      }

      const errText = await response.text().catch(() => '');
      lastError = new Error(`CosyVoice2 TTS API error (${response.status}): ${errText || response.statusText}`);
    } catch (err) {
      lastError = err as Error;
    }
  }

  throw lastError || new Error("CosyVoice2 TTS synthesis failed.");
}
