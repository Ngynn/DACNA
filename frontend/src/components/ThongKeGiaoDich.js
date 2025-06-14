import React, { useEffect, useState } from "react";

const ThongKeGiaoDich = () => {
  const [iframeUrl, setIframeUrl] = useState("");

  useEffect(() => {
    fetch("http://localhost:3000/api/widget-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // ko can token
      }
    })
      .then((res) => res.json())
      .then((data) => {
        setIframeUrl(data.url);
      });
  }, []);

  return (
    <iframe
      src={iframeUrl}
      style={{
        width: "100%",
        height: "100%",
        border: "none",
      }}
      title="Widget Chatbot"
    />
  );
};

export default ThongKeGiaoDich;