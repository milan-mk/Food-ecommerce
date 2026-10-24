// Payment abstraction: add another provider by implementing { name, isConfigured, createOrder, getOrder, captureOrder }.
const AppError = require('../../utils/AppError');
const providers = { paypal: require('./paypalProvider') };

exports.getProvider = (name) => {
  const provider = providers[name];
  if (!provider) throw AppError.badRequest('Unsupported payment method');
  return provider;
};
