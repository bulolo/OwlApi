/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $RegisterRequest = {
    properties: {
        email: {
            type: 'string',
            isRequired: true,
            format: 'email',
        },
        name: {
            type: 'string',
            isRequired: true,
        },
        password: {
            type: 'string',
            isRequired: true,
            format: 'password',
        },
        tenant_name: {
            type: 'string',
        },
        tenant_slug: {
            type: 'string',
        },
    },
} as const;
