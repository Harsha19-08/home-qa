// Translation API configuration
const LIBRE_TRANSLATE_URL = 'https://libretranslate.de/translate';
const MYMEMORY_TRANSLATE_URL = 'https://api.mymemory.translated.net/get';

// Initialize Google Input Tools for transliteration
export const initializeTransliteration = async () => {
  try {
    // Only initialize if window.google is not already defined
    if (!window.google || !window.google.elements) {
      // Create script element
      const script = document.createElement('script');
      script.src = '//www.google.com/inputtools/js/jsapi.js';
      script.async = true;
      
      // Wait for script to load
      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });

      // Initialize input tools
      await new Promise((resolve) => {
        if (window.google && window.google.load) {
          window.google.load('inputtools', '1', {
            packages: ['inputtools'],
            callback: resolve
          });
        } else {
          resolve(); // Resolve anyway to prevent hanging
        }
      });
    }

    // Initialize transliteration after script is loaded
    if (window.google && window.google.elements && window.google.elements.inputtools) {
      const options = {
        sourceLanguage: 'en',
        destinationLanguage: ['te'],
        transliterationEnabled: true,
        shortcutKey: 'ctrl+g'
      };
      
      window.google.elements.inputtools.createTransliterator(options);
      return true;
    }
    return false;
  } catch (error) {
    console.warn('Transliteration initialization failed:', error);
    return false; // Fail gracefully
  }
};

// Handle input transliteration
export const handleInputTransliteration = async (text, setNewMessage) => {
  try {
    if (!window.google?.elements?.inputtools) {
      setNewMessage(text);
      return;
    }

    // Split text into words
    const words = text.split(' ');
    const lastWord = words[words.length - 1];

    // Only transliterate if there's text to process
    if (lastWord) {
      window.google.elements.inputtools.transliterate('te', lastWord, (result) => {
        if (result && result[0] && result[0][1] && result[0][1].length > 0) {
          // Replace last word with transliterated text
          words[words.length - 1] = result[0][1][0];
          setNewMessage(words.join(' '));
        } else {
          setNewMessage(text);
        }
      });
    } else {
      setNewMessage(text);
    }
  } catch (error) {
    console.warn('Transliteration failed:', error);
    setNewMessage(text);
  }
};

// Detect language of text
export const detectLanguage = (text) => {
  // Simple language detection based on Unicode ranges
  const teluguRange = /[\u0C00-\u0C7F]/;
  return teluguRange.test(text) ? 'te' : 'en';
};

// Timeout promise
const timeoutPromise = (ms) => new Promise((_, reject) => 
  setTimeout(() => reject(new Error('Request timed out')), ms)
);

// Function to retry failed requests
const retryWithBackoff = async (fn, retries = 3, backoff = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, backoff * Math.pow(2, i)));
    }
  }
};

// Request queue implementation
class TranslationQueue {
  constructor(concurrency = 2) {
    this.queue = [];
    this.running = 0;
    this.concurrency = concurrency;
  }

  async add(task) {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.running >= this.concurrency || this.queue.length === 0) {
      return;
    }

    this.running++;
    const { task, resolve, reject } = this.queue.shift();

    try {
      const result = await task();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.running--;
      this.processQueue();
    }
  }
}

// Create translation queues
const libreQueue = new TranslationQueue(2);
const myMemoryQueue = new TranslationQueue(2);

// Function to use LibreTranslate API with queue
const translateWithLibre = async (text, sourceLang, targetLang) => {
  const translation = async () => {
    const fetchWithTimeout = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(LIBRE_TRANSLATE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            q: text,
            source: sourceLang,
            target: targetLang,
            format: 'text',
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`LibreTranslate failed: ${response.statusText}`);
        }

        const data = await response.json();
        return data.translatedText;
      } catch (error) {
        if (error.name === 'AbortError') {
          throw new Error('Translation request timed out');
        }
        throw error;
      }
    };

    return retryWithBackoff(fetchWithTimeout);
  };

  return libreQueue.add(translation);
};

// Function to use MyMemory Translation API with queue
const translateWithMyMemory = async (text, sourceLang, targetLang) => {
  const translation = async () => {
    const fetchWithTimeout = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const langPair = `${sourceLang}|${targetLang}`;
        const url = `${MYMEMORY_TRANSLATE_URL}?q=${encodeURIComponent(text)}&langpair=${langPair}&de=your@email.com`;
        
        const response = await fetch(url, {
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`MyMemory translation failed: ${response.statusText}`);
        }

        const data = await response.json();
        if (data.responseStatus === 200 && data.responseData.translatedText) {
          return data.responseData.translatedText;
        }
        throw new Error('Invalid translation response');
      } catch (error) {
        if (error.name === 'AbortError') {
          throw new Error('Translation request timed out');
        }
        throw error;
      }
    };

    return retryWithBackoff(fetchWithTimeout);
  };

  return myMemoryQueue.add(translation);
};

// Main translation function with request queuing
export const translateText = async (text, targetLang) => {
  if (!text.trim()) return text;

  const sourceLang = targetLang === 'te' ? 'en' : 'te';
  let translationError = null;

  // Split long text into chunks
  const MAX_CHUNK_LENGTH = 500;
  const textChunks = text.match(new RegExp(`.{1,${MAX_CHUNK_LENGTH}}(\\s|$)`, 'g')) || [text];

  try {
    // Try LibreTranslate first with queued requests
    const translatedChunks = await Promise.all(
      textChunks.map(chunk => translateWithLibre(chunk, sourceLang, targetLang))
    );
    return translatedChunks.join('');
  } catch (error) {
    console.error('LibreTranslate error:', error);
    translationError = error;
  }

  try {
    // Try MyMemory as fallback with queued requests
    const translatedChunks = await Promise.all(
      textChunks.map(chunk => translateWithMyMemory(chunk, sourceLang, targetLang))
    );
    return translatedChunks.join('');
  } catch (error) {
    console.error('MyMemory translation error:', error);
    translationError = error;
  }

  console.error('All translation services failed:', translationError);
  return text;
}; 