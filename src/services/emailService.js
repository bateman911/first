const nodemailer = require('nodemailer');

let transporter = null;
let emailEnabled = false;

// Initialize email service with better error handling
async function initializeEmailService() {
    try {
        // Check if all required SMTP environment variables are present
        const requiredVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];
        const missingVars = requiredVars.filter(varName => !process.env[varName]);
        
        if (missingVars.length > 0) {
            console.log(`⚠️  Email service disabled: Missing environment variables: ${missingVars.join(', ')}`);
            return;
        }

        // Create transporter with timeout and connection settings
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            },
            connectionTimeout: 10000, // 10 seconds
            greetingTimeout: 10000, // 10 seconds
            socketTimeout: 10000, // 10 seconds
        });

        // Test the connection with a timeout
        const testConnection = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Connection test timeout'));
            }, 15000); // 15 second timeout

            transporter.verify((error, success) => {
                clearTimeout(timeout);
                if (error) {
                    reject(error);
                } else {
                    resolve(success);
                }
            });
        });

        await testConnection;
        emailEnabled = true;
        console.log('✅ Email service initialized successfully');
        
    } catch (error) {
        console.log(`⚠️  SMTP configuration error: ${error.message}`);
        console.log('📧 Email functionality will be disabled');
        emailEnabled = false;
        transporter = null;
    }
}

// Send email function with fallback
async function sendEmail(to, subject, text, html) {
    if (!emailEnabled || !transporter) {
        console.log(`📧 Email would be sent to ${to}: ${subject}`);
        console.log(`📧 Content: ${text}`);
        return { success: false, message: 'Email service not available' };
    }

    try {
        const mailOptions = {
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to,
            subject,
            text,
            html
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent successfully:', info.messageId);
        return { success: true, messageId: info.messageId };
        
    } catch (error) {
        console.error('❌ Failed to send email:', error.message);
        return { success: false, message: error.message };
    }
}

// Send verification email
async function sendVerificationEmail(email, token) {
    const verificationUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/verify-email?token=${token}`;
    
    const subject = 'Verify your Big Win Hockey account';
    const text = `Please verify your email by clicking this link: ${verificationUrl}`;
    const html = `
        <h2>Welcome to Big Win Hockey!</h2>
        <p>Please verify your email address by clicking the link below:</p>
        <a href="${verificationUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Verify Email</a>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p>${verificationUrl}</p>
    `;
    
    return await sendEmail(email, subject, text, html);
}

// Send password reset email
async function sendPasswordResetEmail(email, token) {
    const resetUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
    
    const subject = 'Reset your Big Win Hockey password';
    const text = `Reset your password by clicking this link: ${resetUrl}`;
    const html = `
        <h2>Password Reset Request</h2>
        <p>You requested to reset your password. Click the link below to set a new password:</p>
        <a href="${resetUrl}" style="background-color: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p>${resetUrl}</p>
        <p>If you didn't request this, please ignore this email.</p>
    `;
    
    return await sendEmail(email, subject, text, html);
}

// Send support email
async function sendSupportEmail(userEmail, subject, message) {
    const mailOptions = {
        from: `"${process.env.APP_NAME || 'Hockey GM Support'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`, // Sender
        to: process.env.SUPPORT_EMAIL_TO || process.env.SMTP_USER, // Recipient (your support email)
        replyTo: userEmail, // So replies go directly to the user
        subject: `[Support Ticket] ${subject} (from ${userEmail})`, // Email subject
        text: `Message from user: ${userEmail}\n\nSubject: ${subject}\n\nMessage:\n${message}`, // plain text body
        html: `
            <p><strong>Message from user:</strong> ${userEmail}</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <hr>
            <p><strong>Message:</strong></p>
            <p>${message.replace(/\n/g, '<br>')}</p>
            <hr>
            <p><em>This email was sent from the support form in ${process.env.APP_NAME || 'Hockey GM'}.</em></p>
        `, // html body
    };

    return await sendEmail(mailOptions.to, mailOptions.subject, mailOptions.text, mailOptions.html);
}

module.exports = {
    initializeEmailService,
    sendEmail,
    sendVerificationEmail,
    sendPasswordResetEmail,
    sendSupportEmail,
    isEmailEnabled: () => emailEnabled
};