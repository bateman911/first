const nodemailer = require('nodemailer');

// Create a mock transporter for development
const createMockTransporter = () => {
  return {
    verify: (callback) => {
      console.log('📧 Mock email service initialized');
      callback(null, true);
    },
    sendMail: (mailOptions) => {
      console.log('📧 Mock email sent:');
      console.log('   From:', mailOptions.from);
      console.log('   To:', mailOptions.to);
      console.log('   Subject:', mailOptions.subject);
      console.log('   Text:', mailOptions.text?.substring(0, 100) + '...');
      return Promise.resolve({ messageId: 'mock-message-id-' + Date.now() });
    }
  };
};

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
      console.log('📧 Using mock email service for development');
      transporter = createMockTransporter();
      emailEnabled = true; // We're using a mock, but we'll consider it "enabled"
      return;
    }

    // Create transporter with improved timeout and connection settings
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      connectionTimeout: 30000, // 30 seconds
      greetingTimeout: 30000, // 30 seconds
      socketTimeout: 30000, // 30 seconds
      // Add pool settings for better connection management
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      // Add TLS options for better compatibility
      tls: {
        rejectUnauthorized: false // Allow self-signed certificates in development
      }
    });

    // Test the connection with a longer timeout and better error handling
    const testConnection = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('SMTP connection test timeout after 30 seconds'));
      }, 30000); // 30 second timeout

      transporter.verify((error, success) => {
        clearTimeout(timeout);
        if (error) {
          // Provide more specific error information
          if (error.code === 'ECONNREFUSED') {
            reject(new Error(`SMTP server connection refused. Check if ${process.env.SMTP_HOST}:${process.env.SMTP_PORT} is accessible.`));
          } else if (error.code === 'ENOTFOUND') {
            reject(new Error(`SMTP server not found. Check if ${process.env.SMTP_HOST} is correct.`));
          } else if (error.code === 'ETIMEDOUT') {
            reject(new Error('SMTP connection timed out. Check network connectivity and firewall settings.'));
          } else {
            reject(new Error(`SMTP error: ${error.message}`));
          }
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
    console.log('💡 To enable email, check your SMTP settings in the .env file:');
    console.log('   - SMTP_HOST: Your SMTP server hostname');
    console.log('   - SMTP_PORT: Usually 587 for TLS or 465 for SSL');
    console.log('   - SMTP_USER: Your email username');
    console.log('   - SMTP_PASS: Your email password or app password');
    console.log('   - SMTP_SECURE: Set to "true" for port 465, "false" for port 587');
    
    console.log('📧 Using mock email service for development');
    transporter = createMockTransporter();
    emailEnabled = true; // We're using a mock, but we'll consider it "enabled"
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

// Initialize email service on module load
initializeEmailService();

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendSupportEmail,
  isEmailEnabled: () => emailEnabled,
  initializeEmailService // Exported for testing or manual re-initialization
};