const mongoose = require('mongoose');

const productSchema = mongoose.Schema({
  name:{
    type:String,
    required:true,
    trim:true
  },
  description:{
    type:String,
    required:true,
    trim:true
  },
  price:{
    type:Number ,
    required:true,
    trim:true
  },
  images:[
    {
      type:String,
      required:true,
    }
  ],
  quantity:{
    type:Number,
    default:0
  }
})


const Product = mongoose.model('Product',productSchema);
module.exports = Product;