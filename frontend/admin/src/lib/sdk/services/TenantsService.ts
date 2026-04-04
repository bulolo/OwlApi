/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CreateTenantRequest } from '../models/CreateTenantRequest';
import type { UpdateTenantRequest } from '../models/UpdateTenantRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class TenantsService {
    /**
     * 当前用户的租户列表
     * @param page
     * @param size
     * @returns any OK
     * @throws ApiError
     */
    public static myTenants(
        page: number = 1,
        size: number = 10,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/my/tenants',
            query: {
                'page': page,
                'size': size,
            },
        });
    }
    /**
     * 租户列表 (SuperAdmin)
     * @param page
     * @param size
     * @param isPager
     * @returns any OK
     * @throws ApiError
     */
    public static listTenants(
        page: number = 1,
        size: number = 10,
        isPager: number = 1,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/tenants',
            query: {
                'page': page,
                'size': size,
                'is_pager': isPager,
            },
        });
    }
    /**
     * 创建租户
     * @param requestBody
     * @returns any OK
     * @throws ApiError
     */
    public static createTenant(
        requestBody: CreateTenantRequest,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/tenants',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * 获取租户详情
     * @param slug
     * @returns any OK
     * @throws ApiError
     */
    public static getTenant(
        slug: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/tenants/{slug}',
            path: {
                'slug': slug,
            },
        });
    }
    /**
     * 编辑租户
     * @param slug
     * @param requestBody
     * @returns any OK
     * @throws ApiError
     */
    public static updateTenant(
        slug: string,
        requestBody: UpdateTenantRequest,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/tenants/{slug}',
            path: {
                'slug': slug,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * 删除租户
     * @param slug
     * @returns any OK
     * @throws ApiError
     */
    public static deleteTenant(
        slug: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/tenants/{slug}',
            path: {
                'slug': slug,
            },
        });
    }
}
