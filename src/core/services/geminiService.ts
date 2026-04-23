import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

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

    const cleanJson = text.replace(/```json|```/g, "").trim();
    const data: GeneratedWords = JSON.parse(cleanJson);

    if (Object.keys(data).length === 0) {
      return { words: {}, usedFallback: true };
    }

    return { words: data, usedFallback: false };
  } catch (error) {
    console.error("Errore Gemini:", error);
    throw new Error("Impossibile generare le parole. Riprova.");
  }
}

export interface GenerateListResult {
  words: string[];
  usedFallback: boolean;
}

export async function generateWordsList(
  topic: string,
  count: number
): Promise<GenerateListResult> {
  const prompt = `Genera un array JSON di ${count} elementi sul tema: "${topic}".
REGOLE STRETTE:
1. Restituisci SOLO un array JSON di stringhe.
2. Ogni elemento può essere una parola, un nome proprio (persona, personaggio, luogo) o una breve frase (max 60 caratteri).
3. Devono essere riconoscibili dal pubblico generale italiano e indovinabili tramite domande sì/no.
4. Niente duplicati. Evita contenuti volgari o offensivi.
5. Adatta lo stile al tema: oggetti se il tema è "frutta", personaggi se il tema è "cartoni animati", ecc.

Esempio di formato:
["mela", "Spider-Man", "Roma", "pizza margherita", "Cleopatra"]

Rispondi solo con l'array JSON. Se non riesci a comprendere il tema, rispondi con [].`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const cleanJson = text.replace(/```json|```/g, "").trim();
    const data = JSON.parse(cleanJson);

    if (!Array.isArray(data) || data.length === 0) {
      return { words: [], usedFallback: true };
    }

    const cleaned = data
      .filter((w): w is string => typeof w === 'string')
      .map((w) => w.trim())
      .filter((w) => w.length > 0);

    if (cleaned.length === 0) {
      return { words: [], usedFallback: true };
    }

    return { words: cleaned, usedFallback: false };
  } catch (error) {
    console.error("Errore Gemini:", error);
    throw new Error("Impossibile generare le parole. Riprova.");
  }
}
