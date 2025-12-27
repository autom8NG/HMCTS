const request = require('supertest');
const app = require('../src/server');
const userService = require('../src/services/userService');

describe('6.5 Role & Scope Authorization', () => {
  
  let userAccessToken;
  let adminAccessToken;

  beforeEach(async () => {
    // Clear refresh tokens
    userService.clearAllRefreshTokens();
    
    // Login as regular user
    const userLogin = await request(app)
      .post('/auth/login')
      .send({
        username: 'testuser',
        password: 'Password123'
      });
    userAccessToken = userLogin.body.access_token;

    // Login as admin
    const adminLogin = await request(app)
      .post('/auth/login')
      .send({
        username: 'admin',
        password: 'Password123'
      });
    adminAccessToken = adminLogin.body.access_token;
  });

  describe('✅ TC-18: Valid Role Access', () => {
    it('should allow admin to access admin endpoints', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('data');
    });

    it('should allow user to access user endpoints', async () => {
      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${userAccessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('profile');
    });

    it('should allow both roles to access protected endpoints', async () => {
      const userResponse = await request(app)
        .get('/api/protected')
        .set('Authorization', `Bearer ${userAccessToken}`);

      const adminResponse = await request(app)
        .get('/api/protected')
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(userResponse.status).toBe(200);
      expect(adminResponse.status).toBe(200);
    });
  });

  describe('❌ TC-19: Insufficient Role', () => {
    it('should return 403 when user tries to access admin endpoints', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${userAccessToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'forbidden');
      expect(response.body).toHaveProperty('error_description');
      expect(response.body.error_description).toContain('Insufficient permissions');
    });

    it('should return 403 when user tries to access admin users list', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${userAccessToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'forbidden');
    });
  });

  describe('Public Endpoint Access', () => {
    it('should allow access to public endpoints without authentication', async () => {
      const response = await request(app)
        .get('/api/public');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
    });
  });
});
