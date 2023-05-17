const express = require('express');
const adminRoute = express.Router();
const admin = require('../middlewares/admin');

const Product = require('../models/product_model');
const Services = require('../models/services_model');

adminRoute.post('/admin/add-product', admin, async (req, res) => {
  try {
    const { name, description, price, images, } = req.body;

    let product = new Product({ name, description, price, images ,},)

    product = await product.save();
    return res.json(product);

  } catch (error) {

    res.status(500).json({ error: error.message });

  }
});


adminRoute.get('/admin/get-product', admin, async (req, res) => {
  try {

   let product = await Product.find({});
    return res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})


adminRoute.post('/admin/delete-product', admin, async (req, res) => {
  try {
    console.log(req.body);
    const {id} = req.body;
    let product = await Product.findByIdAndRemove(id);
    // product = await product.save();
    return res.json(product)
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})


adminRoute.post('/admin/add-service',admin,async (req, res) => {
  try {
    const {name,description,imageUrl} = req.body
     
    let service = new Services({name,description,imageUrl});

    service = await service.save();
    return res.json(service);
    
  } catch (error) {
    res.status(500).json({error:error.message});
  }
})



module.exports = adminRoute;