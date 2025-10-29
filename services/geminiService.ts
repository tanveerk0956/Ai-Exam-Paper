import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ExamSettings } from '../types';

interface ImagePart {
  inlineData: {
    mimeType: string;
    data: string;
  };
}

// Function to initialize GoogleGenAI client (will be called before each API request)
function getGeminiClient() {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY is not defined in the environment variables.");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
}

export async function analyzeImagesAndGenerateQuestions(
  images: File[],
  settings: ExamSettings,
): Promise<string> {
  const ai = getGeminiClient();

  // 1. Convert images to base64 parts
  const imageParts: ImagePart[] = await Promise.all(
    images.map(async (file) => {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
      });
      return {
        inlineData: {
          mimeType: file.type,
          data: base64,
        },
      };
    }),
  );

  // 2. Step A: Image Analysis & Topic Extraction
  // Use gemini-2.5-flash-image for multimodal input
  const analysisPrompt = `You are an expert educator. Analyze the provided images of textbook pages and exercises. Identify the main subject, specific topic, key concepts, and common question formats (e.g., definitions, problem-solving, diagrams, true/false) relevant to generating an exam paper for Class ${settings.className}, Board ${settings.board}. Return this information as a concise text summary of about 200 words, clearly stating the main topic and key areas covered.`;

  const partsForAnalysis: (ImagePart | { text: string })[] = [
    { text: analysisPrompt },
    ...imageParts,
  ];

  let analysisResponse: GenerateContentResponse;
  try {
    analysisResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image', // Multimodal model
      contents: { parts: partsForAnalysis },
      config: {
        maxOutputTokens: 500, // Enough for a concise summary
      },
    });
  } catch (error) {
    console.error("Error during image analysis:", error);
    throw new Error("Failed to analyze images. Please try again.");
  }
  const analysisSummary = analysisResponse.text || "No specific insights extracted from images.";
  console.log("Image Analysis Summary:", analysisSummary);

  // 3. Step B: Question Generation (MCQ, Short, Long)
  // Use gemini-2.5-pro for better reasoning in question generation
  const generationPrompt = `Based on the following topic: "${settings.topic}", class "${settings.className}", board "${settings.board}", and the following analysis of textbook content: "${analysisSummary}", generate an exam paper with the specified number of questions for each type.

    **Instructions:**
    1.  Generate exactly ${settings.mcqCount} Multiple Choice Questions. Each MCQ must have 4 distinct options (A, B, C, D) and explicitly state the correct answer at the end of the question (e.g., 'Correct Answer: A').
    2.  Generate exactly ${settings.shortCount} Short Answer Questions.
    3.  Generate exactly ${settings.longCount} Long Answer Questions.
    4.  Ensure questions are relevant to the provided topic and insights, and are appropriate for the specified class and board.
    5.  Format the output clearly, separating each question type with a heading.
    6.  Use the specified language: ${settings.language}.

    **Example Format:**
    ## Multiple Choice Questions (MCQs)
    1.  What is [concept A]?
        A) Option 1
        B) Option 2
        C) Option 3
        D) Option 4
        Correct Answer: B

    ## Short Answer Questions
    1.  Explain [concept B].

    ## Long Answer Questions
    1.  Discuss [topic C] in detail.
    `;

  let generationResponse: GenerateContentResponse;
  try {
    generationResponse = await ai.models.generateContent({
      model: 'gemini-2.5-pro', // Better for complex text generation
      contents: [{ text: generationPrompt }],
      config: {
        maxOutputTokens: 4096, // Sufficient tokens for a full exam
        temperature: 0.7, // Balance creativity and factual accuracy
        topP: 0.95,
        topK: 64,
        // No thinkingBudget required as we are using gemini-2.5-pro
      },
    });
  } catch (error: any) {
    console.error("Error during question generation:", error);
    // Specifically handle API key not found or invalid
    if (error.message && error.message.includes("Requested entity was not found.")) {
      await window.aistudio.openSelectKey(); // Prompt user to select API key
      throw new Error("API key might be invalid or not selected. Please select a valid key.");
    }
    // Fix: Use the 'error' variable instead of 'err'
    throw new Error(error.message || "Failed to generate questions. Please check your prompt or try again.");
  }

  return generationResponse.text;
}