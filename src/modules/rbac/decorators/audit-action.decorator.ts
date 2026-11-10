import { SetMetadata } from '@nestjs/common';

export const AUDIT_ACTION_KEY = 'auditAction';

/**
 * Decorator to mark actions for special audit logging
 * @param action - The action name to be logged in audit trail
 * @example
 * @AuditAction('USER_CREATION')
 * @AuditAction('SENSITIVE_DATA_ACCESS')
 */
export const AuditAction = (action: string) =>
  SetMetadata(AUDIT_ACTION_KEY, action);
