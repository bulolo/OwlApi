/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $CreateTenantRequest = {
    properties: {
        name: {
            type: 'string',
            isRequired: true,
        },
        slug: {
            type: 'string',
            isRequired: true,
        },
        plan: {
            type: 'Enum',
        },
        user_id: {
            type: 'string',
            isRequired: true,
        },
    },
} as const;
