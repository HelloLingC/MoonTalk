class HttpError extends Error {
    constructor(status, code, message, details) {
        super(message);
        this.name = 'HttpError';
        this.status = status;
        this.code = code;
        this.details = details;
    }
}

function createHttpError(status, code, message, details) {
    return new HttpError(status, code, message, details);
}

module.exports = {
    HttpError,
    createHttpError,
};
