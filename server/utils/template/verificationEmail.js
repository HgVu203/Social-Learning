export const templateVerificationEmail = (code) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h1 style="color: #333; text-align: center; margin-bottom: 20px;">Verify Your Email</h1>
        <p style="color: #555; line-height: 1.5;">Thank you for registering. Please use the following 6-digit verification code to complete your registration:</p>
        
        <div style="background-color: #f8f8f8; padding: 15px; text-align: center; border-radius: 5px; margin: 20px 0;">
            <h2 style="font-size: 28px; letter-spacing: 5px; color: #333; margin: 0;">${code}</h2>
        </div>
        
        <p style="color: #555; line-height: 1.5;">This code will expire after 1 hour. If you did not request this code, please ignore this email.</p>
        
        <div style="margin-top: 30px; color: #777; font-size: 12px; text-align: center;">
            <p>This is an automated email, please do not reply.</p>
        </div>
    </div>
`;
