const mongoose = require('mongoose');


const userSchema = mongoose.Schema({

  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: (value) => {
        const regex = /^[A-Za-z0-9_!#$%&'*+\/=?`{|}~^.-]+@[A-Za-z0-9.-]+$/gm;

        return value.match(regex);

      },
      msg: 'Please enter a valid email address',
    }
  },
  password: {
    type: String,
    required: true,
    trim: true,
    validate :{
      validator :(value)=>{
       return value.length >6;

      },
      msg: "Please enter a valid password"
    }
  },
  address: {
    type: String,
    default: '',
  },
  type: {
    type: String,
    default: 'user',
  },
  phoneNumber:{
    type:String,
    default: '',
    trim:true,
    require:true,
    validate:{
      validator:(value)=>{
        return value.length<9;
      },
      mag:'Please enter a valid phone number'
    }
  }



});


const User = mongoose.model('Users', userSchema );

module.exports = User;