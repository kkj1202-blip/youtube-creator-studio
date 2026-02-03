const fs = require('fs');
const path = require('path');

// Manually load .env.local
try {
  const envPath = path.join(__dirname, '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim();
    }
  });
} catch (e) {
  console.log('.env.local not found or readable');
}

const apiKey = process.env.RAPIDAPI_KEY;

async function testInstagram() {
  console.log('Testing Instagram API...');
  console.log('API Key exists:', !!apiKey);

  if (!apiKey) {
    console.error('No API Key found.');
    return;
  }

  try {
    // Try different endpoints/params to see if anything works
    const endpoints = [
      'https://instagram-scraper2.p.rapidapi.com/hash_tag_medias?hash_tag=viral',
      'https://instagram-scraper2.p.rapidapi.com/user_info?user_name=instagram',
      'https://instagram-scraper2.p.rapidapi.com/hash_tag_medias?hash_tag=kpop'
    ];

    for (const url of endpoints) {
      console.log(`Testing URL: ${url}`);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': 'instagram-scraper2.p.rapidapi.com',
        },
      });

      console.log(`Status for ${url}: ${response.status}`);
      if (response.ok) {
        const text = await response.text();
        console.log('Response length:', text.length);
        if (text.length < 500) console.log('Response preview:', text);
      } else {
        console.log('Error:', await response.text());
      }
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testInstagram();
