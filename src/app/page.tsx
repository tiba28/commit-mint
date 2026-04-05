// src/app/page.tsx
'use client';

import { useState } from 'react';
import { uploadImage } from './actions';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [goalType, setGoalType] = useState<'PHYSICAL' | 'DIGITAL'>('PHYSICAL');
  const [condition, setCondition] = useState('机の上が綺麗に片付いていること');
  const [status, setStatus] = useState<'idle' | 'uploading' | 'evaluating' | 'done'>('idle');
  const [result, setResult] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    try {
      // 1. 画像をBlobにアップロード
      setStatus('uploading');
      const formData = new FormData();
      formData.append('file', file);
      const imageUrl = await uploadImage(formData);

      // 2. 取得したURLをAI判定APIに送信
      setStatus('evaluating');
      const aiResponse = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl, condition, goalType }),
      });

      const aiData = await aiResponse.json();
      setResult(aiData);
      setStatus('done');

    } catch (error) {
      console.error(error);
      alert('エラーが発生しました。');
      setStatus('idle');
    }
  };

  return (
    <main className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">CommitMint MVPテスト</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">目標の条件（AIへの指示）</label>
          <input
            type="text"
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            className="w-full border p-2 rounded text-black"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">タスクの性質（チート対策）</label>
          <select
            value={goalType}
            onChange={(e) => setGoalType(e.target.value as 'PHYSICAL' | 'DIGITAL')}
            className="w-full border p-2 rounded text-black"
          >
            <option value="PHYSICAL">物理タスク（カメラ直接撮影）</option>
            <option value="DIGITAL">デジタルタスク（スクショ許可）</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">証拠画像の提出</label>
          {/* goalTypeがPHYSICALの場合のみ、カメラを直接起動する属性をつける */}
          <input
            type="file"
            accept="image/*"
            capture={goalType === 'PHYSICAL' ? "environment" : undefined}
            onChange={handleFileChange}
            className="w-full border p-2 rounded"
          />
        </div>

        <button
          type="submit"
          disabled={!file || status !== 'idle'}
          className="w-full bg-blue-600 text-white p-3 rounded font-bold disabled:bg-gray-400"
        >
          {status === 'idle' && 'AIに判定させる'}
          {status === 'uploading' && '画像をアップロード中...'}
          {status === 'evaluating' && 'AIが冷酷に審査中...'}
          {status === 'done' && '判定完了'}
        </button>
      </form>

      {/* 判定結果の表示 */}
      {result && (
        <div className={`mt-8 p-4 rounded border ${result.isSuccess ? 'bg-green-100 border-green-500' : 'bg-red-100 border-red-500'}`}>
          <h2 className="text-xl font-bold text-black mb-2">
            判定結果: {result.isSuccess ? '✅ 達成' : '❌ 失敗'}
          </h2>
          <p className="text-black"><strong>AIの自信度:</strong> {result.aiConfidence * 100}%</p>
          <p className="text-black mt-2"><strong>AIからのコメント:</strong> {result.aiComment}</p>
        </div>
      )}
    </main>
  );
}