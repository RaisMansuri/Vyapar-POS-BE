const nodemailer = require('nodemailer');

/**
 * Send email utility
 * @param {string} email - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - Email body in HTML
 */
const sendEmail = async (email, subject, html) => {
  try {
    // For development, you can use Mailtrap or Gmail with App Password
    // These should be in your .env file
    const transportConfig = {
      host: process.env.EMAIL_HOST || 'smtp.mailtrap.io',
      port: process.env.EMAIL_PORT || 2525
    };

    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      transportConfig.auth = {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      };
    }

    const transporter = nodemailer.createTransport(transportConfig);

    const mailOptions = {
      from: `"Vyapar POS" <${process.env.EMAIL_FROM || 'no-reply@vyaparpos.com'}>`,
      to: email,
      subject: subject,
      html: html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Email sending error:', error);
    throw new Error('Failed to send email');
  }
};

module.exports = { sendEmail };
