const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const app = express();
const port = 3000;

// Set up PostgreSQL connection
const pool = new Pool({
  user: 'yash',
  host: 'localhost',
  database: 'ecommerce',
  password: 'password',
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

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
  if (req.session.userId) {
    return next();
  } else {
    res.redirect('/login');
  }
}

function isLoggedIn(req, res, next) {
    if (req.session.userId) {
      return res.redirect('/dashboard');  // Redirect to dashboard or home page
    }
    next();  // If not logged in, proceed to the signup/login page
}

// Route: Home page
app.get('/', (req, res) => {
  res.send('Welcome to the E-commerce site');
});

// Route: Signup page
app.get('/signup', isLoggedIn, (req, res) => {
  res.render('signup');
});

app.post('/signup', isLoggedIn, async (req, res) => {
  const { username, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const checkEmailQuery = 'SELECT * FROM Users WHERE email = $1;';
    const existingUser = await pool.query(checkEmailQuery, [email]);

    if (existingUser.rows.length > 0) {
      return res.send('Error: Email is already registered. Please log in.');
    }
    
    const insertQuery = 'INSERT INTO Users (username, email, password_hash) VALUES ($1, $2, $3);'
    await pool.query(insertQuery, [username, email, hashedPassword]);

    const getuserid = 'SELECT user_id from users WHERE email = $1;'
    const result = await pool.query(getuserid, [email])
    req.session.userId = result.rows[0].user_id;

    res.redirect('/dashboard');

  } catch (err) {
    console.error(err);
    res.send('Error signing up');
  }
});

// Route: Login page
app.get('/login', isLoggedIn, (req, res) => {
  res.render('login');
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM Users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (user && await bcrypt.compare(password, user.password_hash)) {
      req.session.userId = user.user_id;
      res.redirect('/dashboard');
    } else {
      res.send('Invalid credentials');
    }
  } catch (err) {
    console.error(err);
    res.send('Error logging in');
  }
});

// Route: Dashboard page (requires authentication)
app.get('/dashboard', isAuthenticated, async (req, res) => {
  try {
    res.render('dashboard');
  } catch (err) {
    console.error(err);
    res.send('Error loading dashboard');
  }
});

// Route: List products
app.get('/list-products', isAuthenticated, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM Products');
    res.render('products', { products: result.rows });
  } catch (err) {
    console.error(err);
    res.send('Error listing products');
  }
});

// Route: Add product to cart
app.get('/add-to-cart', isAuthenticated, async (req, res) => {
  res.render('add-to-cart');
});

app.post('/add-to-cart', isAuthenticated, async (req, res) => {
  const { product_id, quantity } = req.body;
  const userId = req.session.userId;

  try {
    const productResult = await pool.query('SELECT * FROM Products WHERE product_id = $1', [product_id]);

    if (productResult.rowCount === 0) {
      return res.send('Invalid product ID.');
    }

    const product = productResult.rows[0];
    console.log(product)

    if (product.stock_quantity >= quantity) {
        const existingItem = await pool.query(
            'SELECT * FROM Cart WHERE user_id = $1 AND item_id = $2',
            [userId, product_id]
        );
        
        if (existingItem.rowCount > 0) {
            // If the item exists, update the quantity
            await pool.query(
                'UPDATE Cart SET quantity = $3 WHERE user_id = $1 AND item_id = $2',
                [userId, product_id, quantity]
            );
        } else {
        // If the item doesn't exist, insert a new row
            await pool.query(
                'INSERT INTO Cart (user_id, item_id, quantity) VALUES ($1, $2, $3)',
                [userId, product_id, quantity]
            );
        }
      res.send(`Successfully added ${quantity} of ${product.name} to your cart.`); 
    } else {
        res.send(`Insufficient stock for ${product.name}.`);
    }
  } catch (err) {
    console.error(err);
    res.send('Error adding to cart');
  }
});

app.get('/remove-from-cart', isAuthenticated, async (req, res) => {
    res.render('remove-from-cart');
});

