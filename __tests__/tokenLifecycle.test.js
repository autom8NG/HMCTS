const request = require('supertest');
const app = require('../src/server');
const userService = require('../src/services/userService');

describe('6.4 Token Lifecycle & Security', () => {
  
  let validRefreshToken;
  let validAccessToken;

  beforeEach(async () => {
    // Clear refresh tokens
    userService.clearAllRefreshTokens();
    
    // Login to get tokens
    const loginResponse = await request(app)
      .post('/auth/login')
      .send({
        username: 'testuser',
        password: 'Password123'
      });
    
    validRefreshToken = loginResponse.body.refresh_token;
    validAccessToken = loginResponse.body.access_token;
  });

  describe('✅ TC-15: Access Token Expiry', () => {
    it('should reject expired access token', async () => {
      // Token works initially
      const initialResponse = await request(app)
        .get('/api/protected')
        .set('Authorization', `Bearer ${validAccessToken}`);
      
      expect(initialResponse.status).toBe(200);

      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 6000)); // Wait 6 seconds (token expires in 5)
      
      const expiredResponse = await request(app)
        .get('/api/protected')
        .set('Authorization', `Bearer ${validAccessToken}`);

      expect(expiredResponse.status).toBe(401);
      expect(expiredResponse.body.error).toBe('token_expired');
    }, 10000);
  });

  describe('❌ TC-16: Refresh After Logout', () => {
    it('should invalidate refresh token after logout', async () => {
      // Logout
      const logoutResponse = await request(app)
        .post('/auth/logout')
        .send({
          refresh_token: validRefreshToken
        });

      expect(logoutResponse.status).toBe(200);

      // Try to refresh after logout
      const refreshResponse = await request(app)
        .post('/auth/refresh')
        .send({
          refresh_token: validRefreshToken
        });

      expect(refreshResponse.status).toBe(401);
      expect(refreshResponse.body).toHaveProperty('error', 'invalid_grant');
    });
  });

  describe('❌ TC-17: Multiple Sessions (Optional)', () => {
    it('should support multiple active sessions with different tokens', async () => {
      // First login session
      const session1 = await request(app)
        .post('/auth/login')
        .send({
          username: 'testuser',
          password: 'Password123'
        });

      // Second login session
      const session2 = await request(app)
        .post('/auth/login')
        .send({
          username: 'testuser',
          password: 'Password123'
        });

      expect(session1.body.access_token).not.toBe(session2.body.access_token);
      expect(session1.body.refresh_token).not.toBe(session2.body.refresh_token);

      // Both tokens should work
      const access1 = await request(app)
        .get('/api/protected')
        .set('Authorization', `Bearer ${session1.body.access_token}`);

      const access2 = await request(app)
        .get('/api/protected')
        .set('Authorization', `Bearer ${session2.body.access_token}`);

      expect(access1.status).toBe(200);
      expect(access2.status).toBe(200);

      // Logout from session 1 should not affect session 2
      await request(app)
        .post('/auth/logout')
        .send({
          refresh_token: session1.body.refresh_token
        });

      const refresh2 = await request(app)
        .post('/auth/refresh')
        .send({
          refresh_token: session2.body.refresh_token
        });

      expect(refresh2.status).toBe(200);
    });
  });
});
