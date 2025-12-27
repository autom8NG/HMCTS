const request = require('supertest');
const app = require('../src/server');
const userService = require('../src/services/userService');

describe('6.3 Refresh Token Flow (POST /auth/refresh)', () => {
  
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

  describe('✅ TC-11: Refresh Access Token Successfully', () => {
    it('should issue new access token with valid refresh token', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({
          refresh_token: validRefreshToken
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('refresh_token');
      expect(response.body).toHaveProperty('token_type', 'Bearer');
      expect(response.body.access_token).not.toBe(validAccessToken);
      
      // Verify new access token works
      const protectedResponse = await request(app)
        .get('/api/protected')
        .set('Authorization', `Bearer ${response.body.access_token}`);
      
      expect(protectedResponse.status).toBe(200);
    });
  });

  describe('❌ TC-12: Refresh with Invalid Token', () => {
    it('should return 401 for invalid refresh token', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({
          refresh_token: 'invalid.refresh.token'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'invalid_grant');
    });
  });

  describe('❌ TC-13: Refresh with Expired Token', () => {
    it('should return 401 for expired refresh token', async () => {
      // Wait for refresh token to expire (30 seconds in test environment)
      await new Promise(resolve => setTimeout(resolve, 31000)); // Wait 31 seconds (token expires in 30)
      
      const response = await request(app)
        .post('/auth/refresh')
        .send({
          refresh_token: validRefreshToken
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'invalid_grant');
      expect(response.body.error_description).toContain('expired');
    }, 35000); // Increase Jest timeout
  });

  describe('❌ TC-14: Refresh Token Reuse (Security)', () => {
    it('should reject second use of refresh token', async () => {
      // First refresh - should succeed
      const firstRefresh = await request(app)
        .post('/auth/refresh')
        .send({
          refresh_token: validRefreshToken
        });

      expect(firstRefresh.status).toBe(200);

      // Second refresh with same token - should fail
      const secondRefresh = await request(app)
        .post('/auth/refresh')
        .send({
          refresh_token: validRefreshToken
        });

      expect(secondRefresh.status).toBe(401);
      expect(secondRefresh.body).toHaveProperty('error', 'invalid_grant');
    });
  });

  describe('❌ Additional Refresh Token Validation', () => {
    it('should return 400 when refresh token is missing', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'invalid_request');
    });
  });
});
