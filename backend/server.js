require("dotenv").config(); // Load biến môi trường từ file .env
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { Pool } = require("pg");
const jwt = require("jsonwebtoken");
const verifyToken = require("./middleware/auth");
const multer = require("multer");
const path = require("path");
const nodemailer = require("nodemailer");
const { exec } = require("child_process");
const xlsx = require("xlsx");
const fs = require("fs");
const fetch = require("node-fetch");

const app = express();
const port = process.env.PORT || 5000;
const SECRET_KEY = process.env.SECRET_KEY; // ✅ Dùng từ .env
// Cấu hình thư mục lưu file PDF
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Lưu file vào thư mục "uploads"
  },
  filename: (req, file, cb) => {
    cb(null, `phieu_xuat_kho_${Date.now()}.pdf`);
  },
});
//const upload = multer({ storage: storage });

app.use(express.json());
app.use(cors());
app.use(bodyParser.json());

// Public folder để người dùng có thể tải file
app.use("/uploads", express.static(path.join(__dirname, "uploads")));


// PostgreSQL Pool
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "QLNK",
  //password: "kyanh",
      password: "123123",
  port: 5432,
});

// Sample route
app.get("/api/nguoidung", verifyToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM nguoidung");
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

app.put("/api/nguoidung/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const { tendangnhap, matkhau, vaitro, email, trangthai } = req.body;

  if (!tendangnhap || !matkhau || !vaitro || !email) {
    return res.status(400).json({ message: "Tất cả các trường là bắt buộc." });
  }

  try {
    // Kiểm tra xem tên người dùng có tồn tại không
    const userExists = await pool.query(
      "SELECT * FROM nguoidung WHERE tendangnhap = $1 AND idnguoidung != $2",
      [tendangnhap, id]
    );
    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: "Tên đăng nhập đã tồn tại." });
    }

    // Kiểm tra xem email đã tồn tại chưa
    const emailExists = await pool.query(
      "SELECT * FROM nguoidung WHERE email = $1 AND idnguoidung != $2",
      [email , id]
    );
    if (emailExists.rows.length > 0) {
      return res.status(400).json({ message: "Email đã được sử dụng." });
    }

    // Cập nhật thông tin người dùng
    const result = await pool.query(
      `UPDATE nguoidung 
       SET tendangnhap = $1, 
           matkhau = $2, 
           vaitro = $3, 
           email = $4, 
           trangthai = $5
       WHERE idnguoidung = $6 RETURNING *`,
      [tendangnhap, matkhau, vaitro, email, trangthai || "active", id]
    );

    res.status(200).json({
      success: true,
      message: "Cập nhật người dùng thành công.",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("Error updating user:", err);
    res.status(500).json({ message: "Có lỗi xảy ra khi cập nhật người dùng." });
  }
});

app.post("/api/quenmatkhau", async (req, res) => {
  const { email } = req.body;

  const generateRandomPassword = (length = 8) => {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const matkhauMoi = generateRandomPassword();

  try {
    const result = await pool.query(
      "UPDATE nguoidung SET matkhau = $1 WHERE email = $2 RETURNING *",
      [matkhauMoi, email]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Email không tồn tại" });
    }

    // Gửi email chứa mật khẩu mới
    const transporter = nodemailer.createTransport({
      host: "smtp.mailersend.net",
      port: 587,
      secure: false, // upgrade later with STARTTLS
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Khôi phục mật khẩu",
      text: `Mật khẩu mới của bạn là: ${matkhauMoi}`,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: "Mật khẩu mới đã được gửi qua email." });
  } catch (error) {
    console.error("Lỗi:", error);
    res.status(500).json({ message: "Không thể gửi email." });
  }
});

app.put("/api/doimatkhau", verifyToken, async (req, res) => {
  const { matkhauCu, matkhauMoi } = req.body;
  const userId = req.user?.id; // Lấy ID người dùng từ token

  if (!matkhauCu || !matkhauMoi) {
    return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin." });
  }

  try {
    // Kiểm tra mật khẩu cũ
    const user = await pool.query(
      "SELECT matkhau FROM nguoidung WHERE idnguoidung = $1",
      [userId]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ message: "Người dùng không tồn tại." });
    }

    if (user.rows[0].matkhau !== matkhauCu) {
      return res.status(401).json({ message: "Mật khẩu cũ không đúng." });
    }

    // Cập nhật mật khẩu mới
    await pool.query(
      "UPDATE nguoidung SET matkhau = $1 WHERE idnguoidung = $2",
      [matkhauMoi, userId]
    );

    res.status(200).json({ message: "Đổi mật khẩu thành công." });
  } catch (err) {
    console.error("Lỗi đổi mật khẩu:", err);
    res.status(500).json({ message: "Có lỗi xảy ra khi đổi mật khẩu." });
  }
});

