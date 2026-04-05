import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { PrismaClient } from '@prisma/client';

// クライアントの初期化
const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});
const prisma = new PrismaClient();

// MVP用のテストデータID（先ほどPrisma Studioで作ったもの）
const TEST_USER_ID = "cmnlan9ye0000tme7bwk1j5bk";
const TEST_GOAL_ID = "aaaaaaaa";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { imageUrl, condition, goalType } = body;

        if (!imageUrl || !condition || !goalType) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 画像のBase64変換
        const imageResp = await fetch(imageUrl);
        if (!imageResp.ok) throw new Error('Failed to fetch image from URL');
        const arrayBuffer = await imageResp.arrayBuffer();
        const base64Data = Buffer.from(arrayBuffer).toString('base64');
        const mimeType = imageResp.headers.get('content-type') || 'image/jpeg';

        // プロンプト設計
        let antiCheatPrompt = "";
        if (goalType === "PHYSICAL") {
            antiCheatPrompt = "【重要】この画像は現実世界の物理的な写真でなければなりません。PCやスマホのモニター画面を撮影したもの、不自然な加工、フリー素材と判断した場合は、即座に isSuccess を false にしてください。";
        } else if (goalType === "DIGITAL") {
            antiCheatPrompt = "【重要】スクリーンショットを許容します。タスク完了を証明する明確な証拠が含まれているか厳しくチェックしてください。";
        }

        const systemInstruction = `あなたは冷酷で厳格な目標達成の判定AIです。出力は以下のJSONのみ。
    {"isSuccess": boolean, "aiConfidence": number, "aiComment": "厳格な判定理由（100文字以内）"}`;

        const prompt = `ユーザーの目標条件: 「${condition}」\n\n${antiCheatPrompt}`;

        // Gemini APIによる判定
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                prompt,
                { inlineData: { data: base64Data, mimeType: mimeType } }
            ],
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
            }
        });

        const resultText = response.text || "{}";
        const result = JSON.parse(resultText);

        // ==========================================
        // データベースへの保存とストリークの更新ロジック
        // ==========================================

        // 1. 判定結果の履歴（証拠）を保存
        await prisma.taskResult.create({
            data: {
                goalId: TEST_GOAL_ID,
                imageUrl: imageUrl,
                aiConfidence: result.aiConfidence,
                aiComment: result.aiComment,
                isSuccess: result.isSuccess,
            }
        });

        // 2. ストリーク（命）の更新
        // 2. ストリーク（命）の更新
        if (result.isSuccess) {
            // MVPの簡易実装: 成功したらストリークを増やす
            // (※厳密には「今日すでに成功しているか」のチェックが必要だが、今はフロント側で「完了」画面を出して連続投稿を防ぐUI想定とする)
            await prisma.user.update({
                where: { id: TEST_USER_ID },
                data: { currentStreak: { increment: 1 } }
            });
        }
        // 失敗(else)の場合は、TaskResult（履歴）に失敗の記録が残るだけで、ストリークには一切触れない。
        // ユーザーはAIのコメントを読んで、もう一度正しい画像をアップロードし直すことができる。

        return NextResponse.json(result);

    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json({ error: 'Failed to process task' }, { status: 500 });
    }
}