/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { User } from './User';
export type TenantUser = {
    tenant_id?: number;
    user_id?: number;
    role?: TenantUser.role;
    joined_at?: string;
    user?: User;
};
export namespace TenantUser {
    export enum role {
        ADMIN = 'Admin',
        VIEWER = 'Viewer',
    }
}

