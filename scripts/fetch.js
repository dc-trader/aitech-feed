import Parser from 'rss-parser';
import fs from 'fs/promises';
// import { Configuration, OpenAIApi } from 'openai';   // ← 要約が不要なら消す

const feeds = [
  { source: 'zenn',  url: 'https://zenn.dev/<ユーザ名>/feed' },
  { source: 'qiita', url: 'https://qiita.com/<ユーザ名>/feed' },
//   { source: 'note',  url: 'https://note.com/<ユーザ名>/rss' } // プロフ右上のRSSアイコンで取得可
];

const keywords = ['AI', 'LLM', 'React', 'Astro'];   // 興味ワード
const parser = new Parser();
const openai = new OpenAIApi(new Configuration({ apiKey: process.env.OPENAI_API_KEY }));

async function summarize(text) {
  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 120,
    messages: [
      { role: 'system', content: 'Summarize in 2 sentences.' },
      { role: 'user',   content: text }
    ]
  });
  return res.choices[0].message.content.trim();
}

async function main() {
  const articles = [];

  for (const feed of feeds) {
    const data = await parser.parseURL(feed.url);
    for (const item of data.items) {
      const body = (item.title || '') + (item.contentSnippet || '');
      if (!keywords.some(k => body.includes(k))) continue;   // キーワードフィルタ

      const summary = await summarize(item.contentSnippet ?? item.content ?? '');
      articles.push({
        source : feed.source,
        title  : item.title,
        link   : item.link,
        pubDate: item.pubDate,
        summary
      });
    }
  }

  await fs.mkdir('data', { recursive: true });
  await fs.writeFile('data/articles.json',
                     JSON.stringify(articles, null, 2));
}

main().catch(err => (console.error(err), process.exit(1)));
