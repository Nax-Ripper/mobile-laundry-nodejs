
const express = require('express');
const authRouter = require('./routes/auth');
const adminRouter = require('./routes/admin')
const mongoose = require('mongoose');

const env = require('dotenv').config();
// const PORT = 3000;
const PORT = process.env.PORT || 3000

mongoose.set('strictQuery', false);

// const uri = 'mongodb+srv://naren:test123@cluster0.kvlrrhj.mongodb.net/UserInfo?retryWrites=true&w=majority';



// init
const app = express();


// listen to port
// app.listen(PORT, "0.0.0.0", () => {
//   console.log(`connected to port ${PORT}`);
// })

// connect to db
// mongoose.connect(uri).then((result)=> {
// console.log('connected to bd');
// }).catch((error)=>{
//   console.error(error);
// })

const connectDB = async () => {
  try {
    const connect = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected :${connect.connection.host}`);
  } catch (error) {

    process.exit(1);

  }
}

connectDB().then(()=>{
  app.listen(PORT,()=>{
    console.log(`Listening on port ${PORT}`);
  })
})

// middleware (mostly for format the req)
// CLIENT -> MIDDLEWARE ->SERVER -> CLIENT
app.use(express.json())

app.use(authRouter);
app.use(adminRouter);



// create an api 
// get, put,post delete, update
// http://<ipadd>/hello-world
app.get('/hello-world', (req, res) => {
  res.json({ "hi": 'hello world', });
})









