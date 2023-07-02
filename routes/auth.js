const express = require('express');
const User = require('../models/user_model');
const Service = require('../models/services_model');
const Product = require('../models/product_model');
const mongoose = require('mongoose');

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const auth = require('../middlewares/auth');


const Order = require('../models/order_model');

const Rider = require('../models/rider_model');

const PDFDocument = require('pdfkit');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const request = require('request');
const puppeteer = require('puppeteer');

const { log, timeStamp } = require('console');


const doc = new PDFDocument({ dpi: 300 });
var passwordGenerator = require('generate-password');
const nodemailer = require('nodemailer');
const otpGenerator = require('otp-generator')
const crypto = require('crypto');
const optSecretKey = 'otp-secret-key';
const msg91 = require('msg91').default;

msg91.initialize({ authKey: optSecretKey });

const authRouter = express.Router();

// 1. post to signUp 
authRouter.post('/api/signup', async (req, res) => {
  // 1. Get data from user
  // 2. post the data to db
  // 3. return that data to user
  try {

    const { name, email, password, phoneNumber } = req.body;

    console.log(req.body);

    const existingUser = await User.findOne({ email: email });



    if (existingUser) {
      return res.status(400).json({
        msg: 'User with same email address already exists',
      })
    }

    const salt = bcrypt.genSaltSync(10);
    const hashPwd = bcrypt.hashSync(password, salt);

    let user = new User({
      name: name,
      email: email,
      password: hashPwd,
      phoneNumber: phoneNumber
    })

    user = await user.save();
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }

});



// Sign In Route 
authRouter.post('/api/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { riderQuery } = req.query;
    console.log(riderQuery);
    if (riderQuery == 'rider') {
      const rider = await Rider.findOne({ email: email });
      if (!rider) {
        return res.status(400).json({ msg: 'User not exist with this email' });

      }
      const isMatch = await bcrypt.compare(password, rider.password);
      if (!isMatch) {
        return res.status(400).json({ msg: 'Incorrect Password' });

      }
      const token = jwt.sign({ id: rider._id }, 'passwordKey');
      return res.status(200).json({
        token, ...rider._doc
      })
    } else {
      // check user exitst
      // const user =Promise.resolve(User.findOne({email:email}));
      const user = await User.findOne({ email: email });


      if (!user) {
        return res.status(400).json({ msg: `User not exist with this email: ${email}` })
      }
      // 1.unencrypt the pwd
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ msg: 'Incorrect Password' })
      }
      // if match
      const token = jwt.sign({ id: user._id }, 'passwordKey',);

      return res.status(200).json({
        token: token,
        ...user._doc
      });

    }


  } catch (error) {
    res.json(error.message);
  }

});


authRouter.post('/api/rider/signUp', async function (req, res) {
  try {
    const { name, email, phone, icURL, lisenceURL } = req.body;
    console.log(name);
    const existingUser = await Rider.findOne({ email: email });

    if (existingUser) {
      return res.status(400).json({
        msg: 'User with same email address already exists',
      })
    }

    let rider = new Rider({
      name: name,
      email: email,
      phoneNumber: phone,
      imagesIc: icURL,
      imageLisence: lisenceURL,
    });
    rider = await rider.save();

    // take the url store in db
    // return res.json(rider);

    const pdfPath = await convertToPDF(name, phone, email, icURL, lisenceURL);
    console.log(pdfPath);

    const cloudiResult = await cloudinary.uploader.upload(`${pdfPath}`, {
      folder: `Riders/${name}`,
      public_id: `${name}`,
      type: 'upload'
    });
    rider.pdf = cloudiResult.secure_url;
    await rider.save();
    fs.unlink(pdfPath, (error) => {
      if (error) {
        console.log('Error deleting file :', error);
      } else {
        console.log('File deleted successfully');
      }
    })

    return res.json(rider);

  } catch (error) {
    res.json({ error: error.message })
  }
});

