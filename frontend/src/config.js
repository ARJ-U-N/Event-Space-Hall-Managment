// frontend/src/config.js
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const API_ENDPOINTS = {
  // Auth
  LOGIN: `${API_URL}/api/auth/login`,
  REGISTER: `${API_URL}/api/auth/register`,
  
  // Halls
  HALLS: `${API_URL}/api/halls`,
  HALL_BY_ID: (id) => `${API_URL}/api/halls/${id}`,
  
  // Bookings
  BOOKINGS: `${API_URL}/api/bookings`,
  MY_BOOKINGS: `${API_URL}/api/bookings/my`,
  BOOKING_BY_ID: (id) => `${API_URL}/api/bookings/${id}`,
  
  // Admin - Bookings
  ADMIN_BOOKINGS: `${API_URL}/api/admin/bookings`,
  ADMIN_APPROVE_BOOKING: (id) => `${API_URL}/api/admin/bookings/${id}/approve`,
  ADMIN_REJECT_BOOKING: (id) => `${API_URL}/api/admin/bookings/${id}/reject`,
  
  // Admin - Halls
  ADMIN_HALLS: `${API_URL}/api/admin/halls`,
  ADMIN_HALL_BY_ID: (id) => `${API_URL}/api/admin/halls/${id}`,
  
  // Teacher (if you're using these routes)
  TEACHER: `${API_URL}/api/teacher`,
  
  // Super Admin (if you're using these routes)
  SUPERADMIN: `${API_URL}/api/superadmin`,
  
  // Health Check
  HEALTH: `${API_URL}/api/health`
};
