/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $TenantMember = {
    properties: {
        tenant_id: {
            type: 'string',
        },
        user_id: {
            type: 'string',
        },
        role: {
            type: 'Enum',
        },
        joined_at: {
            type: 'string',
            format: 'date-time',
        },
        user: {
            type: 'User',
        },
    },
} as const;
