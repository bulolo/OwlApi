/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AddMemberRequest } from '../models/AddMemberRequest';
import type { StatusResponse } from '../models/StatusResponse';
import type { TenantMember } from '../models/TenantMember';
import type { UpdateRoleRequest } from '../models/UpdateRoleRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class MembersService {
    /**
     * 成员列表
     * @param slug
     * @returns TenantMember OK
     * @throws ApiError
     */
    public static listMembers(
        slug: string,
    ): CancelablePromise<Array<TenantMember>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/tenants/{slug}/members',
            path: {
                'slug': slug,
            },
        });
    }
    /**
     * 邀请成员
     * @param slug
     * @param requestBody
     * @returns StatusResponse 添加成功
     * @throws ApiError
     */
    public static addMember(
        slug: string,
        requestBody: AddMemberRequest,
    ): CancelablePromise<StatusResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/tenants/{slug}/members',
            path: {
                'slug': slug,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * 修改成员角色
     * @param slug
     * @param userId
     * @param requestBody
     * @returns StatusResponse OK
     * @throws ApiError
     */
    public static updateMemberRole(
        slug: string,
        userId: string,
        requestBody: UpdateRoleRequest,
    ): CancelablePromise<StatusResponse> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/tenants/{slug}/members/{userId}/role',
            path: {
                'slug': slug,
                'userId': userId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * 移除成员
     * @param slug
     * @param userId
     * @returns StatusResponse OK
     * @throws ApiError
     */
    public static removeMember(
        slug: string,
        userId: string,
    ): CancelablePromise<StatusResponse> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/tenants/{slug}/members/{userId}',
            path: {
                'slug': slug,
                'userId': userId,
            },
        });
    }
}
