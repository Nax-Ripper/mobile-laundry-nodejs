const mongoose = require('mongoose');

const riderSchema = mongoose.Schema({
    name:{
        type:String,
        required :true,
        trim:true
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
        // required: true,
        trim: true,
        // validate :{
        //   validator :(value)=>{
        //    return value.length >6;
    
        //   },
        //   msg: "Please enter a valid password"
        // }
      },
      phoneNumber:{
        type:String,
        default: '',
        trim:true,
        require:true,
        validate:{
          validator:(value)=>{
            return value.length<11;
          },
          msg:'Please enter a valid phone number'
        }
      },
      imagesIc:[
        {
            type:String
        }
      ],
      imageLisence:[{
        type:String
      }],
      type: {
        type: String,
        default: 'rider',
      },
      approved:{
        type:Boolean,
        default:false
      },
      pdf:{
        type:String
      }


});

const Rider = mongoose.model('Rider',riderSchema);

module.exports = Rider;



