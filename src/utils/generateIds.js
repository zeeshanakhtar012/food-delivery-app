const { v4: uuidv4 } = require('uuid');

const generateUniqueOrderId = () => {
  return `ORD-${uuidv4().slice(0, 8).toUpperCase()}`;
};

const generateUniqueRestaurantId = () => {
  return `RST-${uuidv4().slice(0, 8).toUpperCase()}`;
};

module.exports = {
  generateUniqueOrderId,
  generateUniqueRestaurantId
};