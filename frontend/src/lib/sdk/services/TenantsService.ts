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
     * 租户列表 (分页)
     * @param page
     * @param size
     * @param isPager 0=不分页返回全量, 1=分页
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
     * @returns any 创建成功
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
