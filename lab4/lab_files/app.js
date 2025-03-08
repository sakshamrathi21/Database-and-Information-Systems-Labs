const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const app = express();
const port = 3000;


// TODO: Update PostgreSQL connection credentials before running the server
const pool = new Pool({ // Requires Attention 
  user: 'sakshamrathi',
  host: 'localhost',
  database: 'sakshamrathi',
  password: '12345678',
  port: 5432,
});

app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

// Set up session
app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: true,
}));


// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

// Middleware to check if user is logged in
function isLoggedIn(req, res, next) {
  if (req.session.userId) {
    return res.redirect('/dashboard');  // Redirect to dashboard or home page
  }
  next();  // If not logged in, proceed to the signup/login page
}

// TODO: Implement authentication middleware
// Redirect unauthenticated users to the login page
function isAuthenticated(req, res, next) {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  next();
}


// Route: Home page
app.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM Products');
    res.render('home-page', { products: result.rows });
  } catch (error) {
    console.error(error);
    res.send('Server error');
  }
});


// Route: Signup page
app.get('/signup', isLoggedIn, (req, res) => {
  res.render('signup');
});

// TODO: Implement user signup logic
app.post('/signup', isLoggedIn, async (req, res) => {
  const { username, password, email } = req.body;
  if (!username || !password || !email) {
    return res.status(400).send('All fields are required');
  }
  try {
    const existingEmail = await pool.query('SELECT * FROM Users WHERE email = $1', [email]);
    if (existingEmail.rows.length > 0) {
      return res.send('Email already exists');
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await pool.query('INSERT into Users (username, password_hash, email) values ($1, $2, $3) Returning user_id', [username, hashedPassword, email]);
    req.session.userId = newUser.rows[0].user_id;
    res.redirect('/dashboard');
  }
  catch (error) {
    console.error(error);
    res.send('Server error');
}
});


// Route: Login page 
app.get('/login', isLoggedIn, (req, res) => {
  res.render('login');
});

// TODO: Implement user login logic
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).send('All fields are required');
  }
  try {
    const user = await pool.query('SELECT * FROM Users WHERE email = $1', [email]);
    if (user.rows.length === 0) {
      return res.send('Invalid email or password');
    }
    const isMatch = await bcrypt.compare(password, user.rows[0].password_hash);
    if (!isMatch) {
      return res.send('Invalid email or password');
    }
    req.session.userId = user.rows[0].user_id;
    res.redirect('/dashboard');
  }
  catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});


// Route: Dashboard page (requires authentication)
// TODO: Render the dashboard page
app.get('/dashboard', isAuthenticated, async (req, res) => {
  if (req.session.userId) {
    res.render('dashboard', {products: []});
  }
  else {
    res.redirect('/login');
  }
});


