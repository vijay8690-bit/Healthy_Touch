import Razorpay from 'razorpay';

const roundPaise = (amount) => Math.round(Number(amount || 0) * 100);

export const getRazorpayClient = (settings = {}) => {
  const key_id = settings?.razorpayKey || process.env.RAZORPAY_KEY_ID;
  const key_secret = settings?.razorpaySecret || process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret) {
    const error = new Error('Razorpay configuration is missing');
    error.statusCode = 500;
    throw error;
  }

  return new Razorpay({ key_id, key_secret });
};

export const verifyRazorpayPaymentEntity = async ({ settings, payment, razorpayPaymentId, razorpayOrderId }) => {
  const razorpay = getRazorpayClient(settings);
  const gatewayPayment = await razorpay.payments.fetch(razorpayPaymentId);
  const gatewayOrder = razorpayOrderId ? await razorpay.orders.fetch(razorpayOrderId) : null;

  const expectedAmount = roundPaise(payment.payableAmount || payment.totalAmount || payment.amount);

  if (payment.razorpayOrderId && payment.razorpayOrderId !== razorpayOrderId) {
    const error = new Error('Razorpay order ID does not match stored payment order');
    error.statusCode = 400;
    throw error;
  }

  if (gatewayPayment.order_id !== razorpayOrderId) {
    const error = new Error('Razorpay payment does not belong to this order');
    error.statusCode = 400;
    throw error;
  }

  if (Number(gatewayPayment.amount) !== expectedAmount) {
    const error = new Error('Razorpay payment amount does not match stored payable amount');
    error.statusCode = 400;
    error.gatewayAmount = gatewayPayment.amount;
    error.expectedAmount = expectedAmount;
    throw error;
  }

  if (gatewayOrder && Number(gatewayOrder.amount) !== expectedAmount) {
    const error = new Error('Razorpay order amount does not match stored payable amount');
    error.statusCode = 400;
    error.gatewayAmount = gatewayOrder.amount;
    error.expectedAmount = expectedAmount;
    throw error;
  }

  if (!['captured', 'authorized'].includes(gatewayPayment.status)) {
    const error = new Error(`Razorpay payment is not successful: ${gatewayPayment.status}`);
    error.statusCode = 400;
    throw error;
  }

  return { gatewayPayment, gatewayOrder };
};

export const razorpayAmountMatches = (payment, amountInPaise) => (
  Number(amountInPaise) === roundPaise(payment.payableAmount || payment.totalAmount || payment.amount)
);
