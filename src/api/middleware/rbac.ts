/**
 * Role-Based Access Control (RBAC) Middleware for PKA-STRAT API
 * Implements role-based permissions with pyramid level restrictions
 * @module api/middleware/rbac
 */
import { Response, NextFunction } from 'express';
import { APIException } from './error.js';
import { AuthenticatedRequest, AuthUser, UserRole, hasMinimumRole } from './auth.js';
import { PyramidLevel, PYRAMID_WEIGHTS } from '../../pka/types.js';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Permission action types
 */
export type PermissionAction = 'read' | 'create' | 'update' | 'delete' | 'manage';

/**
 * Resource types in the PKA-STRAT system
 */
export type ResourceType =
  | 'organization'
  | 'team'
  | 'pyramid_entity'
  | 'document'
  | 'alignment'
  | 'drift_alert'
  | 'report'
  | 'user';

/**
 * Permission definition for RBAC
 */
export interface Permission {
  resource: ResourceType;
  action: PermissionAction;
  conditions?: PermissionConditions;
}

/**
 * Conditional permission restrictions
 */
export interface PermissionConditions {
  /** Only own resources */
  ownOnly?: boolean;
  /** Only within user's team */
  teamScope?: boolean;
  /** Only within user's organization */
  orgScope?: boolean;
  /** Minimum pyramid level required */
  minPyramidLevel?: PyramidLevel;
  /** Maximum pyramid level allowed */
  maxPyramidLevel?: PyramidLevel;
}

/**
 * Role permission matrix
 */
type RolePermissions = Record<UserRole, Permission[]>;

// ============================================================================
// Permission Definitions
// ============================================================================

/**
 * Pyramid level hierarchy for access control
 * Lower index = higher strategic level = more restricted
 */
const PYRAMID_LEVEL_ORDER: PyramidLevel[] = [
  'mission',
  'vision',
  'objective',
  'goal',
  'portfolio',
  'program',
  'project',
  'task'
];

/**
 * Get pyramid level index (0 = mission, highest strategic level)
 */
function getPyramidLevelIndex(level: PyramidLevel): number {
  return PYRAMID_LEVEL_ORDER.indexOf(level);
}

/**
 * Check if a pyramid level is accessible based on min/max constraints
 */
export function isLevelAccessible(
  level: PyramidLevel,
  minLevel?: PyramidLevel,
  maxLevel?: PyramidLevel
): boolean {
  const levelIndex = getPyramidLevelIndex(level);

  if (minLevel) {
    const minIndex = getPyramidLevelIndex(minLevel);
    if (levelIndex < minIndex) return false;
  }

  if (maxLevel) {
    const maxIndex = getPyramidLevelIndex(maxLevel);
    if (levelIndex > maxIndex) return false;
  }

  return true;
}

/**
 * Default role-based permission matrix
 * Defines what each role can do with each resource type
 */
const DEFAULT_PERMISSIONS: RolePermissions = {
  leader: [
    // Leaders have full access to everything
    { resource: 'organization', action: 'manage' },
    { resource: 'team', action: 'manage' },
    { resource: 'pyramid_entity', action: 'manage' },
    { resource: 'document', action: 'manage' },
    { resource: 'alignment', action: 'manage' },
    { resource: 'drift_alert', action: 'manage' },
    { resource: 'report', action: 'manage' },
    { resource: 'user', action: 'manage' }
  ],
  manager: [
    // Managers have team-scoped access for most operations
    { resource: 'organization', action: 'read' },
    { resource: 'team', action: 'read' },
    { resource: 'team', action: 'update', conditions: { teamScope: true } },
    { resource: 'pyramid_entity', action: 'read' },
    { resource: 'pyramid_entity', action: 'create', conditions: { minPyramidLevel: 'portfolio' } },
    { resource: 'pyramid_entity', action: 'update', conditions: { minPyramidLevel: 'portfolio', teamScope: true } },
    { resource: 'document', action: 'read' },
    { resource: 'document', action: 'create' },
    { resource: 'document', action: 'update', conditions: { teamScope: true } },
    { resource: 'alignment', action: 'read' },
    { resource: 'drift_alert', action: 'read' },
    { resource: 'drift_alert', action: 'update', conditions: { teamScope: true } },
    { resource: 'report', action: 'read' },
    { resource: 'report', action: 'create' },
    { resource: 'user', action: 'read', conditions: { teamScope: true } }
  ],
  member: [
    // Members have limited access, mostly read-only
    { resource: 'organization', action: 'read' },
    { resource: 'team', action: 'read', conditions: { teamScope: true } },
    { resource: 'pyramid_entity', action: 'read' },
    { resource: 'pyramid_entity', action: 'create', conditions: { minPyramidLevel: 'project' } },
    { resource: 'pyramid_entity', action: 'update', conditions: { minPyramidLevel: 'project', ownOnly: true } },
    { resource: 'document', action: 'read' },
    { resource: 'document', action: 'create' },
    { resource: 'document', action: 'update', conditions: { ownOnly: true } },
    { resource: 'alignment', action: 'read' },
    { resource: 'drift_alert', action: 'read', conditions: { teamScope: true } },
    { resource: 'report', action: 'read', conditions: { teamScope: true } },
    { resource: 'user', action: 'read', conditions: { ownOnly: true } }
  ]
};

