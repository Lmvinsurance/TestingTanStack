export default function RefundPolicy() {
  return (
    <div className="max-w-3xl mx-auto p-6 text-gray-800">
      <p className="text-2xl font-bold text-center " >
        TELUGU FOOD.CLUB
      </p>
      <p className="text-xl font-bold text-center mb-6" >
        POWERED BY @LMV FOODS
      </p>
      <h1 className="text-3xl font-bold text-center mb-6">Refund Policy</h1>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">1. Eligibility for Refund</h2>
        <p>
          Refunds are applicable only in cases of incorrect or damaged food
          deliveries. Requests must be made within 24 hours of order receipt.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">2. Non-Refundable Cases</h2>
        <p>
          We do not offer refunds for orders where:
          <ul className="list-disc list-inside mt-2">
            <li>Customer changes their mind after order preparation.</li>
            <li>Delivery was unsuccessful due to incorrect address or contact information.</li>
            <li>Food was consumed partially or fully.</li>
          </ul>
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">3. Refund Process</h2>
        <p>
          To request a refund, email us at <a href="mailto:support@telugufoodclub.com" className="underline text-blue-500" >support@telugufoodclub.com</a> with order
          details and proof (photos) of the issue. Refunds will be credited within
          5-7 business days to the original payment method.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">4. Late or Missing Refunds</h2>
        <p>
          If you haven’t received a refund within the stated period, check with your
          bank or payment provider. If further assistance is needed, contact us.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">5. Refund Policy</h2>
        <p>
          Refunds for cancelled orders (if applicable) Amount will be credited within 5-7 business days. contact support for any issues.
        </p>
      </section>
    </div>
  );
}
