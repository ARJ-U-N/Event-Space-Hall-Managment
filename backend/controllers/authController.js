const User = require('../models/User');
const jwt = require('jsonwebtoken');

const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client("741783204038-5e0st9bpv8cs68f92a2map5jqm6u7rvo.apps.googleusercontent.com");

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

const googleLogin = async (req, res) => {
  try {
    const { token, role } = req.body;

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: "741783204038-5e0st9bpv8cs68f92a2map5jqm6u7rvo.apps.googleusercontent.com"
    });

    const { email, name, picture, sub: googleId } = ticket.getPayload();

    if (!email.endsWith('@nirmalacollege.edu.in')) {
      return res.status(403).json({
        success: false,
        message: 'Only nirmalacollege.edu.in email addresses are allowed'
      });
    }

    // Force role to be 'teacher' for Google Auth
    const enforcedRole = 'teacher';

    let user = await User.findOne({ email });

    if (user) {
      if (!user.googleId) {
        user.googleId = googleId;
        user.picture = picture;
        // Update role if it's not teacher? Or just allow? 
        // Requirement: "only teacher should sign in with gmail". 
        // If an admin tries to sign in with Gmail, should we allow it?
        // Based on "if superadmin show super admin login... only teacher should sign in with gmail",
        // it implies Google Auth is FOR Teachers. 
        // If an existing admin tries to use Google Auth, we should probably BLOCK it or convert them?
        // Safer to BLOCK if role mismatch.
        if (user.role !== enforcedRole) {
          return res.status(403).json({
            success: false,
            message: 'Google Sign-In is restricted to Teachers only.'
          });
        }
        await user.save();
      }
    } else {
      user = await User.create({
        name,
        email,
        googleId,
        picture,
        role: enforcedRole,
        password: '',
        isActive: true
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated.'
      });
    }

    const jwtToken = generateToken(user._id);

    res.json({
      success: true,
      data: {
        token: jwtToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
          picture: user.picture
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const register = async (req, res) => {
  try {
    const { name, email, password, role, department, phone } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role || 'teacher',
      department,
      phone
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    const user = await User.findOne({ email, isActive: true });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Role validation - user must select correct role
    if (role && user.role !== role) {
      return res.status(401).json({
        success: false,
        message: 'Invalid role selection'
      });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        phone: user.phone,
        isActive: user.isActive
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  register,
  login,
  getMe,
  googleLogin
};
