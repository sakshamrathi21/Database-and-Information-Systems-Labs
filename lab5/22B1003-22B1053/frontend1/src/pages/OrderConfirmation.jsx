import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { useNavigate } from "react-router";
import { apiUrl } from "../config/config";
import "../css/OrderConfirmation.css";

const OrderConfirmation = () => {
  const [orderDetails, setOrderDetails] = useState({ order: {}, orderItems: [], totalAmount: 0 });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch(`${apiUrl}/isLoggedIn`, { credentials: "include" });
        if (!response.ok) {
          navigate("/login");
        } else {
          fetchOrderConfirmation();
        }
      } catch (error) {
        console.error("Error checking authentication status:", error);
      }
    };
    checkStatus();
  }, [navigate]);

  const fetchOrderConfirmation = async () => {
    try {
      const response = await fetch(`${apiUrl}/order-confirmation`, { credentials: "include" });
      console.log("Response:", response);
      if (!response.ok) {
        throw new Error("Failed to fetch order details");
      }
      const data = await response.json();
      console.log("Received order details:", data);
      if (data && data.order) {
        setOrderDetails(data);
      } else {
        setError("Order details not found.");
      }
    } catch (error) {
      console.error("Error fetching order details:", error);
      setError("Failed to fetch order details");
    }
  };

  return (
    <>
      <Navbar />
      <div className="order-confirmation-container">
        <h1 className="h1-class">Order Confirmation</h1>
        <p>Thank you for your order! Your order has been successfully placed.</p>
        {error && <pre style={{color:"red"}}>{error}</pre>}
        {orderDetails.order && orderDetails.order.order_date ? (
          <div className="order-confirmation">
            <h2>Order Details</h2>
            <p><strong>Order ID:</strong> {orderDetails.order.order_id}</p>
            <p><strong>Order Date:</strong> {new Date(orderDetails.order.order_date).toISOString().replace("T", " ").split(".")[0] }</p>
            <p><strong>Total Amount:</strong> ${orderDetails.totalAmount}</p>
            <h3>Items in Your Order:</h3>
            <table className="table-class">
              <thead>
                <tr>
                  <th className="th-class">Product ID</th>
                  <th className="th-class">Product Name</th>
                  <th className="th-class">Quantity</th>
                  <th className="th-class">Price per Item</th>
                  <th className="th-class">Total Price</th>
                </tr>
              </thead>
              <tbody>
                {orderDetails.orderItems.map((product) => (
                  <tr key={product.product_id}>
                    <td className="td-class">{product.product_id}</td>
                    <td className="td-class">{product.name}</td>
                    <td className="td-class">{product.quantity}</td>
                    <td className="td-class">${product.price}</td>
                    <td className="td-class">${product.total_price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <br></br>
            <button onClick={() => navigate("/products")} className="continue-shopping">
              Continue Shopping
            </button>
          </div>
        ) : (
          <p>Loading order details...</p>
        )}
      </div>
    </>
  );
};

export default OrderConfirmation;