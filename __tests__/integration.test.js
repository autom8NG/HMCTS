const request = require('supertest');
const app = require('../src/server');

describe('Integration Tests', () => {
  
  describe('Complete OAuth2 Flow', () => {
    it('should complete full authentication flow', async () => {
      // 1. Login
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          username: 'testuser',
          password: 'Password123'
        });

      expect(loginResponse.status).toBe(200);
      const { access_token, refresh_token } = loginResponse.body;

      // 2. Access protected resource
      const protectedResponse = await request(app)
        .get('/api/protected')
        .set('Authorization', `Bearer ${access_token}`);

      expect(protectedResponse.status).toBe(200);

      // 3. Refresh token
      const refreshResponse = await request(app)
        .post('/auth/refresh')
        .send({ refresh_token });

      expect(refreshResponse.status).toBe(200);
      const newAccessToken = refreshResponse.body.access_token;
      const newRefreshToken = refreshResponse.body.refresh_token;

      // 4. Use new access token
      const newProtectedResponse = await request(app)
        .get('/api/protected')
        .set('Authorization', `Bearer ${newAccessToken}`);

      expect(newProtectedResponse.status).toBe(200);

      // 5. Logout
      const logoutResponse = await request(app)
        .post('/auth/logout')
        .send({ refresh_token: newRefreshToken });

      expect(logoutResponse.status).toBe(200);

      // 6. Try to refresh after logout (should fail)
      const postLogoutRefresh = await request(app)
        .post('/auth/refresh')
        .send({ refresh_token: newRefreshToken });

      expect(postLogoutRefresh.status).toBe(401);
    });
  });

  describe('Health Check', () => {
    it('should return server health status', async () => {
      const response = await request(app)
        .get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Root Endpoint', () => {
    it('should return API documentation', async () => {
      const response = await request(app)
        .get('/api-info');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('endpoints');
    });
  });
});
