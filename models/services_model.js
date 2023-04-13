const mongoose = require('mongoose')

const servicesSchema = mongoose.Schema({
name:{
  type: String,
  required: true,
  trim: true
},
description:{
  type:String,
  required:true,
  trim:true
},
imageUrl:{
  type:String,
  required:true,

},
isSelected:{
  type:Boolean,
  required:false,
}
});


const Service = mongoose.model('Services',servicesSchema);

module.exports = Service;