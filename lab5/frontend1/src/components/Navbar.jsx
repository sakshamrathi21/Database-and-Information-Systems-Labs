import React, { useState } from "react";
import { useNavigate } from "react-router";
import { apiUrl } from "../config/config";

const Navbar = () => {
  const navigate = useNavigate(); // Use this to redirect users

  const [error, setError] = useState("");

  // TODO: Implement the handleLogout function.
  // This function should do an API call to log the user out.
  // On successful logout, redirect the user to the login page.
  const handleLogout = async (e) => {
    e.preventDefault();
    // Implement logout logic here
    setError(""); // Clear previous errors
    try {
      const response = await fetch(`${apiUrl}/logout`, {
        method: "POST",
        credentials: "include",
      });
      const data = await response.json();
      if (response.ok) {
        navigate("/login");
      }
      else {
        setError(data.message || "Failed to log out");
      }
    }
    catch (error) {
      setError("Error logging out!");
      console.log("Error logging out:", error);
    }
  };

  // TODO: Use JSX to create a navigation bar with buttons for:
  // - Home
  // - Products
  // - Cart
  // - Logout
  return (
    <nav>
      {/* Implement navigation buttons here */
      <div>
        <button onClick={() => navigate("/")}>Home</button>
        <button onClick={() => navigate("/products")}>Products</button>
        <button onClick={() => navigate("/cart")}>Cart</button>
        <button onClick={handleLogout}>Logout</button>
        <br></br>
        {error && <pre style={{ color: "red" }}>{error}</pre>}
      </div>
      }
    </nav>
  );
};

export default Navbar;
