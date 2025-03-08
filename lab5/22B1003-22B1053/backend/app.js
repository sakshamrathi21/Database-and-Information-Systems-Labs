const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const bcrypt = require("bcrypt");
const cors = require("cors");
const { Pool } = require("pg");
const app = express();
const port = 4000;

// PostgreSQL connection
// NOTE: use YOUR postgres username and password here
const pool = new Pool({
  user: 'test',
  host: 'localhost',
  database: 'ecommerce',
  password: 'test',
  port: 5432,
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// CORS: Give permission to localhost:3000 (ie our React app)
// to use this backend API
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

// Session information
app.use(
  session({
    secret: "your_secret_key",
    resave: false,
    saveUninitialized: true,
    cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 24 }, // 1 day
  })
);

/////////////////////////////////////////////////////////////
// Authentication APIs
// Signup, Login, IsLoggedIn and Logout

// TODO: Implement authentication middleware
// Redirect unauthenticated users to the login page with respective status code
function isAuthenticated(req, res, next) {
  if (!req.session.userID) {
    return res.status(400).redirect("/login", {message: "Unauthorized"});
  }
  next();
}

// TODO: Implement user signup logic
// return JSON object with the following fields: {username, email, password}
// use correct status codes and messages mentioned in the lab document
app.post('/signup', async (req, res) => {
  const {username, email, password} = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  if (!username || !email || !password) {
    return res.status(500).json({message: "Error signing up"});
  }

  const Email = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
  if (Email.rows.length > 0) {
    return res.status(400).json({message: "Error: Email is already registered."});
  }

  try {
    const newUser = await pool.query('INSERT INTO Users (username, password_hash, email) values ($1, $2, $3) returning user_id', [username, hashedPassword, email]);
    req.session.userID = newUser.rows[0].user_id;
    return res.status(200).json({message: "User Registered Successfully"});
  }
  catch (err) {
    return res.status(500).json({message: "Error signing up"});
  }

});

// TODO: Implement user signup logic
// return JSON object with the following fields: {email, password}
// use correct status codes and messages mentioned in the lab document
app.post("/login", async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (result.rows.length === 0) {
      return res.status(400).json({message: "Invalid credentials"});
    }

    const user = result.rows[0];
    const isPasswordMatch = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordMatch) {
      return res.status(400).json({message: "Invalid credentials"});
    }

    req.session.userID = user.user_id;
    res.status(200).json({message: "Login successful"});
  } catch (err) {
    console.error("Error in login", err);
    res.status(500).json({message: "Error logging in"});
  }
});



// TODO: Implement API used to check if the client is currently logged in or not.
// use correct status codes and messages mentioned in the lab document
app.get("/isLoggedIn", async (req, res) => {
  if (req.session.userID) {
    const usernameResult = await pool.query("SELECT username FROM users WHERE user_id = $1", [req.session.userID]);
    const username = usernameResult.rows[0].username;
    return res.status(200).json({ message: "Logged in", username });
  }
  res.status(400).json({message: "Not logged in"});
});

// TODO: Implement API used to logout the user
// use correct status codes and messages mentioned in the lab document
app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({message: "Failed to log out"});
    }
    res.status(200).json({message: "Logged out successfully"});
  })
});

////////////////////////////////////////////////////
// APIs for the products
// use correct status codes and messages mentioned in the lab document
// TODO: Fetch and display all products from the database
app.get("/list-products", isAuthenticated, async (req, res) => {
  if (!req.session.userID) {
    return res.status(400).json({message: "Unauthorized"});
  }
  try {
    const result = await pool.query('SELECT * from Products ORDER BY product_id');
    res.status(200).json({message: "Products fetched successfully", products: result.rows});
  }
  catch (err) {
    res.status(500).json({message: "Error listing products"});
  }
});