// Route: List products
// TODO: Fetch and display all products from the database
app.get('/list-products', isAuthenticated, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM Products ORDER BY product_id');
    res.render('products', { products: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});


// Route: Add product to cart
// TODO: Implement "Add to Cart" functionality
app.get('/add-to-cart', isAuthenticated, async (req, res) => {
  if (req.session.userId) {
    res.render('add-to-cart');
  }
  else {
    res.redirect('/login');
  }
});

app.post('/add-to-cart', isAuthenticated, async (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  var { product_id, quantity } = req.body;
  if (!product_id) {
    return res.status(400).send('Product ID is required');
  }
  try {
    // console.log(product_id);
    const product = await pool.query('SELECT * FROM Products WHERE product_id = $1', [product_id]);
    if (product.rows.length === 0) {
      return res.send('Product not found');
    }
    const cart_quantity = await pool.query('SELECT * FROM Cart WHERE user_id = $1 AND item_id = $2', [req.session.userId, product_id]);
    if (cart_quantity.rows.length > 0) {
      quantity = parseInt(quantity, 10) + parseInt(cart_quantity.rows[0].quantity, 10);
    }
    if (quantity > product.rows[0].stock_quantity) {
      return res.send('Quantity not available');
    }
    const existingProduct = await pool.query('SELECT * FROM Cart WHERE user_id = $1 AND item_id = $2', [req.session.userId, product_id]);
    if (existingProduct.rows.length > 0) {
      const newQuantity = quantity;
      await pool.query('UPDATE Cart SET quantity = $1 WHERE user_id = $2 AND item_id = $3', [newQuantity, req.session.userId, product_id]);
      return res.send('Product quantity updated in cart');
    }
    await pool.query('INSERT INTO Cart (user_id, item_id, quantity) VALUES ($1, $2, $3)', [req.session.userId, product_id, quantity]);
    res.redirect('/dashboard');
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});


// Route: Remove product from cart
// TODO: Implement "Remove from Cart" functionality
app.get('/remove-from-cart', isAuthenticated, async (req, res) => {
  if (req.session.userId) {
    res.render('remove-from-cart');
  }
  else {
    res.redirect('/login');
  }
});

app.post('/remove-from-cart', isAuthenticated, async (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  const {product_id} = req.body;
  if (!product_id) {
    return res.status(400).send('Product ID is required');
  }
  try {
    const product = await pool.query('SELECT * FROM Products WHERE product_id = $1', [product_id]);
    if (product.rows.length === 0) {
      return res.send('Product not found');
    }
    const existingProduct = await pool.query('SELECT * FROM Cart WHERE user_id = $1 AND item_id = $2', [req.session.userId, product_id]);
    if (existingProduct.rows.length === 0) {
      return res.send('Product not in cart');
    }
    await pool.query('DELETE FROM Cart WHERE user_id = $1 AND item_id = $2', [req.session.userId, product_id]);
    res.send('Product removed from cart');
  }
  catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});


// Route: Display cart
// TODO: Retrieve and display the user's cart items
app.get('/display-cart', isAuthenticated, async (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  try {
    const inStock = await pool.query('SELECT *, (Cart.quantity <= Products.stock_quantity) AS in_stock FROM Products, Cart where Products.product_id = Cart.item_id AND Cart.user_id = $1 ORDER BY product_id', [req.session.userId]);
    const totalPrice = inStock.rows.reduce((acc, item) => acc + item.price * item.quantity, 0);
    res.render('display-cart', { cartItems: inStock.rows, totalPrice });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});


// Route: Place order (clear cart)
// TODO: Implement order placement logic
app.post('/place-order', isAuthenticated, async (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  try {
    const inStock = await pool.query('SELECT *, (Cart.quantity <= Products.stock_quantity) AS in_stock FROM Products, Cart where Products.product_id = Cart.item_id AND Cart.user_id = $1', [req.session.userId]);
    if (inStock.rows.some(item => !item.in_stock)) {
      return res.send('Some products are out of stock');
    }
    await pool.query('INSERT INTO Orders (user_id, total_amount) VALUES ($1, $2)', [req.session.userId, inStock.rows.reduce((acc, item) => acc + item.price * item.quantity, 0)]);
    order_id = await pool.query('SELECT order_id FROM Orders WHERE user_id = $1 ORDER BY order_id DESC LIMIT 1', [req.session.userId]);
    for (const item of inStock.rows) {
      await pool.query('INSERT INTO OrderItems (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)', [order_id.rows[0].order_id, item.product_id, item.quantity, item.price]);
    }
    for (const item of inStock.rows) {
      await pool.query('UPDATE Products SET stock_quantity = stock_quantity - $1 WHERE product_id = $2', [item.quantity, item.product_id]);
    }
    await pool.query('DELETE FROM Cart WHERE user_id = $1', [req.session.userId]);
    res.redirect('/order-confirmation');
  }
  catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});


// Route: Order confirmation
// TODO: Display order confirmation details
app.get('/order-confirmation', isAuthenticated, async (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  try {
    const order = await pool.query('SELECT * FROM Orders WHERE user_id = $1 ORDER BY order_id DESC LIMIT 1', [req.session.userId]);
    if (order.rows.length === 0) {
      return res.send('No orders found');
    }
    const orderItems = await pool.query('SELECT * FROM OrderItems NATURAL JOIN Products WHERE order_id = $1 ORDER BY product_id', [order.rows[0].order_id]);
    res.render('order-confirmation', { order: order.rows[0], orderItems: orderItems.rows });
  }
  catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});


// Route: Logout (destroy session)
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.send('Error logging out');
    }
    res.redirect('/login');
  });
});