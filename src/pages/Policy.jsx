import React from 'react';

const PrivacyPolicy = () => {
  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-lg my-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-4">
        Privacy Policy for Telugu Food Club
      </h1>
      <p className="text-sm text-gray-600 mb-6">Last Updated: April 10, 2025</p>

      <p className="text-gray-700 mb-6">
        At Telugu Food Club we prioritize your privacy. This policy outlines how we collect, use, and protect your personal information when you order food through our website (<a href="https://telugufood.club" className="text-blue-600 hover:underline">https://telugufood.club</a>) or interact with our services.
      </p>
      <p className="text-gray-700 mb-6">By using our website, you consent to this Privacy Policy.</p>

      {/* Section 1 */}
      <h2 className="text-2xl font-semibold text-gray-800 mt-6 mb-4">1. Information We Collect</h2>
      <div className="ml-4">
        <h3 className="text-xl font-medium text-gray-700 mb-2">A. Personal Data You Provide</h3>
        <p className="text-gray-600 mb-4">When you place an order, register an account, or contact us, we collect:</p>
        <ul className="list-disc ml-6 text-gray-600 mb-4">
          <li><strong>Contact Details:</strong> Name, email, phone number, delivery address.</li>
          <li><strong>Order Details:</strong> Food items, special instructions (e.g., allergies, spice preferences), payment method (processed via secure gateways like Razorpay/PayPal).</li>
          <li><strong>Account Credentials:</strong> Password (encrypted), order history, saved addresses.</li>
        </ul>

        <h3 className="text-xl font-medium text-gray-700 mb-2">B. Automated Data Collection</h3>
        <ul className="list-disc ml-6 text-gray-600 mb-4">
          <li><strong>Device & Usage Data:</strong> IP address, browser type, operating system, pages visited, timestamps.</li>
          <li><strong>Cookies & Tracking:</strong> Session cookies (for cart items), analytics cookies (Google Analytics), and advertising cookies (for personalized offers).</li>
          <li><strong>Location Data:</strong> Only with your permission for delivery tracking or local restaurant recommendations.</li>
        </ul>

        <h3 className="text-xl font-medium text-gray-700 mb-2">C. Third-Party Data</h3>
        <ul className="list-disc ml-6 text-gray-600 mb-4">
          <li><strong>Social Media Logins:</strong> If you sign in via Google/Facebook, we receive your public profile info.</li>
          <li><strong>Delivery Partners:</strong> They may share delivery status updates or feedback.</li>
        </ul>
      </div>

      {/* Section 2 */}
      <h2 className="text-2xl font-semibold text-gray-800 mt-6 mb-4">2. How We Use Your Information</h2>
      <p className="text-gray-600 mb-4 ml-4">We use your data to:</p>
      <ul className="list-disc ml-10 text-gray-600 mb-4">
        <li><strong>Process Orders:</strong> Confirm, cook, and deliver your food.</li>
        <li><strong>Improve Services:</strong> Analyze trends, customize menu recommendations (e.g., "You liked Biryani! Try our new Hyderabadi version!").</li>
        <li><strong>Marketing:</strong> Send promotions, discounts, or surveys (opt-out anytime).</li>
        <li><strong>Legal Compliance:</strong> Fraud prevention, tax records, or responding to legal requests.</li>
      </ul>

      {/* Section 3 */}
      <h2 className="text-2xl font-semibold text-gray-800 mt-6 mb-4">3. Data Sharing & Disclosure</h2>
      <p className="text-gray-600 mb-4 ml-4">We do not sell your data. Limited sharing occurs with:</p>
      <ul className="list-disc ml-10 text-gray-600 mb-4">
        <li><strong>Delivery Agents:</strong> Only your name, address, and phone number for order fulfillment.</li>
        <li><strong>Payment Processors:</strong> Card details are encrypted and never stored on our servers.</li>
        <li><strong>Government Authorities:</strong> If required by law (e.g., court orders).</li>
        <li><strong>Business Transfers:</strong> If Telugu Food Club merges/sells assets, user data may transfer under confidentiality agreements.</li>
      </ul>

      {/* Section 4 */}
      <h2 className="text-2xl font-semibold text-gray-800 mt-6 mb-4">4. User Rights & Choices</h2>
      <p className="text-gray-600 mb-4 ml-4">You have the right to:</p>
      <ul className="list-disc ml-10 text-gray-600 mb-4">
        <li><strong>Access/Update Data:</strong> Edit your account info via "Profile Settings."</li>
        <li><strong>Delete Account:</strong> Request permanent deletion by emailing <a href="mailto:support@telugufoodclub.com" className="text-blue-600 hover:underline">support@telugufoodclub.com</a>.</li>
        <li><strong>Opt-Out of Marketing:</strong> Unsubscribe via email footer or SMS reply "STOP."</li>
        <li><strong>Disable Cookies:</strong> Adjust browser settings (may affect checkout functionality).</li>
      </ul>

      {/* Section 5 */}
      <h2 className="text-2xl font-semibold text-gray-800 mt-6 mb-4">5. Data Security Measures</h2>
      <ul className="list-disc ml-10 text-gray-600 mb-4">
        <li><strong>Encryption:</strong> SSL/TLS for all data transmissions.</li>
        <li><strong>Access Controls:</strong> Staff trained in data protection; limited access to sensitive info.</li>
        <li><strong>PCI Compliance:</strong> Secure payment processing via certified gateways.</li>
      </ul>

      {/* Section 6 */}
      <h2 className="text-2xl font-semibold text-gray-800 mt-6 mb-4">6. Retention Period</h2>
      <p className="text-gray-600 mb-4 ml-4">We retain data:</p>
      <ul className="list-disc ml-10 text-gray-600 mb-4">
        <li><strong>Active Accounts:</strong> Until deletion request.</li>
        <li><strong>Order Records:</strong> 5 years (for tax/audit purposes).</li>
        <li><strong>Cookies:</strong> Session cookies expire after 30 days; analytics cookies up to 2 years.</li>
      </ul>

      {/* Section 7 */}
      <h2 className="text-2xl font-semibold text-gray-800 mt-6 mb-4">7. Children’s Privacy</h2>
      <p className="text-gray-600 mb-4 ml-4">Our website is not for children under 13. Parents/guardians may request deletion of inadvertently collected data.</p>

      {/* Section 8 */}
      <h2 className="text-2xl font-semibold text-gray-800 mt-6 mb-4">8. Third-Party Links</h2>
      <p className="text-gray-600 mb-4 ml-4">Our website may link to:</p>
      <ul className="list-disc ml-10 text-gray-600 mb-4">
        <li><strong>Social Media (Instagram/Facebook):</strong> Their privacy policies apply.</li>
        <li><strong>Review Platforms (Zomato/Swiggy):</strong> We don’t control their data practices.</li>
      </ul>

      {/* Section 9 */}
      <h2 className="text-2xl font-semibold text-gray-800 mt-6 mb-4">9. Policy Updates</h2>
      <p className="text-gray-600 mb-4 ml-4">We’ll notify users of changes via:</p>
      <ul className="list-disc ml-10 text-gray-600 mb-4">
        <li><strong>Email:</strong> Registered account holders.</li>
        <li><strong>Website Banner:</strong> Prominent notice for 7 days post-update.</li>
      </ul>

      {/* Section 10 */}
      <h2 className="text-2xl font-semibold text-gray-800 mt-6 mb-4">10. Contact & Grievance Officer</h2>
      <p className="text-gray-600 mb-4 ml-4">For questions or complaints:</p>
      <ul className="list-disc ml-10 text-gray-600 mb-4">
        <li><strong>Email:</strong> <a href="mailto:privacy@telugufoodclub.com" className="text-blue-600 hover:underline">privacy@telugufoodclub.com</a></li>
        <li><strong>Address:</strong> 1-67, SS Bhavan Dhulapally Road, Komapally, Hyd - 500014.</li>
        <li><strong>Phone:</strong> 918143298555</li>
      </ul>

      <p className="text-gray-700 mt-6">
        Thank you for trusting Telugu Food Club with your delicious orders!
      </p>
    </div>
  );
};

export default PrivacyPolicy;