app.delete("/api/nguoidung/:id", verifyToken, async (req, res) => {
  const { id } = req.params;

  try {
    // Kiểm tra vai trò của người dùng
    const user = await pool.query(
      "SELECT vaitro FROM nguoidung WHERE idnguoidung = $1",
      [id]
    );
    if (user.rows.length === 0) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    if (user.rows[0].vaitro === "Admin") {
      return res.status(403).json({ message: "Không thể xóa tài khoản Admin" });
    }

    // Kiểm tra giao dịch liên quan
    const transactionCheck = await pool.query(
      "SELECT COUNT(*) AS count FROM lichsugiaodich WHERE idnguoidung = $1",
      [id]
    );
    if (transactionCheck.rows[0].count > 0) {
      return res
        .status(400)
        .json({ message: "Không thể xóa người dùng có giao dịch liên quan" });
    }

    // Xóa người dùng
    await pool.query("DELETE FROM nguoidung WHERE idnguoidung = $1", [id]);
    res.status(200).json({ message: "Xóa thành công" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Lỗi server" });
  }
});

app.post("/api/dangky", async (req, res) => {
  const { tendangnhap, matkhau, vaitro, email } = req.body;

  if (!tendangnhap || !matkhau || !vaitro || !email) {
    return res.status(400).json({ message: "Tất cả các trường là bắt buộc." });
  }

  try {
    // Kiểm tra tên đăng nhập đã tồn tại
    const userExists = await pool.query(
      "SELECT * FROM nguoidung WHERE tendangnhap = $1",
      [tendangnhap]
    );
    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: "Tên đăng nhập đã tồn tại." });
    }

    // Kiểm tra email đã tồn tại
    const emailExists = await pool.query(
      "SELECT * FROM nguoidung WHERE email = $1",
      [email]
    );
    if (emailExists.rows.length > 0) {
      return res.status(400).json({ message: "Email đã được sử dụng." });
    }

    // Thêm người dùng mới
    await pool.query(
      "INSERT INTO nguoidung (tendangnhap, matkhau, vaitro, email) VALUES ($1, $2, $3, $4)",
      [tendangnhap, matkhau, vaitro, email]
    );

    res.status(201).json({ message: "Đăng ký thành công." });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Lỗi server." });
  }
});

