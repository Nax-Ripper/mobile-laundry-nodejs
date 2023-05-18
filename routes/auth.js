const express = require('express');
const User = require('../models/user_model');
const Service = require('../models/services_model');
const Product = require('../models/product_model');
const mongoose = require('mongoose');

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const auth = require('../middlewares/auth');


const Order = require('../models/order_model');

const RiderOrders = require('../models/rider_order_model');
const Rider = require('../models/rider_model');

const PDFDocument = require('pdfkit');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const request = require('request');
const puppeteer = require('puppeteer');
const ejs = require('ejs');
const { log } = require('console');

const doc = new PDFDocument({ dpi: 300 });
const authRouter = express.Router();

// 1. post to signUp 
authRouter.post('/api/signup', async (req, res) => {
  // 1. Get data from user
  // 2. post the data to db
  // 3. return that data to user
  try {

    const { name, email, password } = req.body;

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
      password: hashPwd
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

    // {
    //   token : 'sometoken',
    //   name: nameNaren,
    //   email:email

    // }

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
    fs.unlink(pdfPath,(error)=>{
      if(error){
        console.log('Error deleting file :', error);
      }else{
        console.log('File deleted successfully');
      }
    })

    return res.json(rider);

  } catch (error) {
    res.json({ error: error.message })
  }
});

async function convertToPDF(name, phone, email, icUrl, lisenceUrl) {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  // Set page content and wait for rendering to complete
  const htmlContent = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rider Application</title>
  </head>
  <body>
    <h1>Rider Application for ${name}</h1>
    <h2>Name: ${name}</h2>
    <h2>Email: ${email}</h2>
    <h2>Phone Number: ${phone}</h2>
    <div>
      <h2>IC Image:</h2>
      <img src="${icUrl}" height="500px" width="300px" alt="IC Image">
      <h2>License Image:</h2>
      <img src="${lisenceUrl}" height="500px" width="300px" alt="License Image">
    </div>
  </body>
  </html>
`;
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
      orders = await Order.find({});
      for (let i = 0; i < orders.length; i++) {
        userIds[i] = orders[i]['userId']; //get userId
        users[i] = await User.findById(userIds[i]); //get User for that id

        // combined = {
        //   orders: orders.map((order) => {
        //     return order;
        //   }),
        //   // ...users[i]._doc
        //   user:users[i]
        // }

        riderOrders[i] = orders[i].toJSON();
        riderOrders[i] = { ...riderOrders[i], user: users[i] };

        console.log('orderToJson', riderOrders);




      }




      // console.log(combined, 'orders');
      return res.json({ "riderOrders": riderOrders })


    } else {
      order = await Order.find({ userId: id });
      users = await User.findById(order.userId);

      res.json({ "orders": order });


    }

  } catch (error) {
    return res.status(500).json({
      error: error.message
    });

  }

});


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