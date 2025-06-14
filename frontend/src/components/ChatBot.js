import React, { useEffect, useState } from "react";
import { Box, Typography, Paper, CircularProgress, Alert } from "@mui/material";

const ChatBot = () => {
  const [iframeUrl, setIframeUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("http://localhost:3000/api/ayd", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
      },
      body: JSON.stringify({}),
    })
      .then((res) => res.json())
      .then(({ url }) => {
        if (url) {
          setIframeUrl(url);
        } else {
          setError("Không lấy được đường dẫn chatbot.");
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Có lỗi xảy ra khi kết nối chatbot.");
        setLoading(false);
      });
  }, []);

  return (
    <Box
      sx={{
        minHeight: "80vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #e3f2fd 0%, #f8fafc 100%)",
        p: 2,
      }}
    >
      <Typography variant="h4" color="#1976d2" fontWeight={700} mb={2}>
        Chatbot Hỗ Trợ Y Tế
      </Typography>
      {loading && <CircularProgress color="primary" />}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {iframeUrl && (
        <Paper elevation={3} sx={{ p: 1, borderRadius: 3 }}>
          <iframe
            title="Chatbot"
            style={{
              border: "1px solid #1976d2",
              borderRadius: 12,
              boxShadow: "0 4px 24px rgba(25, 118, 210, 0.1)",
              height: 640,
              width: 400,
              background: "#fff",
            }}
            src={iframeUrl}
            allow="clipboard-write; microphone"
          ></iframe>
        </Paper>
      )}
    </Box>
  );
};

export default ChatBot;