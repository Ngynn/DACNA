import React, { useEffect, useState } from "react";

const ThongKeGiaoDich = () => {
  const [iframeUrl, setIframeUrl] = useState("");

  useEffect(() => {
    fetch("http://localhost:5000/api/widget-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Nếu cần token xác thực, thêm Authorization ở đây
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
        height: "600px",
        border: "none",
      }}
      title="Widget Chatbot"
    />
  );
};

export default ThongKeGiaoDich;