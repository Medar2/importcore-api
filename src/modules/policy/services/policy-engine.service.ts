import { Injectable, Logger } from '@nestjs/common';
import { Policy } from '../entities/policy.entity';

/**
 * Tipos de operadores de comparación
 */
export type ComparisonOperator =
  | 'eq'
  | 'ne'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'nin'
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'regex';

/**
 * Una regla individual en una política
 */
export interface PolicyRule {
  field: string;
  operator: ComparisonOperator;
  value: any;
}

/**
 * Condiciones de una política
 */
export interface PolicyConditions {
  type: 'allow' | 'deny';
  rules: PolicyRule[];
  logic: 'AND' | 'OR';
}

/**
 * Contexto para evaluación de políticas
 */
export interface PolicyEvaluationContext {
  userId?: string;
  userEmail?: string;
  userRoles?: string[];
  userDepartment?: string;
  organizationId?: string;
  resource?: string;
  resourceId?: string;
  action?: string;
  time?: {
    hour: number;
    minute: number;
    dayOfWeek: number;
    dayOfMonth: number;
  };
  ipAddress?: string;
  [key: string]: any;
}

/**
 * Resultado de evaluación de políticas
 */
export interface PolicyEvaluationResult {
  allowed: boolean;
  policyId: string;
  policyName: string;
  reason?: string;
  matchedRules?: number[];
}

/**
 * Motor de evaluación de políticas dinámicas
 */
@Injectable()
export class PolicyEngine {
  private readonly logger = new Logger(PolicyEngine.name);

  /**
   * Evalúa todas las políticas aplicables para un contexto dado
   * @param policies Lista de políticas a evaluar
   * @param context Contexto de evaluación
   * @returns true si el acceso es permitido, false si es denegado
   */
  async evaluatePolicies(
    policies: Policy[],
    context: PolicyEvaluationContext,
  ): Promise<boolean> {
    if (!policies || policies.length === 0) {
      return true; // Si no hay políticas, permitir acceso
    }

    // Ordenar políticas por prioridad (mayor prioridad primero)
    const sortedPolicies = [...policies].sort(
      (a, b) => b.priority - a.priority,
    );

    this.logger.debug(
      `Evaluating ${sortedPolicies.length} policies for user ${context.userId}`,
    );

    for (const policy of sortedPolicies) {
      const result = await this.evaluatePolicy(policy, context);

      if (!result.allowed) {
        // Política DENY - denegar inmediatamente
        this.logger.debug(
          `Policy ${policy.name} (${policy.id}) denied access: ${result.reason}`,
        );
        return false;
      }
    }

    // Todas las políticas evaluadas permiten acceso
    return true;
  }

  /**
   * Evalúa una política específica
   */
  async evaluatePolicy(
    policy: Policy,
    context: PolicyEvaluationContext,
  ): Promise<PolicyEvaluationResult> {
    // Verificar si la política está activa
    if (!policy.isActive) {
      return {
        allowed: true,
        policyId: policy.id,
        policyName: policy.name,
        reason: 'Policy is inactive',
      };
    }

    // Verificar si la política aplica al módulo
    if (policy.modules && policy.modules.length > 0) {
      const moduleMatch = policy.modules.some((m) =>
        context.resource?.toLowerCase().startsWith(m.toLowerCase()),
      );
      if (!moduleMatch) {
        return {
          allowed: true,
          policyId: policy.id,
          policyName: policy.name,
          reason: 'Policy does not apply to this module',
        };
      }
    }

    // Verificar si la política aplica al recurso
    if (policy.resources && policy.resources.length > 0) {
      const resourceMatch = policy.resources.includes(context.resource || '');
      if (!resourceMatch) {
        return {
          allowed: true,
          policyId: policy.id,
          policyName: policy.name,
          reason: 'Policy does not apply to this resource',
        };
      }
    }

    // Verificar si la política aplica a la acción
    if (policy.actions && policy.actions.length > 0) {
      const actionMatch = policy.actions.includes(context.action || '');
      if (!actionMatch) {
        return {
          allowed: true,
          policyId: policy.id,
          policyName: policy.name,
          reason: 'Policy does not apply to this action',
        };
      }
    }

    // Evaluar las condiciones de la política
    const conditions = policy.conditions as PolicyConditions;
    if (!conditions || !conditions.rules || conditions.rules.length === 0) {
      // Sin reglas, permitir por defecto
      return {
        allowed: true,
        policyId: policy.id,
        policyName: policy.name,
      };
    }

    const matchedRules = await this.evaluateRules(
      conditions.rules,
      conditions.logic,
      context,
    );

    const allowed =
      conditions.type === 'allow'
        ? matchedRules.length > 0
        : matchedRules.length === 0;

    return {
      allowed,
      policyId: policy.id,
      policyName: policy.name,
      reason: allowed
        ? `Policy conditions met (${matchedRules.length} rules matched)`
        : `Policy conditions not met`,
      matchedRules,
    };
  }

