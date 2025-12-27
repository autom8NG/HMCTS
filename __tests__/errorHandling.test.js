const request = require('supertest');
const app = require('../src/server');
const userService = require('../src/services/userService');

describe('6.6 Error Handling & Standards', () => {
  
  beforeEach(() => {
    userService.clearAllRefreshTokens();
  });

  describe('❌ TC-20: Invalid Grant Type', () => {
    it('should return OAuth-compliant error for invalid credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'wronguser',
          password: 'wrongpass'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('error_description');
      expect(response.body.error).toBe('invalid_grant');
    });
  });

  describe('❌ TC-21: Malformed Token Request', () => {
    it('should return 400 for malformed login request', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          user: 'testuser', // Wrong field name
          pass: 'Password123' // Wrong field name
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'invalid_request');
      expect(response.body).toHaveProperty('error_description');
    });

    it('should return 400 for malformed refresh request', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({
          token: 'some-token' // Wrong field name
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'invalid_request');
    });

    it('should return 400 for empty request body on login', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'invalid_request');
    });
  });

  describe('404 and Invalid Routes', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/nonexistent/route');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'not_found');
    });
  });

  describe('OAuth2 Error Format Compliance', () => {
    it('should follow OAuth2 error response format', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'testuser',
          password: 'wrongpass'
        });

      // OAuth2 requires 'error' and optionally 'error_description'
      expect(response.body).toHaveProperty('error');
      expect(typeof response.body.error).toBe('string');
      expect(response.body).toHaveProperty('error_description');
      expect(typeof response.body.error_description).toBe('string');
    });
  });

  describe('Authorization Header Validation', () => {
    it('should reject malformed authorization header', async () => {
      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', 'InvalidFormat token123');

      expect(response.status).toBe(401);
    });

    it('should reject authorization header without Bearer prefix', async () => {
      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', 'token123');

      expect(response.status).toBe(401);
    });
  });
});