app.post('/remove-from-cart', isAuthenticated, async (req, res) => {
    const product_id = req.body.product_id;
    const userId = req.session.userId;
  
    try {
        // Check if the item exists in the cart for the logged-in user
        const cartItemResult = await pool.query(
          'SELECT * FROM Cart WHERE user_id = $1 AND item_id = $2',
          [userId, product_id]
        );
    
        // If the item is not found in the cart
        if (cartItemResult.rows.length === 0) {
          return res.send('Item not present in your cart');
        }
    
        // Remove the item from the cart
        await pool.query('DELETE FROM Cart WHERE user_id = $1 AND item_id = $2', [userId, product_id]);
    
        // Send a success message or redirect
        res.send('Item removed from your cart successfully');
      } catch (err) {
        console.error(err);
        res.send('Error removing item from cart');
      }
  });

// Route: Display cart
app.get('/display-cart', isAuthenticated, async (req, res) => {
  const userId = req.session.userId;

  try {
    const cartResult = await pool.query(`
        SELECT 
          Cart.item_id, 
          Products.product_id, 
          Products.name, 
          Cart.quantity, 
          Products.price, 
          Products.stock_quantity,
          (Cart.quantity * Products.price) AS total_price
        FROM Cart
        JOIN Products ON Cart.item_id = Products.product_id
        WHERE Cart.user_id = $1`, [userId]);

    // If cart is empty, send a message
    if (cartResult.rows.length === 0) {
        return res.send('Your cart is empty. Add some items to your cart.');
    }

    // console.log(cartResult.rows);

    const totalResult = await pool.query(`
        SELECT SUM(Cart.quantity * Products.price) AS total_price
        FROM Cart JOIN Products
        ON Cart.item_id = Products.product_id
        WHERE Cart.user_id = $1`, [userId]);

    const totalPrice = totalResult.rows[0].total_price;

    // console.log(totalPrice);

    res.render('display-cart', { cart: cartResult.rows, totalPrice });
  } catch (err) {
    console.error(err);
    res.send('Error displaying cart');
  }
});

// Route: Place order (clear cart)
app.post('/place-order', isAuthenticated, async (req, res) => {
    const userId = req.session.userId;
    const orderDate = new Date();
    
    try {
      // Fetch the cart items
      const cartItems = await pool.query(`
        SELECT 
          Cart.item_id, 
          Products.product_id, 
          Products.name, 
          Cart.quantity, 
          Products.price, 
          Products.stock_quantity
        FROM Cart
        JOIN Products ON Cart.item_id = Products.product_id
        WHERE Cart.user_id = $1`, [userId]);
  
      // Check if all items have sufficient stock
      for (const item of cartItems.rows) {
  
        if (item.stock_quantity < item.quantity) {
          // If stock is insufficient for any item, send error message
          return res.send('Some items in your cart have insufficient quantity');
        }
      }
  
      // All items have sufficient stock, proceed with placing the order
      const totalAmount = cartItems.rows.reduce((total, item) => total + (item.quantity * item.price), 0);
      
      // Insert order
      const orderResult = await pool.query('INSERT INTO Orders (user_id, order_date, total_amount) VALUES ($1, $2, $3) RETURNING order_id', [userId, orderDate, totalAmount]);
      const orderId = orderResult.rows[0].order_id;
  
      // Insert order items
      for (const item of cartItems.rows) {

        await pool.query('INSERT INTO OrderItems (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)', [orderId, item.product_id, item.quantity, item.price]);
  
        // Update product stock after order
        await pool.query('UPDATE Products SET stock_quantity = stock_quantity - $1 WHERE product_id = $2', [item.quantity, item.product_id]);
      }
  
      // Clear the cart after placing the order
      await pool.query('DELETE FROM Cart WHERE user_id = $1', [userId]);
  
      // Redirect to order confirmation page
      res.redirect('/order-confirmation');
    } catch (err) {
      console.error(err);
      res.send('Error placing order');
    }
  });
  
  // Route: Order confirmation
  app.get('/order-confirmation', isAuthenticated, async (req, res) => {
    const userId = req.session.userId;
  
    try {
      // Fetch the most recent order for the user
      const orderResult = await pool.query('SELECT * FROM Orders WHERE user_id = $1 ORDER BY order_date DESC LIMIT 1', [userId]);
      const order = orderResult.rows[0];
  
      // Fetch the items in the order
      const orderItemsResult = await pool.query(
        `SELECT OrderItems.*, Products.name
         FROM OrderItems
         JOIN Products ON OrderItems.product_id = Products.product_id
         WHERE OrderItems.order_id = $1`,
        [order.order_id]
      );
  
      res.render('order-confirmation', { order, orderItems: orderItemsResult.rows });
    } catch (err) {
      console.error(err);
      res.send('Error fetching order details');
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

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
