import React, { useEffect } from "react";
import { useNavigate } from "react-router";
import { apiUrl } from "../config/config";

const Home = () => {
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${apiUrl}/isLoggedIn`, { credentials: "include" })
      .then(response => response.json())
      .then(message => {
        if (message === "Logged In") {
          navigate("/dashboard");
        } else {
          navigate("/login");
        }
      })
      .catch(error => console.error("Error checking authentication status:", error));
  }, [navigate]);

  return <div>HomePage</div>;
};

export default Home;
