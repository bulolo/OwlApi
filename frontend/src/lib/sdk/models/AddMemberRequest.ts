/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type AddMemberRequest = {
    email: string;
    role: AddMemberRequest.role;
};
export namespace AddMemberRequest {
    export enum role {
        ADMIN = 'Admin',
        DEVELOPER = 'Developer',
        VIEWER = 'Viewer',
    }
}