// ============================================================================
// Permission Checking Functions
// ============================================================================

/**
 * Check if a role has a specific permission
 */
export function roleHasPermission(
  role: UserRole,
  resource: ResourceType,
  action: PermissionAction
): Permission | null {
  const permissions = DEFAULT_PERMISSIONS[role];

  // Check for exact permission or 'manage' (which grants all actions)
  for (const permission of permissions) {
    if (permission.resource === resource) {
      if (permission.action === action || permission.action === 'manage') {
        return permission;
      }
    }
  }

  return null;
}

/**
 * Evaluate permission conditions against request context
 */
export function evaluateConditions(
  conditions: PermissionConditions | undefined,
  user: AuthUser,
  context: PermissionContext
): boolean {
  if (!conditions) return true;

  // Check own-only restriction
  if (conditions.ownOnly && context.ownerId && context.ownerId !== user.id) {
    return false;
  }

  // Check team scope restriction
  if (conditions.teamScope && context.teamId && user.teamId !== context.teamId) {
    // Managers can access any team in their org
    if (user.role !== 'manager' && user.role !== 'leader') {
      return false;
    }
  }

  // Check organization scope restriction
  if (conditions.orgScope && context.organizationId && user.organizationId !== context.organizationId) {
    return false;
  }

  // Check pyramid level restrictions
  if (context.pyramidLevel) {
    if (!isLevelAccessible(context.pyramidLevel, conditions.minPyramidLevel, conditions.maxPyramidLevel)) {
      return false;
    }
  }

  return true;
}

/**
 * Context for permission evaluation
 */
export interface PermissionContext {
  /** Owner ID of the resource */
  ownerId?: string;
  /** Team ID of the resource */
  teamId?: string;
  /** Organization ID of the resource */
  organizationId?: string;
  /** Pyramid level for entity operations */
  pyramidLevel?: PyramidLevel;
}

/**
 * Check if user has permission for a resource action with context
 */
export function checkPermission(
  user: AuthUser,
  resource: ResourceType,
  action: PermissionAction,
  context: PermissionContext = {}
): boolean {
  const permission = roleHasPermission(user.role, resource, action);

  if (!permission) {
    return false;
  }

  return evaluateConditions(permission.conditions, user, context);
}

// ============================================================================
// Middleware Factory Functions
// ============================================================================

/**
 * Require specific role middleware factory
 * Creates middleware that checks if user has at least the specified role
 *
 * Usage:
 * ```typescript
 * router.post('/settings', requireRole('manager'), handler);
 * router.delete('/org', requireRole('leader'), handler);
 * ```
 */
