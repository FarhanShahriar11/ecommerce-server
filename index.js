const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ggstth2.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    const productCollection = client.db("ecommerce").collection("products");
    const cartCollection = client.db("ecommerce").collection("cart");

    // ✅ Fetch all products
    app.get("/products", async (req, res) => {
      try {
        const products = await productCollection.find().toArray();
        res.json(products);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // ✅ Fetch a single product by ID
    app.get("/products/:id", async (req, res) => {
      try {
        const product = await productCollection.findOne({
          _id: new ObjectId(req.params.id),
        });
        if (!product) return res.status(404).json({ message: "Product not found" });
        res.json(product);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // ✅ Fetch all cart items
    app.get("/cart", async (req, res) => {
      try {
        const cartItems = await cartCollection.find().toArray();
        res.json(cartItems);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // ✅ Add Product to Cart
    app.post("/cart", async (req, res) => {
      try {
        const { productId, quantity } = req.body;
        const product = await productCollection.findOne({ _id: new ObjectId(productId) });

        if (!product) return res.status(404).json({ message: "Product not found" });

        // Check if the product already exists in the cart
        const existingCartItem = await cartCollection.findOne({ productId });

        if (existingCartItem) {
          // If product exists, update quantity
          await cartCollection.updateOne(
            { productId },
            { $set: { quantity: existingCartItem.quantity + quantity } }
          );
          res.status(200).json({ message: "Cart updated", existingCartItem });
        } else {
          // Otherwise, insert a new item
          const cartItem = {
            productId,
            name: product.name,
            price: product.price,
            quantity,
          };

          await cartCollection.insertOne(cartItem);
          res.status(201).json({ message: "Added to cart", cartItem });
        }
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // ✅ Remove Item from Cart
    app.delete("/cart/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const result = await cartCollection.deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
          return res.status(404).json({ message: "Item not found" });
        }

        res.json({ message: "Item removed from cart" });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    // ✅ Checkout & Place Order 
app.post("/checkout", async (req, res) => {
    try {
      const { userInfo } = req.body;
  
      // Fetch all cart items before checkout
      const cartItems = await cartCollection.find().toArray();
  
      if (cartItems.length === 0) {
        return res.status(400).json({ message: "Cart is empty. Add items before checkout." });
      }
  
      // Calculate total amount
      const totalAmount = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  
      // Create an order object
      const order = {
        userInfo,
        items: cartItems,
        totalAmount,
        createdAt: new Date(),
      };
  
      // Insert order into "orders" collection
      const orderResult = await client.db("ecommerce").collection("orders").insertOne(order);
  
      // Clear the cart after successful order placement
      await cartCollection.deleteMany({});
  
      res.status(201).json({
        message: "Order placed successfully",
        orderId: orderResult.insertedId,
        order,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  

    
    
    console.log("Connected to MongoDB!");
  } finally {
    // await client.close(); // Don't close the connection while the server is running
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("E-commerce API is running");
});

app.listen(port, () => {
  console.log(`E-commerce is running on port ${port}`);
});