// APIs for cart: add_to_cart, display-cart, remove-from-cart
// TODO: impliment add to cart API which will add the quantity of the product specified by the user to the cart
app.post("/add-to-cart", isAuthenticated, async (req, res) => {
  // console.log(req.session.userID);
  const user_id = req.session.userID;
  if (! req.session.userID) {
    return res.status(400).json({message: "Unauthorized"});
  }
  var {product_id, quantity} = req.body;
  if (!product_id || !quantity) {
    return res.status(500).json({message: "Error adding to cart"});
  }
  try {
    // console.log(product_id, quantity);
    const product = await pool.query('SELECT * FROM Products WHERE product_id = $1', [product_id]);
    if (product.rows.length === 0) {
      return res.status(400).json({message: "Invalid product ID"});
    }
    const cart_quantity = await pool.query('SELECT * FROM Cart WHERE user_id = $1 AND item_id = $2', [user_id, product_id]);
    // console.log(cart_quantity.rows)
    
    if (cart_quantity.rows.length > 0) {
      quantity = parseInt(quantity, 10) + parseInt(cart_quantity.rows[0].quantity, 10);
    }
    if (quantity > product.rows[0].stock_quantity) {
      return res.status(400).json({ message: `Insufficient stock for ${product.name}.` }); // doubtful
    }
    const existingProduct = await pool.query('SELECT * FROM Cart WHERE user_id = $1 AND item_id = $2', [user_id, product_id]);
    // console.log(existingProduct.rows, req.session.userId, product_id);  
    if (existingProduct.rows.length > 0) {
      const newQuantity = quantity;
      const prevQuantity = existingProduct.rows[0].quantity;
      // console.log(newQuantity, prevQuantity);
      await pool.query('UPDATE Cart SET quantity = $1 WHERE user_id = $2 AND item_id = $3', [newQuantity, user_id, product_id]);
      return res.status(200).json({message: `Successfully added ${newQuantity - prevQuantity} of ${product.rows[0].name} to your cart.`})
    }
    // console.log(req.session.userId, product_id, quantity);  
    await pool.query('INSERT INTO Cart (user_id, item_id, quantity) VALUES ($1, $2, $3)', [user_id, product_id, quantity]);
    // console.log(product);
    // console.log("Added to cart");
    res.status(200).json({message: `Successfully added ${quantity} of ${product.rows[0].name} to your cart.`});
  }
  catch (err) {
    console.error(err);
    res.status(500).json({message: "Error adding to cart"});
  }
});

// TODO: Implement display-cart API which will returns the products in the cart
app.get("/display-cart", isAuthenticated, async (req, res) => {
  const user_id = req.session.userID;
  if (!req.session.userID) {
    return res.status(400).json({ message: "Unauthorized" });
  }

  try {
    const checkCart = await pool.query("SELECT * FROM cart WHERE user_id = $1", [user_id]);
    if (checkCart.rows.length === 0) {
      return res.status(200).json({ message: "No items in cart.", cart: [], totalPrice: 0 });
    }

    const cartResult = await pool.query("SELECT C.item_id, P.product_id, P.name AS product_name, C.quantity, P.stock_quantity, P.price AS unit_price, (C.quantity * P.price) AS total_item_price FROM cart C JOIN products P ON C.item_id = P.product_id WHERE C.user_id = $1 ORDER BY P.product_id", [user_id]);
    const cart = cartResult.rows;
    let totalPrice = 0;
    for (let i = 0; i < cart.length; i++) {
      totalPrice += parseFloat(cart[i].total_item_price);
      // totalPrice += parseInt(cart[i].total_item_price, 10);
    }

    res.status(200).json({ message: "Cart fetched successfully.", cart, totalPrice });
  } catch (err) {
    console.error("Error fetching cart", err);
    res.status(500).json({ message: "Error fetching cart" });
  }

});

// TODO: Implement remove-from-cart API which will remove the product from the cart
app.post("/remove-from-cart", isAuthenticated, async (req, res) => {
  const user_id = req.session.userID;
  if (!req.session.userID) {
    return res.status(400).json({message: "Unauthorized"});
  }
  const {product_id} = req.body;
  if (!product_id) {
    return res.status(500).json({message: "Error removing item from cart"});
  }
  try {
    const product = await pool.query('SELECT * FROM Products WHERE product_id = $1', [product_id]);
    if (product.rows.length === 0) {
      return res.status(500).json({message: "Error removing item from cart"});
    }
    // console.log("hello");
    const existingProduct = await pool.query('SELECT * FROM Cart WHERE user_id = $1 AND item_id = $2', [user_id, product_id]);
    if (existingProduct.rows.length === 0) {
      return res.status(400).json({message: "Item not present in your cart."})
    }
    // console.log(req.session.userId, product_id);
    await pool.query('DELETE FROM Cart WHERE user_id = $1 AND item_id = $2', [user_id, product_id]);
    res.status(200).json({message: `Item removed from your cart successfully.`});
  }
  catch (err) {
    console.error("Error removing item from cart", err);
    res.status(500).json({message: "Error removing item from cart"});
  }
});
// TODO: Implement update-cart API which will update the quantity of the product in the cart
app.post("/update-cart", isAuthenticated, async (req, res) => {
  const user_id = req.session.userID;
  if (!req.session.userID) {
    return res.status(400).json({ message: "Unauthorized" });
  }
  // console.log(req.body);
  const product_id = req.body.product_id;
  const quantity = parseInt(req.body.quantity);

  try {
    const checkProductInCart = await pool.query("SELECT * FROM cart WHERE user_id = $1 AND item_id = $2", [user_id, product_id]);
    let currentQuantity = 0;
    if (checkProductInCart.rows.length > 0) {
      currentQuantity = parseInt(checkProductInCart.rows[0].quantity);
    }
    const newQuantity = currentQuantity + quantity;
    // console.log(product_id, newQuantity);
    const stockQuantityResult = await pool.query("SELECT stock_quantity FROM Products WHERE product_id = $1", [product_id]);
    // console.log(stockQuantityResult.rows);
    const stockQuantity = parseInt(stockQuantityResult.rows[0].stock_quantity);
    // console.log("hello", newQuantity, stockQuantity); 
    if (newQuantity <= 0) {
      await pool.query("DELETE FROM cart WHERE user_id = $1 AND item_id = $2", [user_id, product_id]);
    } else if (newQuantity > stockQuantity) {
      return res.status(400).json({ message: "Requested quantity exceeds available stock" });
    } else {
      if (checkProductInCart.rows.length > 0) {
        await pool.query("UPDATE cart SET quantity = $1 WHERE user_id = $2 AND item_id = $3", [newQuantity, user_id, product_id]);
      } else {
        await pool.query("INSERT INTO cart (user_id, product_id, quantity) VALUES ($1, $2, $3)", [user_id, product_id, newQuantity]);
      }
    }
    // console.log("Cart updated successfully");
    res.status(200).json({ message: "Cart updated successfully" });
  } catch (err) {
    console.error("Error updating cart", err);
    res.status(500).json({ message: "Error updating cart" });
  }
});

