import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class CacheService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async get<T>(key: string): Promise<T | null> {
    const value = await this.cacheManager.get<T>(key);
    return value ?? null;
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    await this.cacheManager.set(key, value, ttl);
  }

  async del(key: string): Promise<void> {
    await this.cacheManager.del(key);
  }

  reset(): void {
    // Note: reset() is not available in cache-manager v5+
    // We'll need to implement a custom solution if needed
    // For now, we'll just log a warning
    console.warn(
      'Cache reset is not supported in this version of cache-manager',
    );
  }

  // Permission cache helpers
  async getUserPermissions(userId: string): Promise<any[] | null> {
    return await this.get<any[]>(`permissions:user:${userId}`);
  }

  async setUserPermissions(
    userId: string,
    permissions: any[],
    ttl = 3600000,
  ): Promise<void> {
    await this.set(`permissions:user:${userId}`, permissions, ttl);
  }

  async invalidateUserCache(userId: string): Promise<void> {
    await this.del(`permissions:user:${userId}`);
  }

  async invalidateRoleCache(roleId: string): Promise<void> {
    // This will be implemented when we need to invalidate all users with a specific role
    // For now, we'll just delete the role-specific cache key
    await this.del(`permissions:role:${roleId}`);
  }

  // Organization cache helpers
  async getOrganizationSettings(orgId: string): Promise<any> {
    return await this.get<any>(`organization:settings:${orgId}`);
  }

  async setOrganizationSettings(
    orgId: string,
    settings: any,
    ttl = 3600000,
  ): Promise<void> {
    await this.set(`organization:settings:${orgId}`, settings, ttl);
  }

  async invalidateOrganizationCache(orgId: string): Promise<void> {
    await this.del(`organization:settings:${orgId}`);
  }

  // Policy cache helpers
  async getPolicies(
    orgId: string,
    resource: string,
    action: string,
  ): Promise<any[] | null> {
    return await this.get<any[]>(`policies:${orgId}:${resource}:${action}`);
  }

  async setPolicies(
    orgId: string,
    resource: string,
    action: string,
    policies: any[],
    ttl = 1800000,
  ): Promise<void> {
    await this.set(`policies:${orgId}:${resource}:${action}`, policies, ttl);
  }

  async invalidatePolicyCache(orgId: string): Promise<void> {
    // Invalidate all policy caches for this organization
    // This is a simplified implementation - in production, you might want to use Redis SCAN
    await this.del(`policies:${orgId}:*`);
  }

  // Session cache helpers
  async getSession(sessionId: string): Promise<any> {
    return await this.get<any>(`session:${sessionId}`);
  }

  async setSession(
    sessionId: string,
    session: any,
    ttl = 3600000,
  ): Promise<void> {
    await this.set(`session:${sessionId}`, session, ttl);
  }

  async invalidateSessionCache(sessionId: string): Promise<void> {
    await this.del(`session:${sessionId}`);
  }
}
