// src/app/actions.ts
'use server'

import { put } from '@vercel/blob';

export async function uploadImage(formData: FormData) {
    const file = formData.get('file') as File;

    if (!file) {
        throw new Error('ファイルが選択されていません');
    }

    // Vercel Blobに画像をアップロードし、公開URLを取得する
    const blob = await put(file.name, file, {
        access: 'public',
    });

    return blob.url;
}