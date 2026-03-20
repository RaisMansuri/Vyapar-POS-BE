require('dotenv').config();
const nodemailer = require('nodemailer');

async function testEmail() {
  console.log('--- Email Connection Test ---');
  console.log('Host:', process.env.EMAIL_HOST);
  console.log('Port:', process.env.EMAIL_PORT);
  console.log('User:', process.env.EMAIL_USER);

  const transportConfig = {
    host: process.env.EMAIL_HOST || 'sandbox.smtp.mailtrap.io',
    port: process.env.EMAIL_PORT || 2525,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  };

  const transporter = nodemailer.createTransport(transportConfig);

  try {
    console.log('Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP Connection is valid!');

    const mailOptions = {
      from: `"Test" <${process.env.EMAIL_FROM || 'test@example.com'}>`,
      to: process.env.EMAIL_USER ? 'mansurirais095@gmail.com' : 'test@example.com', // Try to send to the user's email if possible, or just a dummy
      subject: 'Vyapar POS - SMTP Test',
      text: 'If you are reading this, your SMTP configuration in Vyapar POS is working correctly!'
    };

    console.log('Sending test email...');
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully!');
    console.log('Message ID:', info.messageId);
    process.exit(0);
  } catch (error) {
    console.error('❌ Email Test Failed:');
    console.error(error);
    
    if (error.code === 'EENVELOPE') {
      console.log('\n🔍 Probable cause: Invalid "from" or "to" address.');
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      console.log('\n🔍 Probable cause: Network connection refused. Try port 587 or 465 instead of 2525.');
    } else if (error.command === 'AUTH') {
      console.log('\n🔍 Probable cause: Invalid SMTP credentials (User/Pass).');
    }
    
    process.exit(1);
  }
}

testEmail();
