/**
 * Email Templates Utility
 */

const getBaseTemplate = (title, content, footer) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f4f7f6;
        }
        .container {
            max-width: 600px;
            margin: 20px auto;
            background: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 15px rgba(0,0,0,0.05);
        }
        .header {
            background: linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%);
            color: #ffffff;
            padding: 30px 20px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            letter-spacing: 1px;
        }
        .content {
            padding: 40px 30px;
        }
        .otp-container {
            background-color: #f9f9f9;
            border: 2px dashed #4CAF50;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            margin: 30px 0;
        }
        .otp-code {
            font-size: 36px;
            font-weight: bold;
            letter-spacing: 8px;
            color: #2E7D32;
            margin: 0;
        }
        .footer {
            background-color: #f9f9f9;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #888;
            border-top: 1px solid #eee;
        }
        .button {
            display: inline-block;
            padding: 12px 25px;
            background-color: #4CAF50;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Vyapar POS</h1>
        </div>
        <div class="content">
            ${content}
        </div>
        <div class="footer">
            <p>&copy; 2026 Vyapar POS. All rights reserved.</p>
            <p>This is an automated message, please do not reply.</p>
        </div>
    </div>
</body>
</html>
`;

exports.getVerificationTemplate = (name, otp) => {
    const content = `
        <h2 style="color: #333; margin-top: 0;">Verify Your Email</h2>
        <p>Hello ${name || 'there'},</p>
        <p>Thank you for choosing <strong>Vyapar POS</strong>. To complete your setup, please use the following 6-digit verification code:</p>
        <div class="otp-container">
            <p class="otp-code">${otp}</p>
        </div>
        <p>This code will expire in 120 minutes. If you did not request this, you can safely ignore this email.</p>
        <p>Welcome aboard!<br>The Vyapar POS Team</p>
    `;
    return getBaseTemplate('Verify Your Email - Vyapar POS', content);
};

exports.getResetPasswordTemplate = (name, otp) => {
    const content = `
        <h2 style="color: #333; margin-top: 0;">Reset Your Password</h2>
        <p>Hello ${name || 'there'},</p>
        <p>We received a request to reset your password for your <strong>Vyapar POS</strong> account. Please use the following code to proceed:</p>
        <div class="otp-container">
            <p class="otp-code">${otp}</p>
        </div>
        <p>This code is valid for 15 minutes. If you did not request a password reset, please ignore this email and ensure your account is secure.</p>
        <p>Best regards,<br>The Vyapar POS Team</p>
    `;
    return getBaseTemplate('Reset Your Password - Vyapar POS', content);
};

exports.getWelcomeTemplate = (name) => {
    const content = `
        <h2 style="color: #333; margin-top: 0;">Welcome to Vyapar POS!</h2>
        <p>Hello ${name || 'there'},</p>
        <p>Your account has been successfully created and verified. You now have full access to our Point of Sale system.</p>
        <p>With Vyapar POS, you can easily:</p>
        <ul style="color: #555; padding-left: 20px;">
            <li>Manage products and inventory</li>
            <li>Track sales and generate reports</li>
            <li>Manage customer relationships</li>
            <li>And much more...</li>
        </ul>
        <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL || '#'}" class="button">Go to Dashboard</a>
        </div>
        <p>If you have any questions, feel free to contact our support team.</p>
        <p>Happy selling!<br>The Vyapar POS Team</p>
    `;
    return getBaseTemplate('Welcome to Vyapar POS', content);
};

exports.getInvoiceEmailTemplate = (order, invoiceNumber) => {
    const itemsHtml = (order.items || []).map(item => {
        const product = item.product || { name: item.name || 'Product', category: item.category || 'General', price: item.price || 0 };
        return `
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">
                <strong>${product.name}</strong><br>
                <small style="color: #888;">${product.category}</small>
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₹${(product.price || 0).toLocaleString()}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;"><strong>₹${(item.total || 0).toLocaleString()}</strong></td>
        </tr>
    `}).join('');

    const content = `
        <div style="text-align: center; margin-bottom: 30px;">
            <h2 style="color: #333; margin-bottom: 5px;">Invoice ${invoiceNumber}</h2>
            <p style="color: #888; font-size: 14px;">Order Date: ${new Date(order.timestamp || order.orderDate || Date.now()).toLocaleDateString()}</p>
        </div>

        <div style="margin-bottom: 30px; display: flex; justify-content: space-between;">
            <div style="flex: 1;">
                <h4 style="color: #888; text-transform: uppercase; font-size: 12px; margin-bottom: 10px;">Billing Address</h4>
                <p style="margin: 0; font-weight: bold;">${order.address?.fullName || 'Valued Customer'}</p>
                ${order.address?.addressLine1 ? `<p style="margin: 0; font-size: 14px; color: #555;">${order.address.addressLine1}</p>` : ''}
                ${(order.address?.city || order.address?.state || order.address?.pincode) ? 
                    `<p style="margin: 0; font-size: 14px; color: #555;">${[order.address?.city, order.address?.state].filter(Boolean).join(', ')}${order.address?.pincode ? ' - ' + order.address.pincode : ''}</p>` 
                    : ''}
            </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
            <thead>
                <tr style="background-color: #f8f9fa;">
                    <th style="padding: 12px 10px; text-align: left; font-size: 12px; text-transform: uppercase; color: #888;">Item</th>
                    <th style="padding: 12px 10px; text-align: center; font-size: 12px; text-transform: uppercase; color: #888;">Qty</th>
                    <th style="padding: 12px 10px; text-align: right; font-size: 12px; text-transform: uppercase; color: #888;">Price</th>
                    <th style="padding: 12px 10px; text-align: right; font-size: 12px; text-transform: uppercase; color: #888;">Total</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHtml}
            </tbody>
        </table>

        <div style="width: 250px; margin-left: auto;">
            <div style="display: flex; justify-content: space-between; padding: 5px 0;">
                <span style="color: #888;">Subtotal:</span>
                <span style="font-weight: bold;">₹${(order.subTotal || (Number(order.totalAmount || 0) - Number(order.tax || 0))).toLocaleString()}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 5px 0;">
                <span style="color: #888;">Tax:</span>
                <span style="font-weight: bold;">₹${(order.tax || order.totalGST || 0).toLocaleString()}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 15px 0; border-top: 2px solid #4CAF50; margin-top: 10px;">
                <span style="font-size: 18px; font-weight: bold;">Grand Total:</span>
                <span style="font-size: 18px; font-weight: bold; color: #2E7D32;">₹${(order.totalAmount || 0).toLocaleString()}</span>
            </div>
        </div>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 30px;">
            <p style="margin: 0; font-size: 14px; color: #555;"><strong>Payment Status:</strong> Paid</p>
            <p style="margin: 5px 0 0; font-size: 14px; color: #555;"><strong>Payment Method:</strong> ${order.paymentMethod}</p>
        </div>
    `;

    return getBaseTemplate(`Your Invoice from Vyapar POS - ${invoiceNumber}`, content);
};
