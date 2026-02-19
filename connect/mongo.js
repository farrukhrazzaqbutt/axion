const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.set('strictQuery', false);

// Avoid logging full URI (contains credentials)
const safeUriLabel = (uri) => {
  if (!uri || typeof uri !== 'string') return '(mongodb)';
  try {
    const u = new URL(uri.replace('mongodb+srv://', 'https://').replace('mongodb://', 'http://'));
    return `${u.hostname}${u.pathname ? u.pathname : ''}`;
  } catch (_) {
    return '(mongodb)';
  }
};

module.exports = ({ uri }) => {
  const options = {
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000,
    maxPoolSize: 10,
  };

  mongoose.connect(uri, options);

  mongoose.connection.on('connected', function () {
    console.log('💾  Mongoose default connection open to', safeUriLabel(uri));
  });

  mongoose.connection.on('error', function (err) {
    console.log('💾  Mongoose connection error:', err.message || err);
    if (err.message && err.message.includes('ECONNRESET')) {
      console.log('=> ECONNRESET: connection was reset (Atlas/network). Check Atlas IP allowlist and network.');
    } else {
      console.log('=> If local: ensure Mongo is running. If Atlas: check network and IP allowlist.');
    }
  });

  mongoose.connection.on('disconnected', function () {
    console.log('💾  Mongoose default connection disconnected from', safeUriLabel(uri));
  });

  process.on('SIGINT', function () {
    mongoose.connection.close(function () {
      console.log('💾  Mongoose default connection disconnected through app termination');
      process.exit(0);
    });
  });
}
