/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { User } from './User';
export type TenantMember = {
    tenant_id?: string;
    user_id?: string;
    role?: TenantMember.role;
    joined_at?: string;
    user?: User;
};
export namespace TenantMember {
    export enum role {
        ADMIN = 'Admin',
        VIEWER = 'Viewer',
    }
}

