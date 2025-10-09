// services/ttsService.ts

// A queue to hold the parts of the text to be spoken.
let utteranceQueue: SpeechSynthesisUtterance[] = [];
// The utterance currently being spoken or about to be spoken.
let currentUtterance: SpeechSynthesisUtterance | null = null;

// Callbacks provided by the component for the entire speech operation.
let externalCallbacks: {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
} = {};

// Cache for the voice loading promise to ensure it only runs once.
let voicePromise: Promise<SpeechSynthesisVoice | null> | null = null;

/**
 * Reliably loads and finds the Persian voice from the browser's available voices.
 * This handles the asynchronous nature of voice loading and caches the result.
 * @returns A promise that resolves to the SpeechSynthesisVoice object or null if not found.
 */
const getPersianVoice = (): Promise<SpeechSynthesisVoice | null> => {
    if (voicePromise) {
        return voicePromise;
    }
    
    if (!('speechSynthesis' in window)) {
        voicePromise = Promise.resolve(null);
        return voicePromise;
    }

    voicePromise = new Promise((resolve) => {
        let isResolved = false;
        let fallbackTimeout: number | null = null;

        const findAndResolve = () => {
            if (isResolved) return;

            const voices = window.speechSynthesis.getVoices();
            if (voices.length > 0) {
                isResolved = true;
                const foundVoice = voices.find(v => v.lang === 'fa-IR') || voices.find(v => v.lang.startsWith('fa-')) || null;
                resolve(foundVoice);
                // Clean up
                if (fallbackTimeout) clearTimeout(fallbackTimeout);
                window.speechSynthesis.onvoiceschanged = null;
            }
        };

        // Check if voices are already loaded
        const initialVoices = window.speechSynthesis.getVoices();
        if (initialVoices.length > 0) {
            findAndResolve();
            return;
        }

        // If not, wait for the event
        window.speechSynthesis.onvoiceschanged = findAndResolve;

        // Fallback timeout in case the event doesn't fire
        fallbackTimeout = window.setTimeout(() => {
             console.warn("TTS voice loading timed out. Trying to find voice anyway.");
             findAndResolve();
             // If still not resolved, fail gracefully
             if (!isResolved) {
                 resolve(null);
             }
        }, 1500);
    });

    return voicePromise;
};


/**
 * Splits a long text into smaller chunks suitable for the TTS engine.
 * Tries to split by sentence-ending punctuation first, then by other punctuation,
 * and finally by word boundaries if a chunk is still too long.
 * @param text The text to chunk.
 * @returns An array of text chunks.
 */
const chunkText = (text: string): string[] => {
  const MAX_CHUNK_LENGTH = 200; // Max length for each chunk.
  const chunks: string[] = [];

  if (text.length <= MAX_CHUNK_LENGTH) {
    return [text];
  }

  // Use a regex to split into sentences. This is more robust than just splitting by '.'.
  const sentences = text.match(/[^.!?]+[.!?]*|[^.!?\n]+(?:\n|$)/g) || [];

  for (const sentence of sentences) {
    if (sentence.length <= MAX_CHUNK_LENGTH) {
      chunks.push(sentence.trim());
    } else {
      // If a sentence is too long, split it by words.
      let currentChunk = '';
      const words = sentence.split(' ');
      for (const word of words) {
        if ((currentChunk + ' ' + word).length > MAX_CHUNK_LENGTH) {
          chunks.push(currentChunk.trim());
          currentChunk = word;
        } else {
          currentChunk += ' ' + word;
        }
      }
      if (currentChunk.trim().length > 0) {
        chunks.push(currentChunk.trim());
      }
    }
  }

  return chunks.filter(c => c); // Filter out any empty chunks
};


/**
 * The core function that dequeues and speaks the next utterance.
 */
const speakNextChunk = () => {
    if (utteranceQueue.length === 0) {
        // All chunks have been spoken.
        if (externalCallbacks.onEnd) externalCallbacks.onEnd();
        currentUtterance = null;
        return;
    }

    currentUtterance = utteranceQueue.shift()!;
    
    currentUtterance.onend = () => {
        // When one chunk finishes, speak the next one.
        speakNextChunk();
    };

    currentUtterance.onerror = (event) => {
        let errorMsg = `An error occurred during speech synthesis: ${event.error}`;
        // Provide a more user-friendly error for the common 'synthesis-failed' case.
        if (event.error === 'synthesis-failed') {
            errorMsg = "خطایی در موتور تولید گفتار مرورگر شما رخ داد. لطفاً صفحه را رفرش کرده و دوباره امتحان کنید.";
        }
        console.error(`TTS Error: ${event.error}`, event);
        if (externalCallbacks.onError) externalCallbacks.onError(errorMsg);
        // Stop processing the rest of the queue on error.
        ttsService.stop();
    };

    window.speechSynthesis.speak(currentUtterance);
};


interface SpeakOptions {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

export const ttsService = {
  speak: async (text: string, { onStart, onEnd, onError }: SpeakOptions = {}): Promise<void> => {
    // Stop any currently playing speech and clear the queue.
    ttsService.stop();

    if (!('speechSynthesis' in window)) {
      const errorMsg = "متاسفانه مرورگر شما از قابلیت گفتار پشتیبانی نمی‌کند.";
      console.error(errorMsg);
      if (onError) onError(errorMsg);
      return;
    }

    if (!text.trim()) {
      if (onEnd) onEnd();
      return;
    }

    // Store the external callbacks.
    externalCallbacks = { onStart, onEnd, onError };

    // Wait for the Persian voice to be loaded reliably.
    const loadedVoice = await getPersianVoice();

    const hasPersianChars = /[\u0600-\u06FF]/.test(text);
    if (hasPersianChars && !loadedVoice) {
        const errorMsg = "صدای فارسی برای تولید گفتار در مرورگر شما یافت نشد.";
        console.warn(errorMsg);
        if (onError) onError(errorMsg);
        return;
    }
    
    const textChunks = chunkText(text);
    
    utteranceQueue = textChunks.map(chunk => {
        const utterance = new SpeechSynthesisUtterance(chunk);
        utterance.lang = 'fa-IR';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        if (loadedVoice) {
            utterance.voice = loadedVoice;
        }
        return utterance;
    });
    
    if (utteranceQueue.length > 0) {
        if (externalCallbacks.onStart) externalCallbacks.onStart();
        speakNextChunk();
    } else if (externalCallbacks.onEnd) {
         externalCallbacks.onEnd();
    }
  },

  stop: (): void => {
    if ('speechSynthesis' in window) {
      utteranceQueue = [];
      externalCallbacks = {};
      
      if (currentUtterance) {
          // Nullify callbacks before cancelling to prevent onend from firing unexpectedly.
          currentUtterance.onstart = null;
          currentUtterance.onend = null;
          currentUtterance.onerror = null;
          currentUtterance = null;
      }
      window.speechSynthesis.cancel();
    }
  },
};