const User = require('../models/user.model');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { successResponse, errorResponse } = require('../utils/response');
const { sendEmail } = require('../utils/email');

const register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return errorResponse(res, 'User already exists', 400);
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationTokenExpires = Date.now() + 120 * 60 * 1000; // 120 minutes

    // Create new user
    const user = new User({
      name,
      email,
      password,
      phone,
      verificationToken: otp, // Reusing field for OTP
      verificationTokenExpires,
      isVerified: false
    });

    await user.save();

    // Send verification email
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <h2 style="color: #4CAF50; text-align: center;">Verify your Email</h2>
        <p>Thank you for registering with Vyapar POS. Please use the following 6-digit code to verify your email address:</p>
        <div style="background-color: #f9f9f9; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #333; border-radius: 5px; margin: 20px 0;">
          ${otp}
        </div>
        <p>This code will expire in 120 minutes. If you did not request this, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #888; text-align: center;">&copy; 2026 Vyapar POS. All rights reserved.</p>
      </div>
    `;

    try {
      await sendEmail(email, 'Your Verification Code - Vyapar POS', emailHtml);
    } catch (emailError) {
      console.log('\n--------------------------------------------------');
      console.log('NOTICE: Email could not be sent (SMTP not configured).');
      console.log('MANUAL VERIFICATION CODE for', email, ':');
      console.log('OTP:', otp);
      console.log('--------------------------------------------------\n');
    }

    return successResponse(res, { email }, 'Registration successful. Please check your email for the verification code.', 201);
  } catch (error) {
    console.error('--- REGISTRATION ERROR ---');
    return errorResponse(res, 'Registration failed', 500, error);
  }
};

const verifyOTP = async (req, res) => {
  try {
    const { email, otp, code } = req.body;
    const verificationCode = otp || code;

    if (!email || !verificationCode) {
      return errorResponse(res, 'Email and Verification Code are required', 400);
    }

    const user = await User.findOne({
      email,
      verificationToken: verificationCode,
      verificationTokenExpires: { $gt: Date.now() }
    });

    if (!user) {
      return errorResponse(res, 'Invalid or expired verification code', 400);
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    return successResponse(res, null, 'Email verified successfully. You can now log in.');
  } catch (error) {
    return errorResponse(res, 'Verification failed', 500, error);
  }
};

const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return errorResponse(res, 'Email is required', 400);
    }

    const user = await User.findOne({ email });

    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    if (user.isVerified) {
      return errorResponse(res, 'Email is already verified', 400);
    }

    // Generate new 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.verificationToken = otp;
    user.verificationTokenExpires = Date.now() + 120 * 60 * 1000; // 120 minutes
    await user.save();

    // Send email
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <h2 style="color: #4CAF50; text-align: center;">New Verification Code</h2>
        <p>Your new verification code is:</p>
        <div style="background-color: #f9f9f9; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #333; border-radius: 5px; margin: 20px 0;">
          ${otp}
        </div>
        <p>This code will expire in 120 minutes.</p>
      </div>
    `;

    try {
      await sendEmail(email, 'New Verification Code - Vyapar POS', emailHtml);
    } catch (emailError) {
      console.log('\n--------------------------------------------------');
      console.log('NOTICE: Email could not be sent (SMTP not configured).');
      console.log('RESENT CODE for', email, ':');
      console.log('OTP:', otp);
      console.log('--------------------------------------------------\n');
    }

    return successResponse(res, null, 'Verification code resent successfully.');
  } catch (error) {
    return errorResponse(res, 'Failed to resend verification code', 500, error);
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return errorResponse(res, 'Invalid credentials', 400);
    }

    // Check if verified
    if (!user.isVerified) {
      return errorResponse(res, 'Please verify your email to log in', 403);
    }

    // Compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return errorResponse(res, 'Invalid credentials', 400);
    }

    // Generate token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret_key', {
      expiresIn: '24h'
    });

    return successResponse(res, {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone
      }
    }, 'Login successful');
  } catch (error) {
    return errorResponse(res, 'Login failed', 500, error);
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return errorResponse(res, 'User not found', 404);
    return successResponse(res, user, 'Profile retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve profile', 500, error);
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;
    const user = await User.findById(req.user.id);
    
    if (!user) return errorResponse(res, 'User not found', 404);

    if (name) user.name = name;
    if (phone) user.phone = phone;

    await user.save();

    return successResponse(res, {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role
    }, 'Profile updated successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to update profile', 500, error);
  }
};

module.exports = {
  register,
  verifyOTP,
  resendVerification,
  login,
  getProfile,
  updateProfile
};
