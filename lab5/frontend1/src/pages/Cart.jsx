import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import Navbar from "../components/Navbar";
import { apiUrl } from "../config/config";
import "../css/Cart.css";

const Cart = () => {
  // TODO: Implement the checkStatus function
  // If the user is already logged in, fetch the cart.
  // If not, redirect to the login page.
  const [cart, setCart] = useState([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pincode, setPincode] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [street, setStreet] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const checkStatus = async () => {
      // Implement your logic to check if the user is logged in
      // If logged in, fetch the cart data, otherwise navigate to /login
      try {
        const response = await fetch(`${apiUrl}/isLoggedIn`, { credentials: "include" });
        if (!response.ok) {
          navigate("/login");
        } else {
          fetchCart();
        }
      } catch (error) {
        console.error("Error checking authentication status:", error);
      }
    };
    checkStatus();
  }, []);

  // TODO: Manage cart state with useState
  // cart: Stores the items in the cart
  // totalPrice: Stores the total price of all cart items
  // error: Stores any error messages (if any)
  // message: Stores success or info messages
  

  // TODO: Implement the fetchCart function
  // This function should fetch the user's cart data and update the state variables
  const fetchCart = async () => {
    // Implement your logic to fetch the cart data
    // Use the API endpoint to get the user's cart
    try {
    const response = await fetch(`${apiUrl}/display-cart`, { credentials: "include" });
    
    const data = await response.json();
    // console.log(data.totalPrice);
    if (response.ok) {
      setCart(data.cart);
      setTotalPrice(data.totalPrice);
    } else {
      setError(data.message);
    }
  } catch (error) {
    setError("Error fetching cart data");
  }
  };

  // TODO: Implement the updateQuantity function
  // This function should handle increasing or decreasing item quantities
  // based on user input. Make sure it doesn't exceed stock limits.
  const updateQuantity = async (productId, change, currentQuantity, stockQuantity) => {
    // Implement your logic for quantity update
    // Validate quantity bounds and update the cart via API
    setError("");
    try {
      console.log("updateQuantity", productId, change, currentQuantity, stockQuantity);
      const response = await fetch(`${apiUrl}/update-cart`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ product_id: productId, quantity: change }),
      });
      console.log(response, productId, change, currentQuantity, stockQuantity);
      if (response.ok) {
        fetchCart();
      } else {
        const data = await response.json();
        setError(data.message || "Failed to update cart");
      }
    } catch (error) {
      console.error("Error updating cart:", error);
      setError("Error updating cart");
    }
  };

  // TODO: Implement the removeFromCart function
  // This function should remove an item from the cart when the "Remove" button is clicked
  const removeFromCart = async (productId) => {
    // Implement your logic to remove an item from the cart
    // Use the appropriate API call to handle this
    try {
      const response = await fetch(`${apiUrl}/remove-from-cart`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ product_id: productId }),
      });
      if (response.ok) {
        fetchCart();
      } else {
        setError("Error removing item from cart");
      }
    } catch (error) {
      setError("Error removing item from cart");
    }
  };

  // TODO: Implement the handleCheckout function
  // This function should handle the checkout process and validate the address fields
  // If the user is ready to checkout, place the order and navigate to order confirmation
  const handleCheckout = async () => {
    // Implement your logic for checkout, validate address and place order
    // Make sure to clear the cart after successful checkout
    if (!pincode || !street || !city || !state) {
      setError("Please fill in all address fields");
      return;
    }
    try {
      const response = await fetch(`${apiUrl}/place-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ pincode, street, city, state }),
      });
      if (response.ok) {
        navigate("/order-confirmation");
      } else {
        setError("Error placing order");
      }
    } catch (error) {
      setError("Error placing order");
    }
  };

  // TODO: Implement the handlePinCodeChange function
  // This function should fetch the city and state based on pincode entered by the user
  const handlePinCodeChange = async (e) => {
    const newPincode = e.target.value;
  
    // Allow only numeric input and restrict to max 6 digits
    if (!/^\d{0,6}$/.test(newPincode)) return;
  
    setPincode(newPincode);
  
    if (newPincode.length === 6) {
      try {
        const response = await fetch(`https://api.postalpincode.in/pincode/${newPincode}`);
        const data = await response.json();
  
        if (Array.isArray(data) && data[0]?.Status === "Success") {
          setCity(data[0].PostOffice[0].District);
          setState(data[0].PostOffice[0].State);
        } else {
          setError("Invalid Pincode");
          setCity("");
          setState("");
        }
      } catch (error) {
        setError("Error fetching location data");
        setCity("");
        setState("");
      }
    }
  };
  
  return (
    <>
      <Navbar />
      <div className="cart-container">
        <h1>Your Cart</h1>

        {/* TODO: Display the success or info message */}
        {message && <div className="cart-message">{message}</div>}

        {/* TODO: Display error messages if any error occurs */}
        {error && <pre style={{ color: "red" }}>{error}</pre>}

        {/* TODO: Implement the cart table UI */}
        {/* If cart is empty, display an empty cart message */}
        {cart.length === 0 ? (
          <p className="empty-cart-message">Your cart is empty</p>
        ) : (
          <>
            <table className="cart-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Price</th>
                  <th>Stock Available</th>
                  <th>Quantity</th>
                  <th>Total</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {/* TODO: Render cart items dynamically */}
                {/* Use map() to render each cart item */}
                {cart.map((item) => (
                  <tr key={item.item_id}>
                    <td>{item.product_name}</td>
                  <td>${item.unit_price}</td>
                  <td style={{textAlign:"center"}}>{item.stock_quantity}</td>
                  <td>
                    <button onClick={() => updateQuantity(item.product_id, -1, item.quantity, item.stock)}>-</button>
                    {item.quantity}
                    <button onClick={() => updateQuantity(item.product_id, 1, item.quantity, item.stock)}>+</button>
                  </td>
                  <td>${item.total_item_price}</td>
                  <td>
                    <button onClick={() => removeFromCart(item.product_id)}>Remove</button>
                  </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <br></br>

            {/* TODO: Implement the address form */}
            {/* Allow users to input pincode, street, city, and state */}
            <form>
              {/* Implement address fields */}
              <label for id="pincode">Pincode:</label>
              <br></br>
              <input type="text" placeholder="Pincode" id="pincode" value={pincode} onChange={handlePinCodeChange} />
              <br></br>
              <br></br>
              <label for id="street">Street:</label>
              <br></br>
              <input type="text" placeholder="Street" id="street" value={street} onChange={(e) => setStreet(e.target.value)} />
              <br></br>
              <br></br>
              <label for id="city">City:</label>
              <br></br>
              <input type="text" placeholder="City" id="city" value={city} readOnly />
              <br></br>
              <br></br>
              <label for id="state">State:</label>
              <br></br>
              <input type="text" placeholder="State" id="state" value={state} readOnly />
              <br></br>
            </form>

            {/* TODO: Display total price and the checkout button */}
            <div className="cart-total">
              {/* Display the total price */}
              <h3>Total: ${parseFloat(totalPrice).toFixed(2)}</h3>
              {/* Checkout button should be enabled only if there are items in the cart */}
              <button onClick={handleCheckout} disabled={cart.length === 0}>
                Proceed to Checkout
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default Cart;
