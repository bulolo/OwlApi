/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $AddUserRequest = {
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
        role: {
            type: 'Enum',
            isRequired: true,
        },
    },
} as const;
