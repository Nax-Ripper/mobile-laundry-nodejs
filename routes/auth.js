const express = require('express');
const User = require('../models/user_model');
const Service = require('../models/services_model');
const Product = require('../models/product_model');
const mongoose = require('mongoose');

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const auth = require('../middlewares/auth');


const authRouter = express.Router();

// 1. post to signUp 
authRouter.post('/api/signup', async (req, res) => {
  // 1. Get data from user
  // 2. post the data to db
  // 3. return that data to user
try {
  
  const { name, email, password } = req.body;

  const existingUser = await User.findOne({email:email});



  if (existingUser) {
    return res.status(400).json({
      msg: 'User with same email address already exists',
    })
  }

  const salt = bcrypt.genSaltSync(10);
  const hashPwd = bcrypt.hashSync(password,salt);

  let user = new User({
    name: name,
    email: email,
    password: hashPwd
  })

  user = await user.save();
  res.json(user);
} catch (error) {
  res.status(500).json({error:error.message});
}

});



// Sign In Route
authRouter.post('/api/signin',async (req, res)=>{
 try {
  const {email, password} = req.body;
  // check user exitst
  // const user =Promise.resolve(User.findOne({email:email}));
    const user= await User.findOne({email:email});


  if(!user){
    return res.status(400).json({msg:`User not exist with this email: ${email}`})
  }
  // 1.unencrypt the pwd
  const isMatch = await bcrypt.compare(password,user.password);
  if(!isMatch){
   return  res.status(400).json({msg:'Incorrect Password'})
  }
  // if match
  const token = jwt.sign({id: user._id},'passwordKey',);

  return res.status(200).json({
    token:token,
    ...user._doc
  });

  // {
  //   token : 'sometoken',
  //   name: nameNaren,
  //   email:email

  // }
 
 } catch (error) {
  res.json(error.message);
 }

});


authRouter.post('/tokenIsValid',async(req,res)=>{
  try {
    const token = req.header('x-auth-token');
    if(!token) return res.json(false);
    const verified = jwt.verify(token,'passwordKey');
    if(!verified) return res.json(false);
    const isCorrectUser = await User.findById(verified.id);
    if(!isCorrectUser) return res.json(false);
    res.json(true);
  } catch (error) {
    res.json(error);
  }
});

authRouter.get('/', auth, async (req, res) => {
  console.log(req.user);
  const user = await User.findById(req.user);

  res.json({...user._doc,token:req.token})
})


authRouter.get('/api/get-services', auth , async (req, res) => {
try {
  let service = await Service.find()
  res.json({service});
  
} catch (error) {
  res.status(500).json({error:error.message});
}
})

authRouter.get('/api/get-product', auth, async (req, res) => {
  try {

   let product = await Product.find({});
    return res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

authRouter.post('/api/orders', auth, async (req, res) => {
try {
  const {productId,quantity,serviceId} = req.body

  const product = await Product.findOne({_id: productId});
  const service = await Service.findOne({_id:serviceId});
  console.log(product['price']);
 return res.json({product,service})
  // res.json({...product.name})
} catch (error) {

  res.status(500).json({error:error.message})
  
}

})

authRouter.get('/api/get-rider-fee',auth,async(req,res) => {
  const now = new Date();
  console.log(now);

  if(now.getHours()> 17 || now.getHours() < 5)
{
 return res.json({riderFee: 20})
}  else{
 return res.json({riderFee:10})
}
});







// authRouter.post("/api/signin", async (req, res) => {
//     const { email, password } = req.body;//request email, password

//     const user = await User.findOne({ email });//check exist or not
//     if (!user) {
//         return res.json({ error: "User not exists" });
//     }
//     if (await bcrypt.compare(password, user.password)) {

//         if (res.status(201)) {
//             return res.json({ status: "ok", data: token });
//         } else {
//             return res.json({ error: "error" });
//         }
//     }
//     res.json({ status: "error", error: "Invalid Password " });
// });





module.exports = authRouter;