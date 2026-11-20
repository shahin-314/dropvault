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

            "/api/files/my-files": {
                get: {
                    summary: "List logged-in user's files",
                    tags: ["Files"],
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: { description: "List of files" },
                        401: { description: "Unauthorized" }
                    }
                }
            },

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
            },

            "/api/files/{fileId}": {
                delete: {
                    summary: "Delete a file",
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
                        200: { description: "File deleted" },
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