app.post("/api/dangnhap", async (req, res) => {
  const { tendangnhap, matkhau } = req.body;

  try {
    const user = await pool.query(
      "SELECT * FROM nguoidung WHERE tendangnhap = $1",
      [tendangnhap]
    );

    if (user.rows.length === 0) {
      return res.status(400).json({ message: "Tên đăng nhập không đúng" });
    }

    // So sánh mật khẩu gốc
    if (matkhau !== user.rows[0].matkhau) {
      return res.status(401).json({ message: "Mật khẩu không đúng" });
    }

    //Tạo JWT token
    const token = jwt.sign(
      {
        id: user.rows[0].idnguoidung,
        tendangnhap: user.rows[0].tendangnhap,
        vaitro: user.rows[0].vaitro,
        email: user.rows[0].email,
      },
      SECRET_KEY,
      { expiresIn: "2h" }
    );
    //console.log("JWT Token:", token);
    res.status(200).json({
      message: "Đăng nhập thành công",
      token,
      user: user.rows[0],
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Lỗi server" });
  }
});

app.get("/danhmuc", verifyToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM danhmucvattu");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/vattu", verifyToken, async (req, res) => {
  const { idDanhMuc } = req.query; // Lấy idDanhMuc từ query string

  try {
    let query = `
      SELECT 
        VT.IDVatTu, 
        VT.TenVatTu, 
        DM.TenDanhMuc, 
        VT.DonVi, 
        VT.MoTa, 
        VT.NgayHetHan, 
        VT.CachLuuTru, 
        TK.TonKhoHienTai,
        CTLH.DonGiaNhap AS DonGia
      FROM TonKho TK
      LEFT JOIN VatTu VT ON TK.IDVatTu = VT.IDVatTu
      LEFT JOIN DanhMucVatTu DM ON VT.IDDanhMuc = DM.IDDanhMuc
      LEFT JOIN (
  SELECT IDVatTu, MAX(DonGiaNhap) AS DonGiaNhap
  FROM ChiTietLoHang
  GROUP BY IDVatTu
) CTLH ON VT.IDVatTu = CTLH.IDVatTu
    `;

    const params = [];
    if (idDanhMuc) {
      query += " WHERE DM.IDDanhMuc = $1";
      params.push(idDanhMuc);
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


app.post("/xuatkho", verifyToken, async (req, res) => {
  const { vatTuGroups, NguoiYeuCau, PhoneNguoiYeuCau, IDNguoiDung } = req.body;

  if (!vatTuGroups?.length || !NguoiYeuCau || !IDNguoiDung) {
    return res.status(400).json({
      success: false,
      message: "Vui lòng điền đầy đủ thông tin vật tư, người yêu cầu và người dùng.",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN"); // Bắt đầu transaction

    // Kiểm tra người dùng
    const userResult = await client.query(
      "SELECT * FROM NguoiDung WHERE IDNguoiDung = $1",
      [IDNguoiDung]
    );
    if (userResult.rows.length === 0) {
      throw new Error("Người dùng không tồn tại.");
    }

    // Kiểm tra tất cả vật tư trước khi tạo phiếu
    for (const group of vatTuGroups) {
      const IDVatTu = parseInt(group.IDVatTu, 10);
      const SoLuong = parseInt(group.SoLuong, 10);

      if (isNaN(IDVatTu) || isNaN(SoLuong) || SoLuong <= 0) {
        throw new Error("ID vật tư hoặc số lượng không hợp lệ.");
      }

      const vatTuRes = await client.query("SELECT * FROM VatTu WHERE IDVatTu = $1", [IDVatTu]);
      if (vatTuRes.rows.length === 0) {
        throw new Error(`Vật tư với ID ${IDVatTu} không tồn tại.`);
      }

      const stockRes = await client.query("SELECT TonKhoHienTai FROM TonKho WHERE IDVatTu = $1", [IDVatTu]);
      const stock = stockRes.rows[0]?.tonkhohientai ?? 0;

      if (SoLuong > stock) {
        throw new Error(`Số lượng vượt tồn kho hiện tại cho vật tư ID ${IDVatTu}.`);
      }
    }

    // Tạo phiếu xuất kho
    const xuatKhoRes = await client.query("INSERT INTO XuatKho DEFAULT VALUES RETURNING IDXuatKho");
    const IDXuatKho = xuatKhoRes.rows[0].idxuatkho;

    // Thêm chi tiết vật tư
    for (const group of vatTuGroups) {
      const IDVatTu = parseInt(group.IDVatTu, 10);
      const SoLuong = parseInt(group.SoLuong, 10);
      await client.query(
        "INSERT INTO ChiTietXuatKho (IDXuatKho, IDVatTu, SoLuong, NguoiYeuCau, PhoneNguoiYeuCau, IDNguoiDung) VALUES ($1, $2, $3, $4, $5, $6)",
        [IDXuatKho, IDVatTu, SoLuong, NguoiYeuCau, PhoneNguoiYeuCau, IDNguoiDung]
      );
    }

    // Lấy thông tin chi tiết
    // Xóa dấu phẩy , thừa trước from
    const result = await client.query(
      `SELECT 
        XK.IDXuatKho, 
        CT.IDVatTu, 
        VT.TenVatTu, 
        CT.SoLuong, 
        CT.NguoiYeuCau, 
        CT.PhoneNguoiYeuCau, 
        CT.IDNguoiDung, 
        ND.TenDangNhap AS TenNguoiDung  
       FROM XuatKho XK
       JOIN ChiTietXuatKho CT ON XK.IDXuatKho = CT.IDXuatKho
       JOIN VatTu VT ON CT.IDVatTu = VT.IDVatTu
       JOIN NguoiDung ND ON CT.IDNguoiDung = ND.IDNguoiDung
       WHERE XK.IDXuatKho = $1`,
      [IDXuatKho]
    );

    await client.query("COMMIT"); // Commit giao dịch

    res.status(201).json({
      success: true,
      message: "Xuất kho thành công.",
      data: result.rows,
    });
  } catch (err) {
    await client.query("ROLLBACK"); // Nếu lỗi thì rollback
    console.error("Lỗi xuất kho:", err.message);
    res.status(400).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
});


app.get("/lichsugiaodich", verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        lgd.idgiaodich,
        lgd.idvattu,
        vt.tenvattu,
        lgd.idnhapkho,
        lgd.idxuatkho,
        lgd.idnguoidung,
        nd.tendangnhap AS tennguoidung,
        lgd.loaigiaodich,
        lgd.soluong,
        lgd.ngaygiaodich,
        xk.ngayxuat -- Thêm dòng này
      FROM lichsugiaodich lgd
      LEFT JOIN vattu vt ON lgd.idvattu = vt.idvattu
      LEFT JOIN nguoidung nd ON lgd.idnguoidung = nd.idnguoidung
      LEFT JOIN xuatkho xk ON lgd.idxuatkho = xk.idxuatkho -- Thêm dòng này
      ORDER BY lgd.ngaygiaodich DESC
    `);

    // trả về đã group, nhóm gd bằng reduce
    const groupedData = result.rows.reduce((acc, gd) => {
      const id = gd.idgiaodich;
      if (!acc[id]) {
        const loai = gd.loaigiaodich?.toLowerCase(); // tránh null
        acc[id] = {
          idgiaodich: id,
          loaigiaodich: gd.loaigiaodich,
          idnhapkho: loai.includes('nhap') ? gd.idnhapkho : null,
          idxuatkho: loai.includes('xuat') ? gd.idxuatkho : null,
          tennguoidung: gd.tennguoidung,
          ngaygiaodich: gd.ngaygiaodich,
          inventories: [],
        };
      }
      acc[id].inventories.push({
        idvattu: gd.idvattu,
        tenvattu: gd.tenvattu,
        soluong: gd.soluong,
      });

      return acc;
    }, {});

    const groupedTransactions = Object.values(groupedData);
    res.status(200).json(groupedTransactions);
  } catch (err) {
    console.error("Error fetching transaction history:", err);
    res.status(500).json({ error: "Có lỗi xảy ra khi lấy lịch sử giao dịch." });
  }
});

app.get("/tonkho", verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        idvattu,
        tenvattu,
        tendanhmuc,
        ngayhethan,
        tongnhap,
        tongxuat,
        tonkhohientai
      FROM tonkho
    `);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Error fetching inventory data:", err);
    res.status(500).json({ error: "Có lỗi xảy ra khi lấy dữ liệu tồn kho." });
  }
});

app.get("/api/nhacungcap", verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        idncc, 
        tenncc, 
        sodienthoai, 
        email, 
        diachi, 
        stk, 
        mst,
        website
      FROM nhacungcap
    `);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Error fetching nhà cung cấp:", err);
    res
      .status(500)
      .json({ error: "Có lỗi xảy ra khi lấy danh sách nhà cung cấp." });
  }
});

app.get("/api/thongke-nhapxuat", verifyToken, async (req, res) => {
  const { nam, thang } = req.query;

  try {
    let query = `
      SELECT nam,thang, 
             SUM(tong_nhap) AS tong_nhap, 
             SUM(tong_xuat) AS tong_xuat
      FROM view_thongke_nhapxuat
      WHERE 1=1
    `;
    const params = [];

    if (nam) {
      query += " AND nam = $1";
      params.push(nam);
    }

    if (thang) {
      query += " AND thang = $2";
      params.push(thang);
    }

    query += " GROUP BY nam, thang ORDER BY nam, thang"; // Thêm "nam" vào GROUP BY

    const result = await pool.query(query, params);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Lỗi khi lấy thống kê nhập xuất:", error);
    res.status(500).json({ error: "Lỗi máy chủ" });
  }
});


app.post("/api/nhacungcap", verifyToken, async (req, res) => {
  const { tenncc, sodienthoai, email, diachi, stk, mst, website } = req.body;

  if (!tenncc || !sodienthoai || !email || !diachi || !stk || !mst || !website) {
    return res.status(400).json({ message: "Tất cả các trường là bắt buộc." });
  }

  try {
    // Kiểm tra trùng tên nhà cung cấp
    const checkName = await pool.query(
      "SELECT * FROM nhacungcap WHERE tenncc = $1",
      [tenncc]
    );
    if (checkName.rows.length > 0) {
      return res.status(400).json({ message: "Tên nhà cung cấp đã tồn tại." });
    }

    // chỉ test 1 email nên bỏ qua kiểm tra email
    // Kiểm tra trùng email
    // const checkEmail = await pool.query(
    //   "SELECT * FROM nhacungcap WHERE email = $1",
    //   [email]
    // );
    // if (checkEmail.rows.length > 0) {
    //   return res.status(400).json({ message: "Email đã tồn tại." });
    // }

    // Kiểm tra trùng số điện thoại
    const checkPhone = await pool.query(
      "SELECT * FROM nhacungcap WHERE sodienthoai = $1",
      [sodienthoai]
    );
    if (checkPhone.rows.length > 0) {
      return res.status(400).json({ message: "Số điện thoại đã tồn tại." });
    }

    // Kiểm tra trùng mã số thuế
    const checkMST = await pool.query(
      "SELECT * FROM nhacungcap WHERE mst = $1",
      [mst]
    );
    if (checkMST.rows.length > 0) {
      return res.status(400).json({ message: "Mã số thuế đã tồn tại." });
    }

    // Kiểm tra trùng số tài khoản
    const checkSTK = await pool.query(
      "SELECT * FROM nhacungcap WHERE stk = $1",
      [stk]
    );
    if (checkSTK.rows.length > 0) {
      return res.status(400).json({ message: "Số tài khoản đã tồn tại." });
    }
    

    const result = await pool.query(
      `INSERT INTO nhacungcap (tenncc, sodienthoai, email, diachi, stk, mst, website) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [tenncc, sodienthoai, email, diachi, stk, mst, website]
    );
    res.status(201).json({
      success: true,
      message: "Thêm nhà cung cấp thành công",
      data: result.rows[0]
    });
  } catch (err) {
    // Xử lý lỗi trùng lặp unique constraint
    if (err.code === "23505") {
      return res.status(400).json({ message: "Dữ liệu đã tồn tại hoặc bị trùng lặp." });
    }
    console.error("Error adding nhà cung cấp:", err);
    res.status(500).json({
      message: "Có lỗi xảy ra khi thêm nhà cung cấp.",
      error: err.message
    });
  }
});


app.delete("/api/nhacungcap/:id", verifyToken, async (req, res) => {
  const { id } = req.params;

  try {
    // Kiểm tra xem nhà cung cấp có tồn tại không
    const checkResult = await pool.query(
      "SELECT * FROM nhacungcap WHERE idncc = $1",
      [id]
    );
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: "Nhà cung cấp không tồn tại." });
    }

    // Xóa nhà cung cấp
    await pool.query("DELETE FROM nhacungcap WHERE idncc = $1", [id]);
    res.status(200).json({ message: "Xóa nhà cung cấp thành công." });
  } catch (err) {
    console.error("Error deleting nhà cung cấp:", err);
    res.status(500).json({ message: "Có lỗi xảy ra khi xóa nhà cung cấp." });
  }
});