export function requireRole(minimumRole: UserRole) {
  return function roleMiddleware(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void {
    const user = req.user;

    if (!user) {
      next(new APIException(401, 'NOT_AUTHENTICATED', 'Authentication required'));
      return;
    }

    if (!hasMinimumRole(user, minimumRole)) {
      next(new APIException(
        403,
        'INSUFFICIENT_ROLE',
        `This action requires ${minimumRole} role or higher`
      ));
      return;
    }

    next();
  };
}

/**
 * Require permission middleware factory
 * Creates middleware that checks specific resource/action permissions
 *
 * Usage:
 * ```typescript
 * router.post('/entities', requirePermission('pyramid_entity', 'create'), handler);
 * router.delete('/entities/:id', requirePermission('pyramid_entity', 'delete'), handler);
 * ```
 */
export function requirePermission(resource: ResourceType, action: PermissionAction) {
  return function permissionMiddleware(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void {
    const user = req.user;

    if (!user) {
      next(new APIException(401, 'NOT_AUTHENTICATED', 'Authentication required'));
      return;
    }

    // Build context from request
    const context: PermissionContext = {
      ownerId: req.body?.ownerId || req.params?.ownerId,
      teamId: req.body?.teamId || req.params?.teamId,
      organizationId: req.body?.organizationId || req.params?.organizationId || user.organizationId,
      pyramidLevel: req.body?.level || req.params?.level as PyramidLevel
    };

    if (!checkPermission(user, resource, action, context)) {
      next(new APIException(
        403,
        'PERMISSION_DENIED',
        `You do not have permission to ${action} ${resource}`
      ));
      return;
    }

    next();
  };
}

/**
 * Require pyramid level access middleware factory
 * Creates middleware that checks if user can access a specific pyramid level
 *
 * Usage:
 * ```typescript
 * router.put('/mission', requirePyramidLevel('mission'), handler);
 * router.post('/objectives', requirePyramidLevel('objective'), handler);
 * ```
 */
export function requirePyramidLevel(level: PyramidLevel, action: PermissionAction = 'update') {
  return function pyramidLevelMiddleware(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void {
    const user = req.user;

    if (!user) {
      next(new APIException(401, 'NOT_AUTHENTICATED', 'Authentication required'));
      return;
    }

    const context: PermissionContext = {
      pyramidLevel: level,
      organizationId: user.organizationId
    };

    if (!checkPermission(user, 'pyramid_entity', action, context)) {
      const levelWeight = PYRAMID_WEIGHTS[level];
      const requiredRole = levelWeight >= 0.85 ? 'leader' : levelWeight >= 0.55 ? 'manager' : 'member';

      next(new APIException(
        403,
        'PYRAMID_LEVEL_DENIED',
        `${action} operations on ${level} level require ${requiredRole} role`
      ));
      return;
    }

    next();
  };
}

/**
 * Require ownership middleware
 * Ensures user owns the resource or has elevated permissions
 *
 * Usage:
 * ```typescript
 * router.delete('/documents/:id', requireOwnership('ownerId'), handler);
 * ```
 */
export function requireOwnership(ownerField: string = 'ownerId') {
  return function ownershipMiddleware(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void {
    const user = req.user;

    if (!user) {
      next(new APIException(401, 'NOT_AUTHENTICATED', 'Authentication required'));
      return;
    }

    // Leaders and managers bypass ownership check
    if (user.role === 'leader' || user.role === 'manager') {
      next();
      return;
    }

    // Check ownership
    const ownerId = req.params[ownerField] || req.body?.[ownerField];
    if (ownerId && ownerId !== user.id) {
      next(new APIException(403, 'NOT_OWNER', 'You can only modify your own resources'));
      return;
    }

    next();
  };
}

/**
 * Require team membership middleware
 * Ensures user belongs to the team being accessed
 */
export function requireTeamMembership() {
  return function teamMiddleware(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void {
    const user = req.user;

    if (!user) {
      next(new APIException(401, 'NOT_AUTHENTICATED', 'Authentication required'));
      return;
    }

    // Leaders bypass team check
    if (user.role === 'leader') {
      next();
      return;
    }

    const requestedTeamId = req.params.teamId || req.body?.teamId;

    // Managers can access any team in their org
    if (user.role === 'manager') {
      // Additional org check could be added here if needed
      next();
      return;
    }

    // Members must belong to the team
    if (requestedTeamId && user.teamId !== requestedTeamId) {
      next(new APIException(403, 'TEAM_ACCESS_DENIED', 'You do not have access to this team'));
      return;
    }

    next();
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: UserRole): Permission[] {
  return DEFAULT_PERMISSIONS[role] || [];
}

/**
 * Get accessible pyramid levels for a role
 */
export function getAccessiblePyramidLevels(role: UserRole, action: PermissionAction): PyramidLevel[] {
  const permission = roleHasPermission(role, 'pyramid_entity', action);

  if (!permission) {
    return [];
  }

  if (permission.action === 'manage') {
    return [...PYRAMID_LEVEL_ORDER];
  }

  const minLevel = permission.conditions?.minPyramidLevel;
  const maxLevel = permission.conditions?.maxPyramidLevel;

  return PYRAMID_LEVEL_ORDER.filter(level =>
    isLevelAccessible(level, minLevel, maxLevel)
  );
}

/**
 * Serialize permissions for API response
 */
export function serializeUserPermissions(user: AuthUser): Record<string, string[]> {
  const permissions = getRolePermissions(user.role);
  const result: Record<string, string[]> = {};

  for (const permission of permissions) {
    if (!result[permission.resource]) {
      result[permission.resource] = [];
    }
    if (!result[permission.resource].includes(permission.action)) {
      result[permission.resource].push(permission.action);
    }
  }

  return result;
}