// APIs for placing order and getting confirmation
// TODO: Implement place-order API, which updates the order,orderitems,cart,orderaddress tables
app.post("/place-order", isAuthenticated, async (req, res) => {
  const user_id = req.session.userID;
  const { pincode, street, city, state } = req.body;
  if (!req.session.userID) {
    return res.status(400).json({message: "Unauthorized"});
  }
  try {
    const cart = await pool.query('SELECT * FROM Cart WHERE user_id = $1', [user_id]);
    if (cart.rows.length === 0) {
      return res.status(400).json({message: "Cart is empty"});
    }
    const inStock = await pool.query('SELECT *, (Cart.quantity <= Products.stock_quantity) AS in_stock FROM Products, Cart where Products.product_id = Cart.item_id AND Cart.user_id = $1', [user_id]);
    if (inStock.rows.some(item => !item.in_stock)) {
      return res.status(400).json({message: `Insufficient stock for ${inStock.rows.find(item => !item.in_stock).name}.`});
    }
    const insertOrder = await pool.query('INSERT INTO Orders (user_id, total_amount) VALUES ($1, $2) RETURNING order_id', [user_id, inStock.rows.reduce((acc, item) => acc + item.quantity * item.price, 0)]);
    order_id = insertOrder.rows[0].order_id;
    
    for (const item of inStock.rows) {
      await pool.query('INSERT INTO OrderItems (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)', [order_id, item.product_id, item.quantity, item.price]);
    }
    for (const item of inStock.rows) {
      await pool.query('UPDATE Products SET stock_quantity = stock_quantity - $1 WHERE product_id = $2', [item.quantity, item.product_id]);
    }
    await pool.query('INSERT into OrderAddress (order_id, street, city, state, pincode) values ($1, $2, $3, $4, $5)', [order_id, street, city, state, pincode]);
    await pool.query('DELETE FROM Cart WHERE user_id = $1', [user_id]);
    req.session.userId = user_id;
    res.status(200).json({message: "Order placed successfully"});
    // res.redirect('/order-confirmation');
  }
  catch (err) {
    console.error("Error placing order", err);
    res.status(500).json({message: "Error placing order"});
  }
});

// API for order confirmation
// TODO: same as lab4
app.get("/order-confirmation", isAuthenticated, async (req, res) => {
  const user_id = req.session.userId;
  if (!req.session.userId) {
    return res.status(400).json({message: "Unauthorized"});
  }
  try {
    const order = await pool.query('SELECT * FROM Orders WHERE user_id = $1 ORDER BY order_id DESC LIMIT 1', [user_id]);
    if (order.rows.length === 0) {
      return res.status(400).json({message: 'No orders found'});
    }
    const orderItemsResult = await pool.query(
      `SELECT OrderItems.product_id, Products.name, OrderItems.quantity, OrderItems.price, (OrderItems.quantity * OrderItems.price) AS total_price
       FROM OrderItems, Products
       WHERE order_id = $1 AND OrderItems.product_id = Products.product_id
       ORDER BY OrderItems.product_id`,
      [order.rows[0].order_id]
    );
    let totalAmount = 0;
    orderItemsResult.rows.forEach((item) => {
      totalAmount += parseFloat(item.total_price);
    });
    res.status(200).json({ order: order.rows[0], orderItems: orderItemsResult.rows, totalAmount: totalAmount });
  }
  catch (error) {
    console.error(error);
    res.status(500).json({message: 'Server error'});
  }
});

////////////////////////////////////////////////////
// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});