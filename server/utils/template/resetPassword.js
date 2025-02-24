export const templateResetPassword = (resetUrl) => `
    <h1>Password Reset</h1>
    <p>You are receiving this because you (or someone else) requested a password reset.</p>
    <p>Please click on the following link to complete the process:</p>
    <a href="${resetUrl}">Reset Password</a>
    <p>If you did not request this, please ignore this email.</p>
`;