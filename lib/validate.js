const { createHttpError } = require('./http-error');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeString(value) {
    if (value === null || value === undefined) return '';
    return String(value).trim();
}

function toNullableString(value, maxLength, fieldName) {
    const normalized = normalizeString(value);
    if (!normalized) return null;
    if (normalized.length > maxLength) {
        throw createHttpError(400, 'VALIDATION_ERROR', `${fieldName} must be at most ${maxLength} characters long`);
    }
    return normalized;
}

function toOptionalPositiveInt(value, fieldName) {
    if (value === undefined || value === null || value === '') return null;
    const parsed = Number.parseInt(String(value), 10);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        throw createHttpError(400, 'VALIDATION_ERROR', `${fieldName} must be a positive integer`);
    }
    return parsed;
}

function validateWebsite(url) {
    if (!url) return null;
    try {
        const parsed = new URL(url);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            throw new Error('invalid protocol');
        }
        return parsed.toString();
    } catch (_) {
        throw createHttpError(400, 'VALIDATION_ERROR', 'Invalid website URL');
    }
}

function validateCreateCommentInput(postId, payload) {
    const normalizedPostId = normalizeString(postId);
    if (!normalizedPostId) {
        throw createHttpError(400, 'VALIDATION_ERROR', 'Post ID is required');
    }
    if (normalizedPostId.length > 1000) {
        throw createHttpError(400, 'VALIDATION_ERROR', 'Post ID must be at most 1000 characters long');
    }

    const username = normalizeString(payload.username);
    if (!username) {
        throw createHttpError(400, 'VALIDATION_ERROR', 'Name is required');
    }
    if (username.length < 3 || username.length > 15) {
        throw createHttpError(400, 'VALIDATION_ERROR', 'Name must be 3-15 characters long');
    }

    const content = String(payload.content ?? '');
    if (content.trim().length < 5 || content.length > 1000) {
        throw createHttpError(400, 'VALIDATION_ERROR', 'Comment content must be 5-1000 characters long');
    }

    const email = toNullableString(payload.email, 120, 'Email');
    if (email && !EMAIL_REGEX.test(email)) {
        throw createHttpError(400, 'VALIDATION_ERROR', 'Invalid email address');
    }

    const websiteRaw = toNullableString(payload.website, 300, 'Website URL');
    const website = validateWebsite(websiteRaw);

    const parentId = toOptionalPositiveInt(payload.parent_id, 'parent_id');
    const replyTo = toOptionalPositiveInt(payload.reply_to, 'reply_to');
    if (replyTo && !parentId) {
        throw createHttpError(400, 'VALIDATION_ERROR', 'reply_to requires parent_id');
    }

    return {
        postId: normalizedPostId,
        username,
        email,
        website,
        content,
        parentId,
        replyTo,
    };
}

function validateListCommentsInput(postId, pageRaw, limitRaw) {
    const normalizedPostId = normalizeString(postId);
    if (!normalizedPostId) {
        throw createHttpError(400, 'VALIDATION_ERROR', 'Post ID is required');
    }

    const page = Number.parseInt(String(pageRaw ?? 1), 10);
    const limit = Number.parseInt(String(limitRaw ?? 10), 10);

    if (!Number.isInteger(page) || page <= 0) {
        throw createHttpError(400, 'VALIDATION_ERROR', 'page must be a positive integer');
    }
    if (!Number.isInteger(limit) || limit <= 0 || limit > 50) {
        throw createHttpError(400, 'VALIDATION_ERROR', 'limit must be an integer between 1 and 50');
    }

    return { postId: normalizedPostId, page, limit };
}

function validateLatestCommentsInput(siteRaw, limitRaw) {
    const site = normalizeString(siteRaw);
    const limit = Number.parseInt(String(limitRaw ?? 5), 10);

    if (!Number.isInteger(limit) || limit <= 0 || limit > 20) {
        throw createHttpError(400, 'VALIDATION_ERROR', 'limit must be an integer between 1 and 20');
    }

    return { site, limit };
}

function validateVoteInput(postId, valueRaw) {
    const normalizedPostId = normalizeString(postId);
    if (!normalizedPostId) {
        throw createHttpError(400, 'VALIDATION_ERROR', 'Post ID is required');
    }

    const value = Number(valueRaw);
    if (![-1, 0, 1].includes(value)) {
        throw createHttpError(400, 'VALIDATION_ERROR', 'Vote value must be -1, 0, or 1');
    }

    return { postId: normalizedPostId, value };
}

module.exports = {
    validateCreateCommentInput,
    validateListCommentsInput,
    validateLatestCommentsInput,
    validateVoteInput,
};
