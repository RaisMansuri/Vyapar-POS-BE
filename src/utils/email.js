const nodemailer = require('nodemailer');

/**
 * Send email using Gmail SMTP only
 * @param {string} email - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - Email body in HTML
 */

const sendEmail = async (email, subject, html) => {

  try {

    console.log('Using Gmail SMTP Service...');
    console.log(`Email User: ${process.env.EMAIL_USER}`);

    const transporter = nodemailer.createTransport({

      service: 'gmail',

      auth: {

        user: process.env.EMAIL_USER,

        pass: process.env.EMAIL_PASS

      },

      tls: {

        rejectUnauthorized: false

      }

    });


    const mailOptions = {

      from:
        process.env.EMAIL_FROM ||
        `"Vyapar POS" <${process.env.EMAIL_USER}>`,

      to: email,

      subject: subject,

      html: html

    };


    const info =
      await transporter.sendMail(
        mailOptions
      );


    console.log(
      'Email sent successfully:',
      info.messageId
    );


    return info;

  }

  catch (error) {

    if (error.code === 'EAUTH') {

      console.error('\n❌ Gmail SMTP Authentication Error');

      console.error(
        'Check App Password (must be 16 characters)'
      );

    }

    console.error(
      'Email sending error:',
      error.message
    );

    throw new Error(
      'Failed to send email'
    );

  }

};


module.exports = { sendEmail };