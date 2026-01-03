#!/usr/bin/env node

/**
 * Reddit Access Token Generator
 * 
 * Usage:
 * 1. Fill in your credentials below
 * 2. Run: node scripts/get-reddit-token.js
 * 3. Copy the access token to your .env.local file
 */

const https = require('https');

// ============================================
// FILL IN YOUR REDDIT CREDENTIALS HERE
// ============================================
const CLIENT_ID = 'YOUR_CLIENT_ID_HERE';
const CLIENT_SECRET = 'YOUR_CLIENT_SECRET_HERE';
const USERNAME = 'YOUR_REDDIT_USERNAME';
const PASSWORD = 'YOUR_REDDIT_PASSWORD';
// ============================================

if (CLIENT_ID === 'YOUR_CLIENT_ID_HERE') {
  console.error('❌ Error: Please fill in your Reddit credentials in scripts/get-reddit-token.js');
  console.log('\n📝 Steps:');
  console.log('1. Go to https://www.reddit.com/prefs/apps');
  console.log('2. Create a new app (choose "script" type)');
  console.log('3. Copy your Client ID and Client Secret');
  console.log('4. Edit this file and fill in the credentials');
  process.exit(1);
}

const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');

const postData = `grant_type=password&username=${encodeURIComponent(USERNAME)}&password=${encodeURIComponent(PASSWORD)}`;

const options = {
  hostname: 'www.reddit.com',
  path: '/api/v1/access_token',
  method: 'POST',
  headers: {
    'Authorization': `Basic ${credentials}`,
    'Content-Type': 'application/x-www-form-urlencoded',
    'User-Agent': 'RedditFrost/2.0'
  }
};

console.log('🔄 Requesting Reddit access token...\n');

const req = https.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    if (res.statusCode !== 200) {
      console.error('❌ Error:', res.statusCode);
      console.error('Response:', data);
      try {
        const error = JSON.parse(data);
        if (error.error === 'invalid_grant') {
          console.error('\n💡 Tip: Check your username and password are correct');
        }
      } catch (e) {
        // Ignore parse errors
      }
      process.exit(1);
    }
    
    try {
      const response = JSON.parse(data);
      
      if (response.access_token) {
        console.log('✅ Success! Access token obtained\n');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📋 Add this to your .env.local file:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log(`REDDIT_ACCESS_TOKEN=${response.access_token}\n`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        if (response.expires_in) {
          if (response.expires_in === 0) {
            console.log(`\n✅ This is a PERMANENT token (never expires)`);
          } else {
            const hours = Math.floor(response.expires_in / 3600);
            console.log(`\n⏰ Token expires in: ${hours} hour(s)`);
            console.log(`\n💡 Tip: For a permanent token, use OAuth flow with duration=permanent`);
            console.log(`   See REDDIT_TOKEN_EXPIRATION.md for details`);
          }
        }
        
        if (response.refresh_token) {
          console.log('🔄 Refresh token available (for token renewal)');
          console.log(`\n📝 Save this refresh token for automatic renewal:`);
          console.log(`REDDIT_REFRESH_TOKEN=${response.refresh_token}`);
        }
      } else {
        console.error('❌ No access token in response');
        console.error('Response:', response);
      }
    } catch (error) {
      console.error('❌ Failed to parse response:', error.message);
      console.error('Raw response:', data);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request error:', error.message);
  process.exit(1);
});

req.write(postData);
req.end();