  /**
   * Evalúa un conjunto de reglas con lógica AND/OR
   */
  async evaluateRules(
    rules: PolicyRule[],
    logic: 'AND' | 'OR',
    context: PolicyEvaluationContext,
  ): Promise<number[]> {
    const matchedRules: number[] = [];

    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i];
      const matches = await this.evaluateRule(rule, context);

      if (matches) {
        matchedRules.push(i);
      }

      // Optimización: si es OR y hay match, terminar temprano
      if (logic === 'OR' && matches) {
        break;
      }

      // Optimización: si es AND y no hay match, terminar temprano
      if (logic === 'AND' && !matches) {
        break;
      }
    }

    return matchedRules;
  }

  /**
   * Evalúa una regla individual
   */
  async evaluateRule(
    rule: PolicyRule,
    context: PolicyEvaluationContext,
  ): Promise<boolean> {
    // Obtener el valor del campo del contexto
    const fieldValue = this.getNestedValue(context, rule.field);

    if (fieldValue === undefined || fieldValue === null) {
      return false;
    }

    // Evaluar según el operador
    return this.compare(fieldValue, rule.operator, rule.value);
  }

  /**
   * Obtiene un valor anidado de un objeto usando notación de punto
   * Soporta: user.department, time.hour, etc.
   */
  getNestedValue(obj: any, path: string): any {
    if (!obj || !path) {
      return undefined;
    }

    // Manejar valores especiales
    if (path === 'time.hour') {
      return new Date().getHours();
    }
    if (path === 'time.minute') {
      return new Date().getMinutes();
    }
    if (path === 'time.dayOfWeek') {
      return new Date().getDay();
    }
    if (path === 'time.dayOfMonth') {
      return new Date().getDate();
    }

    // Obtener valor anidado
    const keys = path.split('.');
    let value = obj;

    for (const key of keys) {
      if (value === undefined || value === null) {
        return undefined;
      }
      value = value[key];
    }

    return value;
  }

  /**
   * Compara dos valores usando un operador
   */
  private compare(
    value: any,
    operator: ComparisonOperator,
    expected: any,
  ): boolean {
    switch (operator) {
      case 'eq':
        return value === expected;

      case 'ne':
        return value !== expected;

      case 'gt':
        return value > expected;

      case 'gte':
        return value >= expected;

      case 'lt':
        return value < expected;

      case 'lte':
        return value <= expected;

      case 'in':
        return Array.isArray(expected) && expected.includes(value);

      case 'nin':
        return Array.isArray(expected) && !expected.includes(value);

      case 'contains':
        if (typeof value === 'string') {
          return value.includes(expected);
        }
        if (Array.isArray(value)) {
          return value.includes(expected);
        }
        return false;

      case 'startsWith':
        return typeof value === 'string' && value.startsWith(expected);

      case 'endsWith':
        return typeof value === 'string' && value.endsWith(expected);

      case 'regex':
        if (typeof value === 'string' && typeof expected === 'string') {
          const regex = new RegExp(expected);
          return regex.test(value);
        }
        return false;

      default:
        this.logger.warn(`Unknown operator: ${String(operator)}`);
        return false;
    }
  }
}
