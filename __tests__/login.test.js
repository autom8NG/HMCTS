const request = require('supertest');
const app = require('../src/server');
const userService = require('../src/services/userService');

describe('6.1 Login Endpoint (POST /auth/login)', () => {
  
  beforeEach(() => {
    // Clear refresh tokens before each test
    userService.clearAllRefreshTokens();
  });

  describe('✅ TC-01: Successful Login', () => {
    it('should login with valid credentials and return tokens', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'testuser',
          password: 'Password123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('refresh_token');
      expect(response.body).toHaveProperty('token_type', 'Bearer');
      expect(response.body).toHaveProperty('expires_in');
      expect(typeof response.body.access_token).toBe('string');
      expect(typeof response.body.refresh_token).toBe('string');
    });
  });

  describe('❌ TC-02: Login with Invalid Password', () => {
    it('should return 401 for invalid password', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'testuser',
          password: 'wrongpass'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'invalid_grant');
      expect(response.body).toHaveProperty('error_description');
      expect(response.body).not.toHaveProperty('access_token');
      expect(response.body).not.toHaveProperty('refresh_token');
    });
  });

  describe('❌ TC-03: Login with Invalid Username', () => {
    it('should return 401 for invalid username', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'wronguser',
          password: 'Password123'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'invalid_grant');
      expect(response.body).not.toHaveProperty('access_token');
    });
  });

  describe('❌ TC-04: Login with Missing Fields', () => {
    it('should return 400 when username is missing', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          password: 'Password123'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'invalid_request');
      expect(response.body).toHaveProperty('error_description');
    });

    it('should return 400 when password is missing', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'testuser'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'invalid_request');
    });

    it('should return 400 when both fields are missing', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'invalid_request');
    });
  });
});
