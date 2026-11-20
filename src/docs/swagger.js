
const swaggerJsdoc = require("swagger-jsdoc");

const options = {
    definition: {
        openapi: "3.0.3",

        info: {
            title: "DropVault API",
            version: "1.0.0",
            description:
                "REST API for secure cloud file storage, user authentication and file management."
        },

        servers: [
            {
                url: "/",
                description: "Local development server"
            }
        ],

        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT"
                }
            }
        },

        paths: {
            // ===============================
            // HEALTH
            // ===============================
            "/api/health": {
                get: {
                    summary: "Check API health",
                    tags: ["Health"],
                    responses: {
                        200: {
                            description: "API is running"
                        }
                    }
                }
            },

            // ===============================
            // AUTHENTICATION
            // ===============================
            "/api/auth/register": {
                post: {
                    summary: "Register a new user",
                    tags: ["Authentication"],
                    requestBody: {
                        required: true,
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    required: ["name", "email", "password"],
                                    properties: {
                                        name: { type: "string", example: "Shahin" },
                                        email: { type: "string", example: "user@example.com" },
                                        password: { type: "string", example: "password123" }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        201: { description: "User registered" },
                        400: { description: "Required fields missing" },
                        409: { description: "Email already registered" }
                    }
                }
            },

            "/api/auth/login": {
                post: {
                    summary: "Login and receive JWT",
                    tags: ["Authentication"],
                    requestBody: {
                        required: true,
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    required: ["email", "password"],
                                    properties: {
                                        email: { type: "string", example: "user@example.com" },
                                        password: { type: "string", example: "password123" }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        200: { description: "Login successful; returns JWT" },
                        401: { description: "Invalid credentials" }
                    }
                }
            },

            "/api/auth/forgot-password": {
                post: {
                    summary: "Request a password reset email",
                    description: "Sends a password reset token to the registered email address. The token expires in 30 minutes.",
                    tags: ["Authentication"],
                    requestBody: {
                        required: true,
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    required: ["email"],
                                    properties: {
                                        email: {
                                            type: "string",
                                            format: "email",
                                            example: "user@example.com"
                                        }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        200: { description: "Generic password reset response" },
                        400: { description: "Valid email is required" },
                        500: { description: "Unable to process password reset request" }
                    }
                }
            },

            "/api/auth/reset-password": {
                post: {
                    summary: "Reset password using email token",
                    description: "Updates the password using a valid, unused reset token. Tokens expire after 30 minutes and can only be used once.",
                    tags: ["Authentication"],
                    requestBody: {
                        required: true,
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    required: ["token", "newPassword"],
                                    properties: {
                                        token: {
                                            type: "string",
                                            example: "64-character-reset-token"
                                        },
                                        newPassword: {
                                            type: "string",
                                            minLength: 8,
                                            example: "newpassword123"
                                        }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        200: { description: "Password reset successful" },
                        400: { description: "Missing fields, invalid password or expired token" },
                        500: { description: "Unable to reset password" }
                    }
                }
            },

            "/api/auth/profile": {
                get: {
                    summary: "Get logged-in user's profile",
                    tags: ["Authentication"],
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: { description: "User profile" },
                        401: { description: "Unauthorized" },
                        404: { description: "User not found" }
                    }
                }
            },

            // ===============================
            // FILE UPLOAD
            // ===============================
            "/api/files/upload": {
                post: {
                    summary: "Upload a file",
                    tags: ["Files"],
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            "multipart/form-data": {
                                schema: {
                                    type: "object",
                                    required: ["file"],
                                    properties: {
                                        file: {
                                            type: "string",
                                            format: "binary"
                                        }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        201: { description: "File uploaded successfully" },
                        400: { description: "No file uploaded" },
                        409: { description: "Duplicate file detected" },
                        413: { description: "File or storage limit exceeded" },
                        401: { description: "Unauthorized" }
                    }
                }
            },

            // ===============================
            // MY FILES
            // ===============================
            "/api/files/my-files": {
                get: {
                    summary: "List active files belonging to logged-in user",
                    tags: ["Files"],
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: { description: "List of active files" },
                        401: { description: "Unauthorized" }
                    }
                }
            },

            // ===============================
            // MOVE TO TRASH
            // ===============================
            "/api/files/{fileId}": {
                delete: {
                    summary: "Move a file to Trash",
                    description: "Soft-deletes a file. The actual file remains in storage and can be restored.",
                    tags: ["Files"],
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        {
                            name: "fileId",
                            in: "path",
                            required: true,
                            schema: { type: "string" }
                        }
                    ],
                    responses: {
                        200: { description: "File moved to Trash" },
                        404: { description: "File not found or already in Trash" },
                        401: { description: "Unauthorized" }
                    }
                }
            },

            // ===============================
            // VIEW TRASH
            // ===============================
            "/api/files/trash": {
                get: {
                    summary: "List files in Trash",
                    description: "Returns deleted files belonging to the logged-in user.",
                    tags: ["Files"],
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: { description: "List of trashed files" },
                        401: { description: "Unauthorized" }
                    }
                }
            },

            // ===============================
            // RESTORE FILE
            // ===============================
            "/api/files/{fileId}/restore": {
                patch: {
                    summary: "Restore a file from Trash",
                    description: "Restores a trashed file to the normal file list.",
                    tags: ["Files"],
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        {
                            name: "fileId",
                            in: "path",
                            required: true,
                            schema: { type: "string" }
                        }
                    ],
                    responses: {
                        200: { description: "File restored successfully" },
                        404: { description: "File not found in Trash" },
                        401: { description: "Unauthorized" }
                    }
                }
            },

            // ===============================
            // PERMANENT DELETE
            // ===============================
            "/api/files/{fileId}/permanent": {
                delete: {
                    summary: "Permanently delete a file",
                    description: "Permanently removes a trashed file from Supabase Storage and PostgreSQL. This action cannot be undone.",
                    tags: ["Files"],
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        {
                            name: "fileId",
                            in: "path",
                            required: true,
                            schema: { type: "string" }
                        }
                    ],
                    responses: {
                        200: { description: "File permanently deleted" },
                        404: { description: "File not found in Trash" },
                        500: { description: "Storage deletion failed" },
                        401: { description: "Unauthorized" }
                    }
                }
            },

            // ===============================
            // DOWNLOAD FILE
            // ===============================
            "/api/files/download/{fileId}": {
                get: {
                    summary: "Download a file",
                    tags: ["Files"],
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        {
                            name: "fileId",
                            in: "path",
                            required: true,
                            schema: { type: "string" }
                        }
                    ],
                    responses: {
                        200: { description: "File downloaded" },
                        404: { description: "File not found" },
                        401: { description: "Unauthorized" }
                    }
                }
            }
        }
    },

    apis: []
};

module.exports = swaggerJsdoc(options);
