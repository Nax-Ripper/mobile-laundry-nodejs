const mongoose = require('mongoose');
const Order = require('./order_model').schema;
const User = require('./user_model').schema;


const riderOrderSchema = mongoose.Schema({
  orders:[
    {
      type: Order
    }
  ],
  user:{
    type:User
  }
});

const rideOrderSchema = mongoose.model('RiderOrders', riderOrderSchema);

module.exports = rideOrderSchema;