app.put("/api/nhacungcap/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const { tenncc, sodienthoai, email, diachi, stk, mst, website } = req.body;
  // console.log("ID nhận được từ client:", id);
  if (!tenncc || !sodienthoai || !email || !diachi || !stk || !mst || !website) {
    return res.status(400).json({ message: "Tất cả các trường là bắt buộc." });
  }

  // console.log("Thông tin nhận từ client:", JSON.stringify({ id, tenncc, sodienthoai, email, diachi, stk, mst }, null, 2));
  try {
    // Kiểm tra xem nhà cung cấp có tồn tại không
    const checkResult = await pool.query(
      "SELECT * FROM nhacungcap WHERE idncc = $1",
      [id]
    );
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: "Nhà cung cấp không tồn tại." });
    }

    // Cập nhật thông tin nhà cung cấp
    const result = await pool.query(
      `UPDATE nhacungcap 
       SET tenncc = $1, 
          sodienthoai = $2, 
          email = $3, 
          diachi = $4, 
          stk = $5, 
          mst = $6,
          website = $7 
       WHERE idncc = $8 RETURNING *`,
      [tenncc, sodienthoai, email, diachi, stk, mst, website, id]
    );

    res.status(200).json({
      success: true,
      message: "Cập nhật nhà cung cấp thành công.",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("Error updating nhà cung cấp:", err);
    res.status(500).json({ message: "Có lỗi xảy ra khi cập nhật nhà cung cấp." });
  }
});

