/**
 * OAuth2 Authentication System - Usage Example
 * 
 * This example demonstrates how to use the OAuth2 authentication system
 * Run the server first with: npm start
 */

const axios = require('axios');

const API_URL = 'http://localhost:3000';

async function demonstrateOAuth2Flow() {
  console.log('🚀 OAuth2 Authentication Flow Demo\n');

  try {
    // Step 1: Login
    console.log('1️⃣  Login with credentials...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      username: 'testuser',
      password: 'Password123'
    });

    const { access_token, refresh_token } = loginResponse.data;
    console.log('✅ Login successful!');
    console.log(`   Access Token: ${access_token.substring(0, 50)}...`);
    console.log(`   Refresh Token: ${refresh_token.substring(0, 50)}...\n`);

    // Step 2: Access protected resource
    console.log('2️⃣  Accessing protected resource...');
    const protectedResponse = await axios.get(`${API_URL}/api/protected`, {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });
    console.log('✅ Protected resource accessed!');
    console.log('   Data:', protectedResponse.data.message, '\n');

    // Step 3: Access public resource (no auth)
    console.log('3️⃣  Accessing public resource (no authentication)...');
    const publicResponse = await axios.get(`${API_URL}/api/public`);
    console.log('✅ Public resource accessed!');
    console.log('   Data:', publicResponse.data.message, '\n');

    // Step 4: Refresh access token
    console.log('4️⃣  Refreshing access token...');
    const refreshResponse = await axios.post(`${API_URL}/auth/refresh`, {
      refresh_token
    });
    
    const newAccessToken = refreshResponse.data.access_token;
    const newRefreshToken = refreshResponse.data.refresh_token;
    console.log('✅ Token refreshed!');
    console.log(`   New Access Token: ${newAccessToken.substring(0, 50)}...\n`);

    // Step 5: Use new access token
    console.log('5️⃣  Using new access token...');
    const newProtectedResponse = await axios.get(`${API_URL}/api/protected`, {
      headers: {
        'Authorization': `Bearer ${newAccessToken}`
      }
    });
    console.log('✅ New token works!');
    console.log('   User:', newProtectedResponse.data.user.username, '\n');

    // Step 6: Try admin endpoint (should fail - insufficient permissions)
    console.log('6️⃣  Attempting to access admin endpoint...');
    try {
      await axios.get(`${API_URL}/api/admin/dashboard`, {
        headers: {
          'Authorization': `Bearer ${newAccessToken}`
        }
      });
    } catch (error) {
      console.log('❌ Access denied (as expected - user is not admin)');
      console.log('   Error:', error.response.data.error_description, '\n');
    }

    // Step 7: Login as admin
    console.log('7️⃣  Login as admin...');
    const adminLoginResponse = await axios.post(`${API_URL}/auth/login`, {
      username: 'admin',
      password: 'Password123'
    });

    const adminAccessToken = adminLoginResponse.data.access_token;
    console.log('✅ Admin login successful!\n');

    // Step 8: Access admin endpoint
    console.log('8️⃣  Accessing admin endpoint...');
    const adminResponse = await axios.get(`${API_URL}/api/admin/dashboard`, {
      headers: {
        'Authorization': `Bearer ${adminAccessToken}`
      }
    });
    console.log('✅ Admin dashboard accessed!');
    console.log('   Data:', adminResponse.data, '\n');

    // Step 9: Logout
    console.log('9️⃣  Logging out...');
    await axios.post(`${API_URL}/auth/logout`, {
      refresh_token: newRefreshToken
    });
    console.log('✅ Logged out successfully!\n');

    // Step 10: Try to use refresh token after logout (should fail)
    console.log('🔟  Attempting to use refresh token after logout...');
    try {
      await axios.post(`${API_URL}/auth/refresh`, {
        refresh_token: newRefreshToken
      });
    } catch (error) {
      console.log('❌ Refresh token invalid (as expected - logged out)');
      console.log('   Error:', error.response.data.error_description, '\n');
    }

    console.log('✨ OAuth2 authentication flow demonstration complete!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
  }
}

// Run the demo
console.log('Make sure the server is running on http://localhost:3000');
console.log('Start it with: npm start\n');

// Wait a bit for user to read the message
setTimeout(() => {
  demonstrateOAuth2Flow();
}, 2000);