authRouter.get('/api/get-all-applied-riders', async function (req, res) {
  try {
    const { approved } = req.query;
    if (approved == 'approved') {
      const riders = await Rider.find({
        approved: true
      })
      return res.json({ riders: riders })
    } else {
      const riders = await Rider.find({
        approved: false
      });
      return res.json({ riders: riders });

    }

  } catch (error) {
    return res.json({ error: error.message })

  };


});


authRouter.post('/api/get-otp', async function (req, res) {
  const { email, riderid } = req.query;

  const otp = otpGenerator.generate(4, {
    digits: true,
    lowerCaseAlphabets: false,
    upperCaseAlphabets: false,
    specialChars: false
  });
  console.log(otp);
  const ttl = 5 * 60 * 1000;
  const expires = Date.now() + ttl;
  const data = `${email}.${otp}.${expires}`
  const hash = crypto.createHmac('sha256', optSecretKey).update(data).digest('hex')
  const fullHash = `${hash}.${expires}`

  const rider = await Rider.findByIdAndUpdate(riderid, {
    tempHash: fullHash,
  }, { new: true })

  await transporter.sendMail({
    from: 'narendran@graduate.utm.my',
    to: email,
    subject: 'Rider OTP',
    html: `<h1>Rider OTP is : ${otp}</h1>`
  })

  return res.json({
    message: 'Success',
    data: fullHash,

  });



})

authRouter.post('/api/verify-otp', async function (req, res) {
  const { otp, hash, email, riderId,orderId } = req.body;
  console.log(req.body);
  let [hashValue, expires] = hash.split('.');
  let now = Date.now();
  if (now > parseInt(expires)) {
    return res.json({ message: 'OTP Expired' });
  }

  let data = `${email}.${otp}.${expires}`;
  let newCalculateHash = crypto.createHmac('sha256', optSecretKey).update(data).digest('hex');

  if (newCalculateHash === hashValue) {
    const order = await Order.findByIdAndUpdate(orderId, {
      verified: true,
      riderId:riderId,
    }, { new: true })
    return res.json({ message: 'Success' })
  }
  return res.json({ message: 'Invalid OTP' })


})

async function verifyOTP(params, callback) {
  let [hashValue, expires] = params.hash.split('.');
  let now = Date.now();
  if (now > parseInt(expires)) return callback('OTP Expired');

  let data = `${params.phone}.${params.otp}.${expires}`;
  let newCalculateHash = crypto.createHmac('sha256', optSecretKey).update(data).digest('hex');

  if (newCalculateHash === hashValue) {
    return callback(null, 'Success')
  }
  return callback('Invalid OTP')

}

const transporter = nodemailer.createTransport({
  // host: 'smtp.gmail.com',
  // port: 587,
  service: 'gmail',
  // secure: false,
  auth: {
    user: 'narendran@graduate.utm.my',
    pass: 'usceqmhcnawgdmnw'
  }
})

authRouter.post('/api/approve-rider/:id', async function (req, res) {


  // change approvd to true 
  //  generate temp password 
  // save to database
  // send email the username and password

  try {
    const { id } = req.params;
    console.log(id);


    var rider = await Rider.findById(id);

    if (!rider.approved) {
      const genPassword = passwordGenerator.generate({
        length: 8,
        numbers: true,
      });

      const salt = bcrypt.genSaltSync(10);
      const hashPwd = bcrypt.hashSync(genPassword, salt);

      console.log(hashPwd);
      console.log(genPassword);

      rider = await Rider.findByIdAndUpdate(id, {
        approved: true,
        password: hashPwd.toString()
      });

      log(rider.email);

      await transporter.sendMail({
        from: 'narendran@graduate.utm.my',
        to: rider.email,
        subject: 'Your Application has been approved',
        html: `<h1>Your password is : ${genPassword}</h1> <br> <h1>Your email is : ${rider.email}</h1>`
      })
      return res.json(rider)
    } else {
      return res.json({ msg: 'Rider already approved' })
    }


  } catch (error) {
    return res.json({ error: error.message })
  }

})

