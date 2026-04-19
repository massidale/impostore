import { GoogleGenerativeAI } from "@google/generative-ai";
import wordsData from '../data/words.json';

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

const defaultWords: GeneratedWords = wordsData;

export interface GeneratedWords {
  [word: string]: string;
}

export interface GenerateResult {
  words: GeneratedWords;
  usedFallback: boolean;
}

export async function generateWordsForTopic(topic: string): Promise<GenerateResult> {
  const prompt = `Genera un oggetto JSON con 20 coppie "parola": "indizio" basate sull'argomento: "${topic}".
REGOLE STRETTE:
1. L'indizio deve essere composto da UNA SOLA PAROLA.
2. L'indizio deve essere attinente ma non troppo ovvio (es. "macchina": "ruote", "mare": "sale"). Più l'argomento è specifico, più l'indizio deve essere vago (per esempio se l'argomento è "Personaggi cattivi in harry potter" e la parola è "Draco Malfoy", l'indizio non può essere "biondo" o "giovane")
3. Le parole possono essere oggetti, nomi propri o concetti (es. "Harry Potter", "Pizza", "Internet").

Esempio di formato:
{
  "gatto": "peloso",
  "cane": "fedele",
  "casa": "abitazione",
  "albero": "foglie"
}

Rispondi solo con il JSON. Se non riesci a comprendere l'argomento, rispondi con un oggetto JSON vuoto.`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Pulizia del testo (a volte Gemini mette i backtick ```json)
    const cleanJson = text.replace(/```json|```/g, "").trim();
    const data: GeneratedWords = JSON.parse(cleanJson);

    // Se Gemini restituisce un JSON vuoto, usa le parole predefinite
    if (Object.keys(data).length === 0) {
      console.log("Gemini ha restituito un JSON vuoto, uso parole predefinite");
      return { words: defaultWords, usedFallback: true };
    }

    return { words: data, usedFallback: false };
  } catch (error) {
    console.error("Errore Gemini:", error);
    throw new Error("Impossibile generare le parole. Riprova.");
  }
}
