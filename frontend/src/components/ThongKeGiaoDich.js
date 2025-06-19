import React, { useEffect, useState } from "react";
import { Button, Dialog, DialogContent, DialogTitle, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useNavigate } from "react-router-dom";
import LichSuGiaoDich from "./LichSuGiaoDich"; 

const ThongKeGiaoDich = () => {
  const [iframeUrl, setIframeUrl] = useState("");
  const [open, setOpen] = useState(false); 
  const navigate = useNavigate();

  useEffect(() => {
    fetch("http://localhost:3000/api/widget-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      }
    })
      .then((res) => res.json())
      .then((data) => {
        setIframeUrl(data.url);
      });
  }, []);

  // mo dialog
  const handleOpenDialog = () => {
    setOpen(true);
  };

  // dong dialog
  const handleCloseDialog = () => {
    setOpen(false);
  };

  return (
    <div style={{ height: "100%", width: "100%" }}>
      <Button
        variant="contained"
        color="primary"
        style={{ marginBottom: 16 }}
        onClick={handleOpenDialog}
      >
        Xem chi tiết nhập xuất
      </Button>
      <Dialog
        open={open}
        onClose={handleCloseDialog}
        maxWidth="xl"
        fullWidth
        PaperProps={{ style: { minHeight: 600 } }}
      >
        <DialogTitle>
          Lịch Sử Giao Dịch
          <IconButton
            aria-label="close"
            onClick={handleCloseDialog}
            sx={{
              position: "absolute",
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <LichSuGiaoDich /> {/* content dialog la trang lich su giao dich */}
        </DialogContent>
      </Dialog>
      <iframe
        src={iframeUrl}
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          minHeight: 600,
        }}
        title="Widget Chatbot"
      />
    </div>
  );
};

export default ThongKeGiaoDich;