fetch('http://localhost:3000/api/evaluate', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        // 開発者用ダミー画像API（黒い犬の写真）に変更
        imageUrl: 'https://picsum.photos/id/237/400/400',
        condition: '犬が写っていること',
        goalType: 'PHYSICAL'
    })
})
    .then(response => response.json())
    .then(data => console.log('AIの判定結果:', data))
    .catch(error => console.error('エラー:', error));