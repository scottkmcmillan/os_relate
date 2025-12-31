/**
 * Middleware Exports
 * @module api/middleware
 */

// CORS Middleware
export { createCorsMiddleware } from './cors.js';

// Error Handling
export { errorHandler, notFoundHandler, APIException } from './error.js';

// Authentication
export {
  authenticateToken,
  optionalAuth,
  requireOrganization,
  requireTeamAccess,
  extractBearerToken,
  getCurrentUser,
  hasRole,
  hasMinimumRole,
  type AuthUser,
  type UserRole,
  type AuthenticatedRequest
} from './auth.js';

// Role-Based Access Control
export {
  requireRole,
  requirePermission,
  requirePyramidLevel,
  requireOwnership,
  requireTeamMembership,
  checkPermission,
  roleHasPermission,
  isLevelAccessible,
  getRolePermissions,
  getAccessiblePyramidLevels,
  serializeUserPermissions,
  type PermissionAction,
  type ResourceType,
  type Permission,
  type PermissionConditions,
  type PermissionContext
} from './rbac.js';
