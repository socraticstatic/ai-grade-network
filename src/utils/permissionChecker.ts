/**
 * Permission Checker - Backward Compatible Export
 *
 * This file maintains backward compatibility while using the new
 * scope-aware permission checker under the hood.
 *
 * For new code, import from scopeAwarePermissionChecker directly.
 * For existing code, this provides the same API.
 */

export * from './scopeAwarePermissionChecker';
export { permissionChecker, scopeAwarePermissionChecker } from './scopeAwarePermissionChecker';