app.get("/api/xuatkho", verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        XK.IDXuatKho,
        XK.NgayXuat,
        CTXK.IDVatTu,
        VT.TenVatTu,
        CTXK.SoLuong,
        CTXK.NguoiYeuCau,
        CTXK.PhoneNguoiYeuCau,
        CTXK.IDNguoiDung,
        ND.TenDangNhap AS TenNguoiDung,
        CTLH.DonGiaNhap AS DonGia
      FROM XuatKho XK
      JOIN ChiTietXuatKho CTXK ON XK.IDXuatKho = CTXK.IDXuatKho
      JOIN VatTu VT ON CTXK.IDVatTu = VT.IDVatTu
      JOIN NguoiDung ND ON CTXK.IDNguoiDung = ND.IDNguoiDung
      LEFT JOIN ChiTietLoHang CTLH ON CTXK.IDVatTu = CTLH.IDVatTu -- Kết nối với ChiTietLoHang
      ORDER BY XK.NgayXuat DESC
    `);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Error fetching export data:", err);
    res.status(500).json({ error: "Có lỗi xảy ra khi lấy dữ liệu xuất kho." });
  }
});

// tìm nhà cung cấp theo các sản phẩm (vật tư) 
app.get('/api/nhacungcap/vattu/:idvattu', verifyToken, async (req, res) => {
    const { idvattu } = req.params;
    try {
        const result = await pool.query(`
            SELECT 
                ncc.idncc,
                ncc.tenncc,
                ncc.email,
                ncc.sodienthoai,
                ncc.diachi
            FROM nhacungcap ncc
            JOIN vattu_nhacungcap vtncc ON ncc.idncc = vtncc.idncc
            WHERE vtncc.idvattu = $1
        `, [idvattu]);

        res.status(200).json(result.rows);
    } catch (error) {
        console.error("Lỗi khi lấy danh sách nhà cung cấp theo vật tư:", error);
        res.status(500).json({ message: "Có lỗi xảy ra khi lấy danh sách nhà cung cấp." });
    }
});

app.get('/api/backup', verifyToken, async (req, res) => {
  const fileName = `backup_${Date.now()}.sql`; // tạo tên file backup với timestamp
  const filePath = path.join(__dirname, fileName); // đường dẫn lưu file tạm thời trên server

  // Lệnh pg_dump (gọi vô cmd)
  const dumpCommand = `pg_dump -U postgres -d QLNK -F c -f "${filePath}"`;

  // pass postgre, nhớ tự chỉnh lại pass của bản thân
  const env = { ...process.env, PGPASSWORD: "kyanh" };

  exec(dumpCommand, { env }, (error, stdout, stderr) => {
    if (error) {
      console.error("Lỗi backup:", error);
      return res.status(500).json({ success: false, message: "Không thể backup database." });
    }
    // Gửi file về client
    res.download(filePath, fileName, (err) => {
      // Xóa file sau khi gửi xong
      fs.unlink(filePath, () => { });
    });
  });
});

// Liên kết vật tư với nhà cung cấp -> xử lý khi ở ncc
app.post('/api/nhacungcap/:idncc/vattu', verifyToken, async (req, res) => {
  const { idncc } = req.params;
  const { idvattuList } = req.body; // array các idvattu

  try {
    // Xóa các liên kết cũ trước
    await pool.query("DELETE FROM Vattu_NhaCungCap WHERE idncc = $1", [idncc]);

    for (let idvattu of idvattuList) {
      await pool.query(
        `INSERT INTO Vattu_NhaCungCap (idncc, idvattu) VALUES ($1, $2) ON CONFLICT (idvattu, idncc) DO NOTHING`,
        [idncc, idvattu]
      );
    }

    res.json({ success: true, message: "Cập nhật vật tư cho nhà cung cấp thành công" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi cập nhật vật tư cho nhà cung cấp" });
  }
});

// Lấy danh sách vật tư của một nhà cung cấp cụ thể
app.get('/api/vattu/nhacungcap/:idncc', verifyToken, async (req, res) => {
  const { idncc } = req.params;
  try {
    const result = await pool.query(`
      SELECT 
        vt.idvattu, 
        vt.tenvattu 
      FROM Vattu vt
      JOIN Vattu_NhaCungCap vtncc ON vt.idvattu = vtncc.idvattu
      WHERE vtncc.idncc = $1
    `, [idncc]);

    res.json(result.rows);
  } catch (err) {
    console.error("Lỗi lấy vật tư theo nhà cung cấp:", err);
    res.status(500).json({ message: "Lỗi khi lấy vật tư của nhà cung cấp." });
  }
});

//send email toi ncc
app.post("/api/send-email", verifyToken, async (req, res) => {
  const { email, subject, message } = req.body;

  if (!email || !subject || !message) {
    return res.status(400).json({ message: "Thiếu thông tin email, tiêu đề hoặc nội dung." });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.mailersend.net",
      port: 587,
      secure: false, // upgrade later with STARTTLS
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: subject,
      text: message,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: "Email đã được gửi thành công." });
  } catch (error) {
    console.error("Lỗi gửi email:", error);
    res.status(500).json({ message: "Không thể gửi email." });
  }
});

// xem danh sách lô hàng
app.get("/api/lohang", verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
            SELECT 
                lh.idlohang,
                lh.tongtien,
                lh.trangthai,
                lh.ngaydukiennhapkho,
                lh.ngaythuctenhapkho,
                ncc.tenncc
            FROM lohang lh
            LEFT JOIN nhacungcap ncc ON lh.idncc = ncc.idncc
            ORDER BY lh.idlohang DESC
        `);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Lỗi khi lấy danh sách lô hàng:", err);
    res.status(500).json({ message: "Có lỗi xảy ra khi lấy danh sách lô hàng." });
  }
});

//xem chi tiết lô hàng 
app.get("/api/lohang/:id/chitiet", verifyToken, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `
            SELECT 
                ctlh.idvattu,
                vt.tenvattu,
                ctlh.soluong,
                ctlh.dongianhap
            FROM chitietlohang ctlh
            JOIN vattu vt ON ctlh.idvattu = vt.idvattu
            WHERE ctlh.idlohang = $1
            `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy chi tiết lô hàng." });
    }

    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Lỗi khi lấy chi tiết lô hàng:", err);
    res.status(500).json({ message: "Có lỗi xảy ra khi lấy chi tiết lô hàng." });
  }
});

// nhập lô hàng từ file excel tự động
// Cấu hình multer để lưu file Excel tạm thời
const upload = multer({ dest: "uploads/" });
const excelDateToJSDate = (excelDate) => {
  const jsDate = new Date((excelDate - 25569) * 86400 * 1000); // Chuyển đổi từ số ngày Excel sang timestamp
  return jsDate.toISOString().split("T")[0]; // Trả về định dạng YYYY-MM-DD
};

