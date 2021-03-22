/**
 * Error used to signal that the user tried to access a document they don't have
 * permissions for.
 */
export class ForbiddenError extends Error {
    public status = 403;
}
/**
 * Error used to signal that an object does not exist.
 */
export class NotFoundError extends Error {
    public status = 404;
}

/**
 * Type used to carry validation errors in the form of an array of strings.
 */
export class ValidationError extends Error {
    constructor(public errors: string[]) {
        super(`ValidationError <${errors.length} error${errors.length !== 1 ? "s" : ""}>`);
    }

    toString(): string {
        return this.message;
    }
}