async function convertToPDF(name, phone, email, icUrl, lisenceUrl) {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  const htmlContent =
    `<!DOCTYPE html>
<html>
<head>
  <title>User Details</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background-color: #f7f7f7;
    }

    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background-color: #fff;
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
      border-radius: 5px;
    }

    .user-info {
      margin-bottom: 20px;
    }

    .user-info label {
      display: block;
      font-weight: bold;
      margin-bottom: 5px;
      color: #333;
    }

    .user-info span {
      display: inline-block;
      margin-bottom: 10px;
      color: #555;
    }

    .user-image {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
      border-top: 4px solid black;
      padding-top: 10px;
    }

    .user-image img {
      max-width: 48%;
      border-radius: 5px;
      box-shadow: 0 0 5px rgba(0, 0, 0, 0.2);
      height : 300;
      width: 300;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="user-info">
      <label for="name">Name:</label>
      <span id="name">${name}</span>
    </div>
    <div class="user-info">
      <label for="email">Email:</label>
      <span id="email">${email}</span>
    </div>
    <div class="user-info">
      <label for="phone">Phone:</label>
      <span id="phone">${phone}</span>
    </div>
    <div class="user-image">
      <label for="image1">Image 1:</label>
      <img id="image1" src="${icUrl}" alt="Image 1">
    </div>
    <div class="user-image">
      <label for="image2">Image 2:</label>
      <img id="image2" src="${lisenceUrl}" alt="Image 2">
    </div>
  </div>
</body>
</html>`
  await page.setContent(htmlContent);

  // Generate PDF
  const pdfPath = 'output.pdf'; // Update with your desired output path
  await page.pdf({ path: pdfPath, format: 'A4' });


  await browser.close();

  console.log('PDF generated successfully!');
  return pdfPath;
}







authRouter.post('/tokenIsValid', async (req, res) => {
  try {
    const token = req.header('x-auth-token');
    if (!token) return res.json(false);
    const verified = jwt.verify(token, 'passwordKey');
    if (!verified) return res.json(false);
    const isCorrectUser = await User.findById(verified.id);
    if (!isCorrectUser) return res.json(false);
    res.json(true);
  } catch (error) {
    res.json(error);
  }
});

authRouter.get('/', auth, async (req, res) => {
  console.log(req.user);
  const user = await User.findById(req.user);

  res.json({ ...user._doc, token: req.token })
})


