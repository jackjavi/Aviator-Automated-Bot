import mongoose from "mongoose";

const productKeySchema = new mongoose.Schema({
  productKey: {
    type: String,
    required: true,
  },
});

const ProductKey = mongoose.model("ProductKey", productKeySchema);

export default ProductKey;
