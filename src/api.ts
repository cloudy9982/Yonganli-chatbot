const marketUrl = process.env.MARKET_API;
const key = process.env.KEY;
const crypto = require('crypto');
const fetch = require('node-fetch');

export async function fetchOrders(phone: string, name: string) {
  const body = JSON.stringify({
    purchaser_mobile: phone,
    line_user_id: name
  });
  const payload = Buffer.from(body);
  const sign = crypto.createHmac('sha1', key).update(payload).digest('hex');

  return fetch(marketUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'x-hub-signature': `sha1=${sign}`
    },
    body
  })
    .then((x: any) => x.json())
    .catch(console.log);
}

export async function fetchKeywords() {
  return fetch('https://icook.tw/api/v1/keywords/hot_keywords', {
    headers: {
      'User-Agent': 'tw.icook.chatbot'
    }
  })
    .then((x: any) => x.json())
    .catch(console.log);
}

export async function fetchHitfood(keyword: string) {
  return fetch(
    `https://icook.tw/api/v1/recipes/search.json?q=${encodeURIComponent(
      keyword
    )}`,
    {
      headers: {
        'User-Agent': 'tw.icook.chatbot'
      }
    }
  )
    .then((x: any) => x.json())
    .catch(console.log);
}

export async function fetchSeasonfood() {
  return fetch('https://icook.tw/api/v1/homepage_v2.json', {
    headers: {
      'User-Agent': 'tw.icook.chatbot'
    }
  })
    .then((x: any) => x.json())
    .catch(console.log);
}

export async function fetchRecipe(id: string) {
  return fetch(`https://icook.tw/api/v1/recipes/${id}.json`, {
    headers: {
      'User-Agent': 'tw.icook.chatbot'
    }
  })
    .then((x: any) => x.json())
    .catch(console.log);
}
