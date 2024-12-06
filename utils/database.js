import mongoose from "mongoose";
import ProductKey from "../models/productKey.js";
import dotenv from "dotenv";
dotenv.config();

const connectDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    if (!process.env.MONGO_URI) {
      process.exit(1);
    }

    const productKey = await ProductKey.findOne({
      productKey: "1234567890",
    }).exec();

    if (!productKey) {
      process.exit(1);
    }
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

export default connectDatabase;
