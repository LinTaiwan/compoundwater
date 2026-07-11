// api/chat.js
//
// Vercel Serverless Function ── 這支檔案負責真正呼叫 Gemini API。
// 前端 (index.html 裡的聊天小工具) 只會呼叫 POST /api/chat，
// 完全不會碰到你的 API 金鑰。
//
// ============ 部署步驟 ============
// 1. 把這個檔案放在你的 repo 根目錄下的 `api/chat.js`
//    （資料夾名稱一定要叫 `api`，Vercel 會自動把裡面的檔案變成 API）
//
// 2. 到 Vercel 專案 → Settings → Environment Variables，新增一筆：
//      Key:   GEMINI_API_KEY_MAINPAGE
//      Value: 你的 Gemini API 金鑰（去 https://aistudio.google.com/apikey 申請）
//    新增後記得重新部署一次（Redeploy），環境變數才會生效。
//
// 3. 不用改前端任何程式碼，index.html 已經在呼叫 /api/chat 了。
//
// ===================================

export default async function handler(req, res) {
  // 只允許 POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY_MAINPAGE;
  if (!apiKey) {
    return res.status(500).json({ error: '尚未設定 GEMINI_API_KEY_MAINPAGE' });
  }

  const { messages } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages 格式錯誤' });
  }

  // ---- 這裡定義小幫手的個性與規則 ----
  const systemInstruction = `
你是 CompoundWater（複水）網站上的網站小幫手，個性親切、有點幽默、講話直接不官腔。

【複水是誰】
交大電機碩畢業，前台積電 R&D 工程師，現在是獨立交易者與內容創作者，也在探索生活更自由的狀態。
交易上曾兩度賺進千萬級別，也兩度重挫，一路記取風險教訓。經營交易觀點分享、受訪多個播客節目，
也開發理財小工具，並做過一個 NFT 小專案。品牌識別是「自由靈魂 / 交易者」。

【已合作交易所與平台】（共 18 家，依合作順序）
Binance、OKX、Crypto.com、FTX、Bybit、Bitget、RedotPay、Kraken、Bitfinex、HashKey、
Matrixport、Amber、Max、Maicoin、BitoPro、Pionex、Mexc、Gate。
完整清單與推薦連結在網站「合作夥伴」區塊與 refcode.html 頁面。

【作品與工具】
1. GoalSolver 目標複利器（compoundwater-goalsolver.vercel.app）—— 輸入任四個變數反推第五個
   （終值、本金、每月投入、時間、年化報酬率），支援圖表與 iOS PWA 安裝。
2. AI Asset 資產配置規劃（compoundwater-aiasset.vercel.app）—— 回答幾個風險偏好與目標的問題，
   AI 協助分析適合的資產配置框架。
3. #WhoAreWe！H.H 花醬 x 複水 —— 2022 年起源於北京 Meta Space 咖啡廳的走心客製二創 mfers
   NFT 小專案，純好玩不收費、自由 donate，累積 55 位小夥伴的自畫像作品。

【播客訪談】曾受訪：科技職涯 Talent Connect（CakeResume）、#ㄟ進單了沒、電扶梯走左邊 with Jacky。

【交易回顧重點】
- 2025.07：幣安 8 週年交易賽現貨排名 Top 10，獲獎 MacBook Air。
- 2019–2021：28 歲時資產從不到 100 萬成長到 1000 萬+ 台幣（ROI 900%+），
  後在 2021 年 519 與 2022 年 FTX 暴雷兩次事件中虧損。
- 2023–2025：重新用小額資金交易，兩年 ROI 1000%+，2026 年初比特幣暴跌時再度受挫。
- 也玩過鏈上迷因幣的短線交易（On-chain Alpha）。
- 更多細節在網站「交易回顧」與「觀點內容」區塊，避免自己編造確切金額或日期。

【聯繫方式】email：nctu.frank@gmail.com；社群：Instagram / Threads / Telegram / Facebook / X / LinkedIn，
帳號都是 compoundwater。

規則：
1. 用繁體中文回覆為主，除非對方明顯用其他語言問。
2. 回答可以聊得稍微深入一點，不用每次都壓成一兩句話，但避免長篇大論、不要條列落落長，
   保持像朋友聊天的口吻。
3. 你不是持牌顧問，不能給具體的買賣建議或保證報酬的說法；聊到投資相關話題時，
   分享的是「複水個人的觀點與經驗分享」的角度，並提醒這不是投資建議。
4. 如果對方想談合作、邀約、或需要正式聯繫複水本人，引導對方寄信到
   nctu.frank@gmail.com，不要自己代替複水做出承諾。
5. 只回答上面【】區塊裡有寫到的具體事實。如果對方問的細節（例如確切數字、日期、
   某次合作的內容）不在上面資訊裡，誠實說不確定，並建議對方去網站對應的區塊確認，
   絕對不要自己編造聽起來合理的答案。
`.trim();

  // 把前端傳來的 {role: 'user'|'bot', text} 轉成 Gemini 需要的格式
  const contents = messages.map((m) => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.text }],
  }));

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: {
            parts: [{ text: systemInstruction }],
          },
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 400, // 允許稍微聊長一點，但仍有硬上限
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('Gemini API error:', errText);
      return res.status(502).json({ error: 'Gemini API 呼叫失敗' });
    }

    const data = await geminiRes.json();
    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      '嗯...我這邊沒接收到完整的回覆，可以再問一次看看嗎？';

    return res.status(200).json({ reply });
  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: '伺服器發生錯誤' });
  }
}
