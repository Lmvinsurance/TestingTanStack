import React from "react";

const TermsAndConditions = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10 text-gray-800 font-sans">
      <h1 className="text-3xl font-bold mb-6 text-center text-red-600">
        Terms and Conditions
      </h1>

      <section className="mb-8 border-b pb-4">
        <h2 className="text-xl font-semibold mb-2">1. Introduction</h2>
        <p>
          Welcome to <strong>TELUGU FOOD CLUB</strong>! These Terms and
          Conditions ("Terms") govern your access to and use of our website,
          online services, and any food ordering or reservation systems
          available through our platform.
        </p>
        <p className="mt-2">
          By using our website, you agree to these Terms. If you do not agree,
          kindly do not proceed with ordering or using our services.
        </p>
      </section>

      <section className="mb-8 border-b pb-4">
        <h2 className="text-xl font-semibold mb-2">2. Use of Website</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Anyone can place an order on our website, regardless of age.</li>
          <li>You agree to use our website only for lawful purposes.</li>
          <li>
            Misuse of the website, including tampering or spreading malware, is
            strictly prohibited.
          </li>
        </ul>
      </section>

      <section className="mb-8 border-b pb-4">
        <h2 className="text-xl font-semibold mb-2">
          3. Online Orders & Reservations
        </h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Orders and reservations are subject to availability.</li>
          <li>
            We reserve the right to refuse or cancel any order at our
            discretion.
          </li>
          <li>Prices and menu items may change without prior notice.</li>
          <li>
            All orders will be stored along with customer information for
            operational and service improvement purposes.
          </li>
        </ul>
      </section>

      <section className="mb-8 border-b pb-4">
        <h2 className="text-xl font-semibold mb-2">4. Payment</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            We accept payments via credit/debit cards, UPI, wallets, and other
            standard options.
          </li>
          <li>
            Payments must be made in full at the time of order unless specified.
          </li>
          <li>
            Failed or disputed payments may result in cancellation of your
            order.
          </li>
        </ul>
      </section>

      <section className="mb-8 border-b pb-4">
        <h2 className="text-xl font-semibold mb-2">
          5. Cancellation & Refund Policy
        </h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            Orders can be canceled by contacting us at the details provided
            below.
          </li>
          <li>
            Refunds will be issued as per our policy and at our discretion.
          </li>
          <li>
            If applicable, refunds may take 5–7 business days to process.
          </li>
        </ul>
      </section>

      <section className="mb-8 border-b pb-4">
        <h2 className="text-xl font-semibold mb-2">
          6. Allergens & Food Safety
        </h2>
        <p>
          If you have food allergies or dietary restrictions, please inform us
          before placing an order. While we take precautions, we cannot
          guarantee that our food is allergen-free.
        </p>
      </section>

      <section className="mb-8 border-b pb-4">
        <h2 className="text-xl font-semibold mb-2">
          7. Intellectual Property
        </h2>
        <p>
          All content on this website — including text, images, logos, and
          menus — belongs to <strong>TELUGU FOOD CLUB</strong> and may not be
          reused without permission.
        </p>
      </section>

      <section className="mb-8 border-b pb-4">
        <h2 className="text-xl font-semibold mb-2">8. Third-Party Links</h2>
        <p>
          Our website may link to third-party sites. We are not responsible for
          their content or services.
        </p>
      </section>

      <section className="mb-8 border-b pb-4">
        <h2 className="text-xl font-semibold mb-2">
          9. Limitation of Liability
        </h2>
        <p>
          We are not liable for any damages (direct or indirect) arising from
          the use of our website or services.
        </p>
      </section>

      <section className="mb-8 border-b pb-4">
        <h2 className="text-xl font-semibold mb-2">10. Changes to Terms</h2>
        <p>
          We may update these Terms at any time. Please check this page
          periodically for changes.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">11. Contact Us</h2>
        <p>If you have questions or concerns, reach out to us:</p>
        <ul className="mt-2 space-y-1">
          <li>📞 Phone: +91-8143298555</li>
          <li>📧 Email: support@telugufoodclub.com</li>
          <li>📍ADDRESS : 1-67, SS Bhavan Dhulapally Road, Komapally, Hyd - 500014.</li>
        </ul>
      </section>
    </div>
  );
};

export default TermsAndConditions;
