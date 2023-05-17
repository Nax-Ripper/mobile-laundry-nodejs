const mongoose = require('mongoose');
const Product = require('./product_model').schema;

const orderSchema = mongoose.Schema({
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Services',
    // type:String
  },
  products: [
   {
    type:Product
   }
  ],
  subTotal: {
    type: Number,
    required: true,
  },
  riderFee: {
    type: Number,
    required: true,
  },
  serviceFee: {
    type: Number,
    required: true,
  },
  totalFee: {
    type: Number,
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users',
    // type:String
  },
  intendId: {
    type: String,
  },
  // paymentType:{
  //   type:String
  // },
  status:{
    type: Number,
    default: 2
  },
  pickUpTime:{
    type: Date,
  },
  deliveryTime:{
    type:Date
  },
  pickupLat:{
    type:Number
  },
  pickupLong:{
    type:Number
  },
  deliveryLat:{
    type:Number
  },
  deliveryLong:{
    type:Number
  },
  dobiLat:{
    type:Number,
    default:2.499571073897077
  },
  dobiLong:{
    type:Number,
    default: 102.85764956066805
  }


},
  { timestamps: true }
);


const Order = mongoose.model('Orders', orderSchema);

module.exports = Order;