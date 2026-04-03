/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AddMemberRequest } from '../models/AddMemberRequest';
import type { UpdateRoleRequest } from '../models/UpdateRoleRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class UsersService {
    /**
     * 用户列表 (分页)
     * @param slug
     * @param page
     * @param size
     * @returns any OK
     * @throws ApiError
     */
    public static listUsers(
        slug: string,
        page: number = 1,
        size: number = 10,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/tenants/{slug}/users',
            path: {
                'slug': slug,
            },
            query: {
                'page': page,
                'size': size,
            },
        });
    }
    /**
     * 添加用户
     * @param slug
     * @param requestBody
     * @returns any 添加成功
     * @throws ApiError
     */
    public static addUser(
        slug: string,
        requestBody: AddMemberRequest,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/tenants/{slug}/users',
            path: {
                'slug': slug,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * 修改用户角色
     * @param slug
     * @param userId
     * @param requestBody
     * @returns any OK
     * @throws ApiError
     */
    public static updateUserRole(
        slug: string,
        userId: string,
        requestBody: UpdateRoleRequest,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/tenants/{slug}/users/{userId}/role',
            path: {
                'slug': slug,
                'userId': userId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * 移除用户
     * @param slug
     * @param userId
     * @returns any OK
     * @throws ApiError
     */
    public static removeUser(
        slug: string,
        userId: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/tenants/{slug}/users/{userId}',
            path: {
                'slug': slug,
                'userId': userId,
            },
        });
    }
}
