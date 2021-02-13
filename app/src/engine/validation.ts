/**
 * Type used to carry validation errors in the form of an array of strings.
 */
class ValidationError extends Error {
    constructor(public errors: string[]) {
        super(`ValidationError <${errors.length} error${errors.length !== 1 ? "s" : ""}>`);
    }

    toString(): string {
        return this.message;
    }
}

export default ValidationError;
