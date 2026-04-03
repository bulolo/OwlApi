/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $AddMemberRequest = {
    properties: {
        email: {
            type: 'string',
            isRequired: true,
            format: 'email',
        },
        role: {
            type: 'Enum',
            isRequired: true,
        },
    },
} as const;
