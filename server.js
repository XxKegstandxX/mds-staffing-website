const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// Rate limiting for contact form
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many contact form submissions, please try again later.'
});

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

// Email transporter setup
const transporter = nodemailer.createTransport({
  host: 'smtp.ionos.com', // or smtp.1and1.com
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER, // support@mds-staffing.com
    pass: process.env.EMAIL_PASS  // your IONOS email password
  }
});

// Routes
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.get('/thank-you', (req, res) => {
  res.sendFile(__dirname + '/public/thank-you.html');
});

// Contact form handler
app.post('/contact', contactLimiter, async (req, res) => {
  try {
    const {
      facility_name,
      contact_name,
      title,
      email,
      phone,
      services,
      timeline,
      message
    } = req.body;

    // Email content
    const emailContent = `
      New MDS Staffing Consultation Request
      
      Facility Information:
      • Facility Name: ${facility_name}
      • Contact Person: ${contact_name}
      • Title/Role: ${title}
      
      Contact Details:
      • Email: ${email}
      • Phone: ${phone || 'Not provided'}
      
      Service Requirements:
      • Services Needed: ${services || 'Not specified'}
      • Timeline: ${timeline || 'Not specified'}
      
      Message:
      ${message || 'No additional message'}
      
      ---
      Submitted: ${new Date().toLocaleString()}
    `;

    // Send email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: 'support@mds-staffing.com',
      subject: `New Inquiry from ${facility_name} - ${contact_name}`,
      text: emailContent
    });

    // Send confirmation email to client
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Thank you for your MDS Staffing inquiry',
      text: `Dear ${contact_name},

Thank you for reaching out to MDS Staffing regarding services for ${facility_name}.

I have received your inquiry and will respond within 24 hours with information about how we can help meet your MDS assessment needs.

In the meantime, if you have any urgent questions, please don't hesitate to call.

Best regards,
MDS Staffing Team

---
This is an automated confirmation email.`
    });

    res.redirect('/thank-you');

  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).send(`
      <h1>Error</h1>
      <p>Sorry, there was an error sending your message. Please try again or contact us directly.</p>
      <a href="/">Go Back</a>
    `);
  }
});

app.listen(PORT, () => {
  console.log(`MDS Staffing website running on port ${PORT}`);
});
