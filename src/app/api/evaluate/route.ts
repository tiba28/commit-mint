import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

// Geminiクライアントの初期化
const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { imageUrl, condition, goalType } = body;

        if (!imageUrl || !condition || !goalType) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 画像URLからデータを取得し、Base64形式に変換する（Geminiに渡すため）
        const imageResp = await fetch(imageUrl);
        if (!imageResp.ok) throw new Error('Failed to fetch image from URL');
        const arrayBuffer = await imageResp.arrayBuffer();
        const base64Data = Buffer.from(arrayBuffer).toString('base64');
        const mimeType = imageResp.headers.get('content-type') || 'image/jpeg';

        // プロンプト設計（JSONレスポンスを強制）
        let antiCheatPrompt = "";
        if (goalType === "PHYSICAL") {
            antiCheatPrompt = "【重要】この画像は現実世界の物理的な写真でなければなりません。PCやスマホのモニター画面を撮影したもの、不自然な加工、フリー素材と判断した場合は、即座に isSuccess を false にしてください。";
        } else if (goalType === "DIGITAL") {
            antiCheatPrompt = "【重要】スクリーンショットを許容します。タスク完了を証明する明確な証拠（日時、アカウント名など）が含まれているか厳しくチェックしてください。";
        }

        const systemInstruction = `あなたは冷酷で厳格な目標達成の判定AIです。出力は以下のJSONのみ。
    {"isSuccess": boolean, "aiConfidence": number, "aiComment": "厳格な判定理由（100文字以内）"}`;

        const prompt = `ユーザーの目標条件: 「${condition}」\n\n${antiCheatPrompt}`;

        // Gemini APIへのリクエスト (gemini-2.5-flashを使用)
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                prompt,
                { inlineData: { data: base64Data, mimeType: mimeType } }
            ],
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json", // 確実にJSONを出力させる
            }
        });

        const resultText = response.text || "{}";
        const result = JSON.parse(resultText);

        return NextResponse.json(result);

    } catch (error) {
        console.error("Gemini API Error:", error);
        return NextResponse.json({ error: 'Failed to evaluate image' }, { status: 500 });
    }
}