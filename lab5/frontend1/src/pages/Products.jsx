import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import Navbar from "../components/Navbar";
import { apiUrl } from "../config/config";

const Products = () => {
  const navigate = useNavigate(); // Use this to redirect users
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [quantities, setQuantities] = useState({});
  const [error, setError] = useState(null);

  // TODO: Implement the checkStatus function.
  // This function should check if the user is logged in.
  // If not logged in, redirect to the login page.
  // if logged in, fetch the products
  useEffect(() => {
    const checkStatus = async () => {
      // Implement API call here to check login status
      try {const response = await fetch(`${apiUrl}/isLoggedIn`, {credentials: "include",});
      if (!response.ok) {
        navigate("/login");
      }
      else {
        fetchProducts();
      }}
      catch (error) {
        console.error("Error checking authentication status:", error);
      }
    };
    checkStatus();
  }, [navigate]);

  // Read about useState to understand how to manage component state
  // const [products, setProducts] = useState([]);
  // const [searchTerm, setSearchTerm] = useState("");

  // NOTE: You are free to add more states and/or handler functions
  // to implement the features that are required for this assignment

  // TODO: Fetch products from the APIx
  // This function should send a GET request to fetch products
  const fetchProducts = async () => {
    try {
      const response = await fetch(`${apiUrl}/list-products`, {
        credentials: "include",
      });
      const data = await response.json();
  
      if (response.ok) {
        if (Array.isArray(data.products)) {
          setProducts(data.products);
          setFilteredProducts(data.products); // Initialize filtered list
  
          setQuantities(
            data.products.reduce(
              (acc, product) => ({ ...acc, [product.product_id]: 1 }),
              {}
            )
          );
        } else {
          console.error("Invalid products data:", data);
          setProducts([]); // Set empty array to prevent further errors
          setFilteredProducts([]);
        }
      } else {
        console.error(data.message);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };
  
  
  // TODO: Implement the product quantity change function
  // If the user clicks on plus (+), then increase the quantity by 1
  // If the user clicks on minus (-), then decrease the quantity by 1
  const handleQuantityChange = (productId, change) => {
    setQuantities((prevQuantities) => {
      const newQuantity = Math.max(1, (prevQuantities[productId] || 1) + change);
      return { ...prevQuantities, [productId]: newQuantity };
    });
  }

  // TODO: Add the product with the given productId to the cart
  // the quantity of this product can be accessed by using a state
  // use the API you implemented earlier
  // display appropriate error messages if any
  const addToCart = async (productId) => {
    const product = products.find((p) => p.product_id === productId);
    
    if (!product) {
      setError("Product not found.");
      return;
    }
  
    if (quantities[productId] > product.stock_quantity) {
      setError(`Only ${product.stock_quantity} items available in stock.`);
      return;
    }
  
    try {
      console.log("Adding product to cart:", productId, quantities[productId]);
      const response = await fetch(`${apiUrl}/add-to-cart`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ product_id: productId, quantity: quantities[productId] }),
      });
  
      const data = await response.json();
      console.log(data);
  
      if (response.ok) {
        setError(null);
        alert(data.message || `Successfully added ${quantities[productId]} item(s) to your cart.`);
      } else {
        setError(data.message);
      }
    } catch (error) {
      console.error("Error adding product to cart:", error);
      setError("Failed to add product to cart. Please try again.");
    }
  };
  

  // TODO: Implement the search functionality
  const [filteredProducts, setFilteredProducts] = useState([]);

const handleSearch = (e) => {
  e.preventDefault();
  const searchValue = e.target.value.toLowerCase();
  setSearchTerm(searchValue);
  console.log(searchValue);
  console.log(products);

  if (Array.isArray(products)) {
    const filtered = products.filter((product) =>
      product.name.toLowerCase().includes(searchValue)
    );
    setFilteredProducts(filtered);
  } else {
    setFilteredProducts([]); // Ensure it's always an array
  }
};

  



  // TODO: Display products with a table
  // Display each product's details, such as ID, name, price, stock, etc.
  return (
    <>
      <Navbar />
      <div>
        <h1>Product List</h1>
        <form onSubmit={(e) => e.preventDefault()}>
          <input
            type="text"
            placeholder="Search by product name..."
            value={searchTerm}
            onChange={handleSearch}
          />
          <button type="submit">Search</button>
        </form>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <table>
          <thead>
            <tr>
              <th>Product ID</th>
              <th>Product Name</th>
              <th>Price</th>
              <th>Stock Available</th>
              <th>Quantity</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((product) => (
              <tr key={product.product_id}>
                <td>{product.product_id}</td>
                <td>{product.name}</td>
                <td>${product.price}</td>
                <td style={ {textAlign:"center"} }>{product.stock_quantity}</td>
                <td>
                  <button onClick={() => handleQuantityChange(product.product_id, -1)}>-</button>
                  {quantities[product.product_id]}
                  <button onClick={() => handleQuantityChange(product.product_id, 1)}>+</button>
                </td>
                <td>
                  <button onClick={() => addToCart(product.product_id)}>ADD TO CART</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {error && <p style={{ color: "red" }}>{error}</p>}
      </div>
    </>
  );
};

export default Products;