app.post("/api/lohang/upload", verifyToken, upload.single("file"), async (req, res) => {
  const file = req.file;
  const userId = req.user?.id; // Lấy ID người dùng từ token

  if (!file) {
    return res.status(400).json({ message: "Vui lòng upload file Excel." });
  }

  try {
    // Đọc file Excel
    const workbook = xlsx.readFile(file.path);
    const sheetName = workbook.SheetNames[0]; // Lấy sheet đầu tiên
    const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
    console.log("Dữ liệu từ file Excel:", sheetData);

    // Kiểm tra dữ liệu trong file Excel
    if (!sheetData || sheetData.length === 0) {
      return res.status(400).json({ message: "File Excel không có dữ liệu." });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN"); // Bắt đầu transaction

      // Thêm lô hàng
      const trangthai = "Đã nhập";
      const { idncc, tongtienthucte } = sheetData[0];
      const ngaydukiennhapkho = excelDateToJSDate(sheetData[0].ngaydukiennhapkho);
      const ngaythuctenhapkho = excelDateToJSDate(sheetData[0].ngaythuctenhapkho);

      const loHangResult = await client.query(
        `INSERT INTO lohang (idncc, tongtien, trangthai, ngaydukiennhapkho, ngaythuctenhapkho)
                 VALUES ($1, $2, $3, $4, $5) RETURNING idlohang`,
        [idncc, tongtienthucte, trangthai, ngaydukiennhapkho, ngaythuctenhapkho]
      );
      const idlohang = loHangResult.rows[0].idlohang;

      // Lọc dữ liệu chi tiết lô hàng
      const chiTietLoHang = sheetData.filter(row => row.idvattu && row.soluongthucte && row.dongianhap);

      // Kiểm tra nếu không có chi tiết lô hàng
      if (chiTietLoHang.length === 0) {
        throw new Error("Không có chi tiết lô hàng hợp lệ trong file Excel.");
      }

      // Thêm chi tiết lô hàng
      for (let i = 0; i < chiTietLoHang.length; i++) {
        const { idvattu, soluongthucte, dongianhap } = chiTietLoHang[i];
        await client.query(
          `INSERT INTO chitietlohang (idlohang, idvattu, soluong, dongianhap)
                     VALUES ($1, $2, $3, $4)`,
          [idlohang, idvattu, soluongthucte, dongianhap]
        );
      }

      // Thêm vào bảng nhapkho
      const nhapKhoResult = await client.query(
        `INSERT INTO nhapkho (ngaynhap) VALUES (CURRENT_DATE) RETURNING idnhapkho`
      );
      const idnhapkho = nhapKhoResult.rows[0].idnhapkho;

      // Thêm chi tiết nhập kho
      for (let i = 0; i < chiTietLoHang.length; i++) {
        const { idvattu, soluongthucte } = chiTietLoHang[i];
        await client.query(
          `INSERT INTO chitietnhapkho (idnhapkho, idlohang, idvattu, idnguoidung, soluong)
                     VALUES ($1, $2, $3, $4, $5)`,
          [idnhapkho, idlohang, idvattu, userId, soluongthucte]
        );
      }


      await client.query("COMMIT"); // Commit transaction
      res.status(201).json({ message: "Thêm lô hàng và nhập kho thành công.", idlohang, idnhapkho });
    } catch (err) {
      await client.query("ROLLBACK"); // Rollback nếu có lỗi
      console.error("Lỗi khi thêm lô hàng và nhập kho:", err);
      res.status(500).json({ message: "Có lỗi xảy ra khi thêm lô hàng và nhập kho." });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Lỗi khi xử lý file Excel:", err);
    res.status(500).json({ message: "Có lỗi xảy ra khi xử lý file Excel." });
  }
});

// Xóa lô hàng và chi tiết lô hàng
app.delete("/api/lohang/:id", verifyToken, async (req, res) => {
  const { id } = req.params;

  const client = await pool.connect();
  try {
    await client.query("BEGIN"); // Bắt đầu transaction

    // Lấy danh sách idnhapkho liên quan đến lô hàng
    const nhapKhoResult = await client.query(
      `SELECT idnhapkho FROM chitietnhapkho WHERE idlohang = $1`,
      [id]
    );

    const idNhapKhoList = nhapKhoResult.rows.map(row => row.idnhapkho);

    // Xóa dữ liệu trong bảng lichsugiaodich
    if (idNhapKhoList.length > 0) {
      await client.query(
        `DELETE FROM lichsugiaodich WHERE idnhapkho = ANY($1::int[])`,
        [idNhapKhoList]
      );
    }

    // Xóa dữ liệu trong bảng chitietnhapkho
    await client.query(
      `DELETE FROM chitietnhapkho WHERE idlohang = $1`,
      [id]
    );

    // Xóa dữ liệu trong bảng nhapkho
    if (idNhapKhoList.length > 0) {
      await client.query(
        `DELETE FROM nhapkho WHERE idnhapkho = ANY($1::int[])`,
        [idNhapKhoList]
      );
    }

    // Xóa dữ liệu trong bảng chitietlohang
    await client.query(
      `DELETE FROM chitietlohang WHERE idlohang = $1`,
      [id]
    );

    // Xóa dữ liệu trong bảng lohang
    const result = await client.query(
      `DELETE FROM lohang WHERE idlohang = $1 RETURNING *`,
      [id]
    );

    if (result.rowCount === 0) {
      throw new Error("Lô hàng không tồn tại.");
    }

    await client.query("COMMIT"); // Commit transaction
    res.status(200).json({ message: "Xóa lô hàng và dữ liệu liên quan thành công." });
  } catch (err) {
    await client.query("ROLLBACK"); // Rollback nếu có lỗi
    console.error("Lỗi khi xóa lô hàng:", err);
    res.status(500).json({ message: "Có lỗi xảy ra khi xóa lô hàng." });
  } finally {
    client.release();
  }
});

// Cập nhật trạng thái lô hàng
app.put("/api/lohang/:id/trangthai", verifyToken, async (req, res) => {
  const { id } = req.params;
  const { trangthai } = req.body;

  // Kiểm tra trạng thái hợp lệ
  const validStatuses = ["Đã nhập", "Đã Hủy"];
  if (!validStatuses.includes(trangthai)) {
    return res.status(400).json({ message: "Trạng thái không hợp lệ." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN"); // Bắt đầu transaction

    // Lấy trạng thái hiện tại của lô hàng
    const currentStatusResult = await client.query(
      `SELECT trangthai FROM lohang WHERE idlohang = $1`,
      [id]
    );

    if (currentStatusResult.rows.length === 0) {
      throw new Error("Lô hàng không tồn tại.");
    }

    const currentStatus = currentStatusResult.rows[0].trangthai;

    // Nếu trạng thái không thay đổi, không làm gì cả
    if (currentStatus === trangthai) {
      return res.status(200).json({ message: "Trạng thái không thay đổi." });
    }

    // Cập nhật trạng thái lô hàng
    const result = await client.query(
      `UPDATE lohang SET trangthai = $1 WHERE idlohang = $2 RETURNING *`,
      [trangthai, id]
    );

    // Nếu trạng thái là "Đã Hủy", xóa dữ liệu liên quan
    if (trangthai === "Đã Hủy") {
      const nhapKhoResult = await client.query(
        `SELECT idnhapkho FROM chitietnhapkho WHERE idlohang = $1`,
        [id]
      );

      const idNhapKhoList = nhapKhoResult.rows.map(row => row.idnhapkho);

      if (idNhapKhoList.length > 0) {
        await client.query(
          `DELETE FROM lichsugiaodich WHERE idnhapkho = ANY($1::int[])`,
          [idNhapKhoList]
        );
      }

      await client.query(
        `DELETE FROM chitietnhapkho WHERE idlohang = $1`,
        [id]
      );

      if (idNhapKhoList.length > 0) {
        await client.query(
          `DELETE FROM nhapkho WHERE idnhapkho = ANY($1::int[])`,
          [idNhapKhoList]
        );
      }
    }

    // Nếu trạng thái là "Đã nhập", thêm lại dữ liệu vào bảng nhapkho và chitietnhapkho
    if (trangthai === "Đã nhập") {
      // Chỉ thêm nếu trạng thái trước đó không phải là "Đã nhập"
      if (currentStatus !== "Đã nhập") {
        const nhapKhoResult = await client.query(
          `INSERT INTO nhapkho (ngaynhap) VALUES (CURRENT_DATE) RETURNING idnhapkho`
        );
        const idnhapkho = nhapKhoResult.rows[0].idnhapkho;

        const chiTietLoHang = await client.query(
          `SELECT idvattu, soluong FROM chitietlohang WHERE idlohang = $1`,
          [id]
        );

        for (let i = 0; i < chiTietLoHang.rows.length; i++) {
          const { idvattu, soluong } = chiTietLoHang.rows[i];
          await client.query(
            `INSERT INTO chitietnhapkho (idnhapkho, idlohang, idvattu, idnguoidung, soluong)
                         VALUES ($1, $2, $3, $4, $5)`,
            [idnhapkho, id, idvattu, req.user?.id, soluong]
          );
        }
      }
    }

    await client.query("COMMIT"); // Commit transaction
    res.status(200).json({ message: "Cập nhật trạng thái thành công.", lohang: result.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK"); // Rollback nếu có lỗi
    console.error("Lỗi khi cập nhật trạng thái lô hàng:", err);
    res.status(500).json({ message: "Có lỗi xảy ra khi cập nhật trạng thái lô hàng." });
  } finally {
    client.release();
  }
});

app.get("/api/tonkho/:idvattu/xuat", verifyToken, async (req, res) => {
  const { idvattu } = req.params;
  try {
    const result = await pool.query(`
      SELECT 
        XK.NgayXuat,
        CTXK.SoLuong,
        CTXK.IDVatTu,
        VT.TenVatTu,
        ND.TenDangNhap AS NguoiDung,
        CTXK.NguoiYeuCau
      FROM XuatKho XK
      JOIN ChiTietXuatKho CTXK ON XK.IDXuatKho = CTXK.IDXuatKho
      JOIN VatTu VT ON CTXK.IDVatTu = VT.IDVatTu
      LEFT JOIN NguoiDung ND ON CTXK.IDNguoiDung = ND.IDNguoiDung
      WHERE CTXK.IDVatTu = $1
      ORDER BY XK.NgayXuat ASC
    `, [idvattu]);

    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Error fetching export details:", err);
    res.status(500).json({ error: "Lỗi khi lấy chi tiết xuất kho." });
  }
});

app.get("/api/tonkho/:idvattu/nhap", verifyToken, async (req, res) => {
  const { idvattu } = req.params;
  try {
    const result = await pool.query(`
      SELECT 
        NK.NgayNhap,
        CTNK.SoLuong,
        CTNK.IDVatTu,
        VT.TenVatTu,
        ND.TenDangNhap AS NguoiDung
      FROM NhapKho NK
      JOIN ChiTietNhapKho CTNK ON NK.IDNhapKho = CTNK.IDNhapKho
      JOIN VatTu VT ON CTNK.IDVatTu = VT.IDVatTu
      LEFT JOIN NguoiDung ND ON CTNK.IDNguoiDung = ND.IDNguoiDung
      WHERE CTNK.IDVatTu = $1
      ORDER BY NK.NgayNhap ASC
    `, [idvattu]);

    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Error fetching import details:", err);
    res.status(500).json({ error: "Lỗi khi lấy chi tiết nhập kho." });
  }
});

// xem danh sách thanh toán của các lô hàng
app.get("/api/thanh-toan", verifyToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                lh.idlohang,
                lh.tongtien,
                COALESCE(SUM(tt.sotienthanhtoan), 0) AS sotienthanhtoan,
                (lh.tongtien - COALESCE(SUM(tt.sotienthanhtoan), 0)) AS congno,
                ncc.tenncc,
                ncc.stk                
            FROM lohang lh
            LEFT JOIN banglsthanhtoan tt ON lh.idlohang = tt.idlohang
            LEFT JOIN nhacungcap ncc ON lh.idncc = ncc.idncc
            GROUP BY lh.idlohang, lh.tongtien, ncc.tenncc, ncc.stk
        `);

        res.status(200).json(result.rows);
    } catch (err) {
        console.error("Lỗi khi lấy danh sách thanh toán:", err);
        res.status(500).json({ message: "Có lỗi xảy ra khi lấy danh sách thanh toán." });
    }
});

// thanh toán cho lô hàng
app.post("/api/thanh-toan", verifyToken, async (req, res) => {
    const { idlohang, sotienthanhtoan, mota } = req.body;

    if (!idlohang || !sotienthanhtoan || isNaN(sotienthanhtoan)) {
        return res.status(400).json({ message: "Thông tin thanh toán không hợp lệ." });
    }

    const soTienThanhToanMoi = parseFloat(sotienthanhtoan);
    if (soTienThanhToanMoi <= 0) {
        return res.status(400).json({ message: "Số tiền thanh toán phải lớn hơn 0." });
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // Kiểm tra lô hàng tồn tại
        const loHangResult = await client.query(
            `SELECT tongtien FROM lohang WHERE idlohang = $1`,
            [idlohang]
        );
        if (loHangResult.rows.length === 0) {
            throw new Error("Lô hàng không tồn tại.");
        }
        const tongTien = parseFloat(loHangResult.rows[0].tongtien);

        // Tính tổng số tiền đã thanh toán
        const thanhToanResult = await client.query(
            `SELECT COALESCE(SUM(sotienthanhtoan), 0) AS tongthanhtoan
             FROM banglsthanhtoan WHERE idlohang = $1`,
            [idlohang]
        );
        const tongThanhToan = parseFloat(thanhToanResult.rows[0].tongthanhtoan);

        // Tính số tiền còn nợ
        const congNo = tongTien - tongThanhToan;

        // Kiểm tra nếu số tiền thanh toán vượt quá số còn nợ
        if (soTienThanhToanMoi > congNo) {
            await client.query("ROLLBACK");
            return res.status(400).json({ message: "Số tiền thanh toán không được vượt quá số tiền còn lại." });
        }

        // Thêm thông tin thanh toán
        await client.query(
            `INSERT INTO banglsthanhtoan (idlohang, sotienthanhtoan, mota, ngaythanhtoan)
             VALUES ($1, $2, $3, CURRENT_DATE)`,
            [idlohang, soTienThanhToanMoi, mota]
        );

        await client.query("COMMIT");
        res.status(201).json({ message: "Thanh toán thành công." });
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("Lỗi khi thanh toán:", err);
        res.status(500).json({ message: err.message });
    } finally {
        client.release();
    }
});

// xem lịch sử thanh toán
app.get("/api/lich-su-thanh-toan/:idlohang", verifyToken, async (req, res) => {
    const { idlohang } = req.params;
    try {
        // Lấy lịch sử thanh toán của lô hàng
        const historyResult = await pool.query(`
            SELECT 
                tt.idthanhtoan,
                tt.idlohang,
                tt.sotienthanhtoan,
                tt.mota,
                tt.ngaythanhtoan
            FROM banglsthanhtoan tt
            WHERE tt.idlohang = $1
            ORDER BY tt.ngaythanhtoan DESC
        `, [idlohang]);

        // Lấy tổng tiền và tổng đã thanh toán của lô hàng
        const summaryResult = await pool.query(`
            SELECT 
                lh.tongtien,
                COALESCE(SUM(tt.sotienthanhtoan), 0) AS tongthanhtoan,
                (lh.tongtien - COALESCE(SUM(tt.sotienthanhtoan), 0)) AS congno,
                ncc.tenncc
            FROM lohang lh
            LEFT JOIN banglsthanhtoan tt ON lh.idlohang = tt.idlohang
            LEFT JOIN nhacungcap ncc ON lh.idncc = ncc.idncc
            WHERE lh.idlohang = $1
            GROUP BY lh.idlohang,lh.tongtien, ncc.tenncc
        `, [idlohang]);

        res.status(200).json({
            history: historyResult.rows,
            summary: summaryResult.rows[0] || { tongtien: 0, tongthanhtoan: 0, congno: 0 }
        });
    } catch (err) {
        console.error("Lỗi khi lấy lịch sử thanh toán theo lô hàng:", err);
        res.status(500).json({ message: "Có lỗi xảy ra khi lấy lịch sử thanh toán." });
    }
});

// get chatbot link
app.post("/api/ayd", async (req, res) => {
  try {
    const response = await fetch("https://www.askyourdatabase.com/api/chatbot/v2/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer 9f6aebb25b648039a029c54d3212602ca1d491eb292648d77947404438346a7d", // Thay bằng API key thật
      },
      body: JSON.stringify({
        "chatbotid": "a37a06f45e54ed59b8796080338d321c",
        "name": process.env.EMAIL_PASSWORD,
        "email": process.env.EMAIL_USER
      }),
    });
    const data = await response.json();
    res.json({ url: data.url });
  } catch (err) {
    res.status(500).json({ error: "Chatbot API error" });
  }
});


// get dashboard widget session
app.post("/api/widget-session", async (req, res) => {
  try {
    const response = await fetch("https://www.askyourdatabase.com/api/widget/v2/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer 9f6aebb25b648039a029c54d3212602ca1d491eb292648d77947404438346a7d" // Thay $API_KEY bằng API key thật
      },
      body: JSON.stringify({
        widgetId: "44f49a0f-0953-4f2c-859e-24ac36f38365",
        name: "User Name", // Có thể lấy từ user đăng nhập nếu muốn
        email: "user@example.com", // Có thể lấy từ user đăng nhập nếu muốn
        properties: {
        }
      })
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Widget API error" });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