authRouter.get('/api/get-services', auth, async (req, res) => {
  try {
    let service = await Service.find()
    res.json({ service });

  } catch (error) {
    res.status(500).json({ error: error.message });
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

// authRouter.post('/api/orders', auth, async (req, res) => {
//   try {
//     const { productId, quantity, serviceId } = req.body

//     const product = await Product.findOne({ _id: productId });
//     const service = await Service.findOne({ _id: serviceId });
//     console.log(product['price']);
//     return res.json({ product, service })
//     // res.json({...product.name})
//   } catch (error) {

//     res.status(500).json({ error: error.message })

//   }

// })

authRouter.get('/api/get-rider-fee', auth, async (req, res) => {
  const now = new Date();
  console.log(now);

  if (now.getHours() > 17 || now.getHours() < 5) {
    return res.json({ riderFee: 5 })
  } else {
    return res.json({ riderFee: 2 })
  }
});


authRouter.post('/api/place-order', auth, async (req, res) => {
  try {
    const { serviceId, products, subTotal, riderFee, serviceFee, totalFee, userId, intendId, pickUpTime, deliveryTime, pickupLat, pickupLong, deliveryLat, deliveryLong, } = req.body;

    console.log(req.body);
    console.log(serviceId);
    let order = new Order({

      serviceId: serviceId,
      products: products,
      subTotal: subTotal,
      riderFee: riderFee,
      serviceFee: serviceFee,
      totalFee: totalFee,
      userId: userId,
      intendId: intendId,
      pickUpTime,
      deliveryTime,
      pickupLat,
      pickupLong,
      deliveryLat,
      deliveryLong,

    });

    order = await order.save();

    return res.json(order);
  } catch (error) {
    return res.json({ error: error.message });
  }
});

authRouter.post('/api/updateRiderId/:id',async (req,res) => {
  try {
    const {id}=req.params;
    const {orderId}= req.query;
    const order = Order.findByIdAndUpdate(orderId,{
      riderId:id
    },{new:true})


  } catch (error) {
    
  }
})




authRouter.get('/api/get-orders/:id', auth, async function (req, res) {
  try {
    const { id } = req.params;
    let orders = [];
    let userIds = [];
    let users = [];

    let combined;
    // const withAdded ;
    let riderOrders = [];




    console.log(id);
    // res.json({id});
    if (id == "all") {
      orders = await Order.find({ 'accepted': false });
      for (let i = 0; i < orders.length; i++) {
        userIds[i] = orders[i]['userId']; //get userId
        users[i] = await User.findById(userIds[i]); //get User for that id


        riderOrders[i] = orders[i].toJSON();
        riderOrders[i] = { ...riderOrders[i], user: users[i] };

        console.log('orderToJson', riderOrders);




      }




      // console.log(combined, 'orders');
      return res.json({ "riderOrders": riderOrders })


    } else {
      order = await Order.find({ userId: id });
      // users = await User.findById(order.userId);

      order.sort((a, b) => {
        const timestampA = new Date(a.createdAt);
        const timestampB = new Date(b.createdAt);
        return timestampB - timestampA;
      })

      res.json({ "orders": order });


    }

  } catch (error) {
    return res.status(500).json({
      error: error.message
    });

  }

});

authRouter.post('/api/accept',async (req, res) => {
  

  try {
    const {id,accept} = req.body;
    log(res.body)
    const order = await Order.findByIdAndUpdate(id,{
      accepted:true
    },{new:true});

    res.json(order);
    
  } catch (error) {
    return res.status(500).json({error:error.message})
    
  }
})




authRouter.get('/api/getOrder-by-OrderId/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);
    const user = await User.findById(order['userId']);
    const service = await Service.findById(order['serviceId']);
    res.json({ ...order._doc, user: user, serviceName: service.name });


  } catch (error) {
    res.status(500).json({ error: error.message });
  }

})


authRouter.post('/api/update-stauts/:orderId/', async (req, res) => {
  try {
    const { orderId } = req.params
    const { status } = req.query
    console.log(status);
    console.log(orderId);
    const msg = checkStatus(status);
    if (msg == true) {
      const order = await Order.findByIdAndUpdate(orderId, { status: status }, { new: true });
      const service = await Service.findById(order['serviceId']);
      const user = await User.findById(order['userId']);
      let newUser = user.toObject();
      delete newUser.password;
      return res.json({ ...order._doc, user: newUser, serviceName: service.name });
    } else {
      return res.json(msg)
    }



  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
})


function checkStatus(status) {
  if (status != 0 && status != 1) {
    return { msg: 'Invalid status' }
  } else {
    return true
  }
}

function insertImageFromURL(url, x, y, width, height) {
  request({ url, encoding: null }, (error, response, body) => {
    if (!error && response.statusCode === 200) {
      const imageData = Buffer.from(body, 'base64');
      doc.image(imageData, x, y, { width, height, fit: [width, height], align: 'center', valign: 'center' });
      doc.end();
    } else {
      console.error('Error downloading the image:', error);
    }
  });
}

// authRouter.post('/api/accept-order', async function (req, res) {
//   try {
//     const { orderId } = req.query;
//     console.log(orderId);

//     const order = await Order.findByIdAndUpdate(
//       orderId,
//       {
//         accepted: true
//       }, { new: true });

//     return res.json(order);






//   } catch (error) {

//   }
// })






module.exports = authRouter;