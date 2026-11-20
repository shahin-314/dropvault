const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendPasswordResetEmail(email, token) {
    const docsUrl = process.env.API_DOCS_URL || "http://localhost:3000/api-docs";

    const result = await resend.emails.send({
        from: "DropVault <onboarding@resend.dev>",
        to: email,
        subject: "DropVault Password Reset",
        html: `
            <h2>Password Reset Request</h2>
            <p>We received a request to reset your DropVault password.</p>
            <p>Your password reset token is:</p>
            <p style="font-size:18px;font-weight:bold;word-break:break-all">
                ${token}
            </p>
            <p>This token expires in 30 minutes and can only be used once.</p>
            <p>Open the API documentation to reset your password:</p>
            <a href="${docsUrl}">${docsUrl}</a>
            <p>If you did not request this, ignore this email.</p>
        `
    });

    if (result.error) {
        throw new Error(result.error.message);
    }

    return result;
}

module.exports = sendPasswordResetEmail;
