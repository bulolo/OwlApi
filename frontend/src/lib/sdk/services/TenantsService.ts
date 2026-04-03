/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CreateTenantRequest } from '../models/CreateTenantRequest';
import type { Tenant } from '../models/Tenant';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class TenantsService {
    /**
     * 租户列表
     * @returns Tenant OK
     * @throws ApiError
     */
    public static listTenants(): CancelablePromise<Array<Tenant>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/tenants',
        });
    }
    /**
     * 创建租户
     * @param requestBody
     * @returns Tenant 创建成功
     * @throws ApiError
     */
    public static createTenant(
        requestBody: CreateTenantRequest,
    ): CancelablePromise<Tenant> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/tenants',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                409: `slug 已存在`,
            },
        });
    }
    /**
     * 获取租户详情
     * @param slug
     * @returns Tenant OK
     * @throws ApiError
     */
    public static getTenant(
        slug: string,
    ): CancelablePromise<Tenant> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/tenants/{slug}',
            path: {
                'slug': slug,
            },
            errors: {
                404: `租户不存在`,
            },
        });
    }
}
