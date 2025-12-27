const request = require('supertest');
const app = require('../src/server');
const userService = require('../src/services/userService');
const tokenService = require('../src/services/tokenService');

describe('6.2 Access Token Usage (GET /api/protected)', () => {
  
  let validAccessToken;

  beforeEach(async () => {
    // Clear refresh tokens
    userService.clearAllRefreshTokens();
    
    // Login to get valid access token
    const loginResponse = await request(app)
      .post('/auth/login')
      .send({
        username: 'testuser',
        password: 'Password123'
      });
    
    validAccessToken = loginResponse.body.access_token;
  });

  describe('✅ TC-06: Access with Valid Token', () => {
    it('should access protected resource with valid token', async () => {
      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', `Bearer ${validAccessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('userId');
      expect(response.body.user).toHaveProperty('username', 'testuser');
    });
  });

  describe('❌ TC-07: Access Without Token', () => {
    it('should return 401 when no token is provided', async () => {
      const response = await request(app)
        .get('/api/protected');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'unauthorized');
      expect(response.body).toHaveProperty('error_description');
    });
  });

  describe('❌ TC-08: Access with Invalid Token', () => {
    it('should return 401 for invalid token', async () => {
      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', 'Bearer invalid.token.here');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('error_description');
    });
  });

  describe('❌ TC-09: Access with Expired Token', () => {
    it('should return 401 for expired token', async () => {
      // Wait for token to expire (5 seconds in test environment)
      await new Promise(resolve => setTimeout(resolve, 6000)); // Wait 6 seconds (token expires in 5)
      
      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', `Bearer ${validAccessToken}`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'token_expired');
      expect(response.body.error_description).toContain('expired');
    }, 10000); // Increase Jest timeout for this test
  });

  describe('❌ TC-10: Access with Tampered Token', () => {
    it('should return 401 for tampered token', async () => {
      // Tamper with the token by modifying it
      const tamperedToken = validAccessToken.slice(0, -10) + 'tampered123';

      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', `Bearer ${tamperedToken}`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 when token signature is invalid', async () => {
      // Create a token with invalid signature
      const parts = validAccessToken.split('.');
      const tamperedToken = parts[0] + '.' + parts[1] + '.invalidsignature';

      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', `Bearer ${tamperedToken}`);

      expect(response.status).toBe(401);
    });
  });
});
