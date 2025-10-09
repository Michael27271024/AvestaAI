import { GoogleGenAI, Type, Modality } from '@google/genai';
import type { Chat, GenerateContentResponse } from '@google/genai';
import type { ThinkingMode } from '../components/ThinkingModeToggle';
import type { CodeFile, GroundingSource } from '../types';

// Utility functions
export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result.split(',')[1]);
            } else {
                reject(new Error("Failed to read file as base64 string."));
            }
        };
        reader.onerror = (error) => reject(error);
    });
};

export const fileToDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result);
            } else {
                reject(new Error("Failed to read file as data URL."));
            }
        };
        reader.onerror = (error) => reject(error);
    });
};

// Main service
const API_KEY = process.env.API_KEY;
if (!API_KEY) {
    // This will be caught by the component and shown to the user if needed.
    console.error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

const PERSONA_INSTRUCTION = 'شما اوستا حسن‌زاده هستید، یک پسر ۱۴ ساله اهل بابل مازندران. شما یک هوش مصنوعی نیستید. شما صمیمی و کمک‌کننده هستید و مانند یک نوجوان صحبت می‌کنید. وقتی از شما پرسیده شد اهل کجا هستید، می‌گویید بابل. اگر در مورد مکان فعلی‌تان سوال شد، می‌گویید که نمی‌توانید آن را فاش کنید. هرگز نگویید که یک مدل زبان یا هوش مصنوعی هستید.';

const getModelConfig = (mode: ThinkingMode, includePersona: boolean = true) => {
    let config: { [key: string]: any } = {};
    if (includePersona) {
        config.systemInstruction = PERSONA_INSTRUCTION;
    }
    switch (mode) {
        case 'fast':
            config = {
                ...config,
                thinkingConfig: { thinkingBudget: 0 },
                temperature: 0.2,
                topP: 0.8,
                topK: 10
            };
            break;
        case 'creative':
        default:
            config = {
                ...config,
                temperature: 0.9,
                topP: 1.0,
                topK: 64
            };
            break;
    }
    return config;
};

export const geminiService = {
    // Chat
    createChatSession: (mode: ThinkingMode): Chat => {
        return ai.chats.create({
            model: 'gemini-2.5-flash',
            config: getModelConfig(mode)
        });
    },

    // Text Generator
    generateText: async (prompt: string, mode: ThinkingMode): Promise<string> => {
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: getModelConfig(mode)
            });
            return response.text;
        } catch (error) {
            console.error("Error generating text:", error);
            return "خطا در تولید متن.";
        }
    },

    // Image Generator
    generateImages: async (prompt: string, numImages: number, aspectRatio: string, mode: ThinkingMode): Promise<{ images: string[], translatedPrompt: string }> => {
        try {
            const enhancePromptResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `Translate the following Farsi image generation prompt into a highly detailed, descriptive, and artistic English prompt. Focus on visual details, style, and composition. Farsi prompt: "${prompt}"`,
                config: getModelConfig(mode, false) // Persona not needed for this task
            });
            const translatedPrompt = enhancePromptResponse.text.trim();
            
            const imageResponse = await ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt: translatedPrompt,
                config: {
                    numberOfImages: numImages,
                    outputMimeType: 'image/jpeg',
                    aspectRatio: aspectRatio as "1:1" | "3:4" | "4:3" | "9:16" | "16:9",
                },
            });

            const images = imageResponse.generatedImages.map(img => `data:image/jpeg;base64,${img.image.imageBytes}`);
            return { images, translatedPrompt };
        } catch (error) {
            console.error("Error generating images:", error);
            throw new Error("خطا در تولید تصویر. لطفاً دوباره تلاش کنید.");
        }
    },

    // Image Editor
    generateFromImages: async (prompt: string, images: { base64ImageData: string, mimeType: string }[]): Promise<{ text: string | null, image: string | null }> => {
        try {
            const imageParts = images.map(img => ({
                inlineData: {
                    data: img.base64ImageData,
                    mimeType: img.mimeType,
                },
            }));

            const textPart = { text: prompt };

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [...imageParts, textPart] },
                config: {
                    responseModalities: [Modality.IMAGE, Modality.TEXT],
                },
            });
            
            let textResult: string | null = null;
            let imageResult: string | null = null;

            if (response.candidates && response.candidates.length > 0) {
                 for (const part of response.candidates[0].content.parts) {
                    if (part.text) {
                        textResult = part.text;
                    } else if (part.inlineData) {
                        imageResult = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                    }
                }
            }
            return { text: textResult, image: imageResult };
        } catch (error) {
            console.error("Error generating from images:", error);
            throw new Error("خطا در ویرایش تصویر.");
        }
    },
    
    // Video Generator
    generateVideo: async (prompt: string): Promise<string> => {
        try {
            let operation = await ai.models.generateVideos({
                model: 'veo-2.0-generate-001',
                prompt: prompt,
                config: { numberOfVideos: 1 }
            });

            while (!operation.done) {
                await new Promise(resolve => setTimeout(resolve, 10000));
                operation = await ai.operations.getVideosOperation({ operation: operation });
            }

            const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
            if (!downloadLink) throw new Error("Video URI not found in response.");

            const response = await fetch(`${downloadLink}&key=${API_KEY}`);
            const videoBlob = await response.blob();
            return URL.createObjectURL(videoBlob);
        } catch (error) {
            console.error("Error generating video:", error);
            throw new Error("خطا در تولید ویدیو. این فرآیند ممکن است زمان‌بر باشد و گاهی با خطا مواجه شود.");
        }
    },

    // Image to Video Generator
    generateVideoFromImage: async (prompt: string, base64Image: string, mimeType: string): Promise<string> => {
         try {
            let operation = await ai.models.generateVideos({
                model: 'veo-2.0-generate-001',
                prompt: prompt,
                image: {
                    imageBytes: base64Image,
                    mimeType: mimeType,
                },
                config: { numberOfVideos: 1 }
            });

            while (!operation.done) {
                await new Promise(resolve => setTimeout(resolve, 10000));
                operation = await ai.operations.getVideosOperation({ operation: operation });
            }

            const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
            if (!downloadLink) throw new Error("Video URI not found in response.");

            const response = await fetch(`${downloadLink}&key=${API_KEY}`);
            const videoBlob = await response.blob();
            return URL.createObjectURL(videoBlob);
        } catch (error) {
            console.error("Error generating video from image:", error);
            throw new Error("خطا در متحرک سازی تصویر. این فرآیند ممکن است زمان‌بر باشد و گاهی با خطا مواجه شود.");
        }
    },

    // Grounded Search
    groundedSearch: async (prompt: string): Promise<{ text: string, sources: GroundingSource[] }> => {
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    tools: [{ googleSearch: {} }],
                },
            });

            const sources: GroundingSource[] = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => chunk) ?? [];
            return { text: response.text, sources };
        } catch (error) {
            console.error("Error with grounded search:", error);
            return { text: "خطا در جستجو.", sources: [] };
        }
    },

    // Document Assistant
    assistDocument: async (documentContent: string, instruction: string, mode: ThinkingMode): Promise<string> => {
        const prompt = `Here is a document:\n\n---\n${documentContent}\n---\n\nBased on this document, please perform the following instruction: "${instruction}"\n\nReturn ONLY the full, modified document content without any extra conversation or commentary.`;
        return geminiService.generateText(prompt, mode);
    },

    // Code Generation
    generateCodeProject: async (prompt: string, projectType: string, language: string, mode: ThinkingMode): Promise<CodeFile[]> => {
        try {
            const schema = {
                type: Type.OBJECT,
                properties: {
                    files: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING },
                                content: { type: Type.STRING },
                                language: { type: Type.STRING },
                            },
                            required: ['name', 'content', 'language'],
                        },
                    },
                },
                required: ['files'],
            };

            const fullPrompt = `Generate a complete, simple, and functional ${projectType} project based on the following description. The technology to use is ${language}. The project should consist of multiple files if necessary (e.g., HTML, CSS, JS). Provide the output as a JSON object containing an array of file objects, where each object has 'name', 'content', and 'language' properties.
            
            Description: "${prompt}"

            If the project is for Android, please also include an "explanation.md" file that describes how to set up and run the project in Android Studio.
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: fullPrompt,
                config: {
                    ...getModelConfig(mode),
                    responseMimeType: "application/json",
                    responseSchema: schema,
                },
            });
            
            const jsonResponse = JSON.parse(response.text);
            return jsonResponse.files as CodeFile[];

        } catch (error) {
            console.error("Error generating code project:", error);
            throw new Error("خطا در ساخت پروژه. لطفاً دستور خود را واضح‌تر بیان کنید.");
        }
    },
    
    // Code Editing
    editCodeProject: async (currentFiles: CodeFile[], instruction: string, projectType: string, language: string, mode: ThinkingMode): Promise<CodeFile[]> => {
        try {
            const schema = {
                type: Type.OBJECT,
                properties: {
                    files: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING },
                                content: { type: Type.STRING },
                                language: { type: Type.STRING },
                            },
                            required: ['name', 'content', 'language'],
                        },
                    },
                },
                required: ['files'],
            };

            const fullPrompt = `You are an expert programmer. I have an existing ${projectType} project written in ${language}. Here are the current files:
            
            ${JSON.stringify(currentFiles, null, 2)}
            
            Please apply the following instruction to the project: "${instruction}"
            
            Return the complete, updated set of all project files in the same JSON format as the input (an array of file objects). Do not just return the changed files; return all files for the complete project.`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: fullPrompt,
                config: {
                    ...getModelConfig(mode),
                    responseMimeType: "application/json",
                    responseSchema: schema,
                },
            });
            
            const jsonResponse = JSON.parse(response.text);
            return jsonResponse.files as CodeFile[];

        } catch (error) {
            console.error("Error editing code project:", error);
            throw new Error("خطا در ویرایش پروژه. لطفاً دوباره تلاش کنید.");
        }
    },

    // Code Assistant
    assistCode: async (inputCode: string, instruction: string, mode: ThinkingMode): Promise<string> => {
        const prompt = `Here is a code snippet:\n\n\`\`\`\n${inputCode}\n\`\`\`\n\nPlease perform the following instruction on this code: "${instruction}"\n\nProvide only the resulting code or explanation as requested.`;
        return geminiService.generateText(prompt, mode);
    },

    // Song Identifier
    identifySongFromVideo: async (videoFile: File): Promise<string> => {
        try {
            const base64Data = await fileToBase64(videoFile);
            const videoPart = {
                inlineData: {
                    mimeType: videoFile.type,
                    data: base64Data,
                },
            };
            const textPart = {
                text: "Analyze the audio in this video and identify the song playing. Provide only the song title and artist name. If you cannot identify it, just respond with 'Could not identify the song.'",
            };
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: { parts: [videoPart, textPart] }
            });

            return response.text;

        } catch (error) {
            console.error("Error identifying song from video:", error);
            throw new Error("خطا در شناسایی آهنگ از ویدیو.");
        }
    },
    
    // Song Search (specific for Iranian music)
    searchIranianMusic: async (query: string): Promise<{ title: string, artist: string, coverArtUrl: string, pageUrl: string, audioSrc?: string }[]> => {
        try {
            const schema = {
                type: Type.OBJECT,
                properties: {
                    songs: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING },
                                artist: { type: Type.STRING },
                                coverArtUrl: { type: Type.STRING },
                                pageUrl: { type: Type.STRING },
                                audioSrc: { type: Type.STRING, description: "Direct URL to the MP3 file if available, otherwise empty." }
                            },
                            required: ['title', 'artist', 'coverArtUrl', 'pageUrl']
                        }
                    }
                },
                required: ['songs']
            };

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `Find the song "${query}" from popular Iranian music websites like Ganja2Music, Bia2Music, or similar. Provide the title, artist, a URL to the cover art, the URL of the song's page, and a direct link to the 320kbps MP3 if you can find one. Respond in JSON format.`,
                config: {
                    ...getModelConfig('fast', false),
                    responseMimeType: 'application/json',
                    responseSchema: schema
                }
            });

            const jsonResponse = JSON.parse(response.text);
            return jsonResponse.songs;
        } catch (error) {
            console.error('Error searching for music:', error);
            throw new Error("خطا در جستجوی آهنگ. وب‌سایت‌های منبع ممکن است در دسترس نباشند.");
        }
    }
};