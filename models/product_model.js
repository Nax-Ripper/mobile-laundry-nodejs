const mongoose = require('mongoose');

const productSchema = mongoose.Schema({
  name: {
    type: String,
    trim: true
  },
  // _id: {
  //   type: String,
  //   required: false
  // },
  description: {
    type: String,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    trim: true
  },
  images: [
    {
      type: String,
    }
  ],
  quantity: {
    type: Number,
    default: 0
  }
})


const Product = mongoose.model('Product', productSchema);
module.exports = Product;