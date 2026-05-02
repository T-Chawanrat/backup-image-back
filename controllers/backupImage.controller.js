import db from "../config/db.js";
import ExcelJS from "exceljs";
import { getPagination, getPagingData } from "../utils/pagination.js";

export const getBackupImages = async (req, res) => {
  try {
    const {
      page,
      limit,
      search,
      reference_no,
      has_sign,
      has_image,
      warehouse_id,
      create_date,
      date_status18,
    } = req.query;

    const { offset, page: p, limit: l } = getPagination(page, limit);

    let sql = `
      SELECT *
      FROM \`close_bill\`
      WHERE 1=1
    `;

    let countSql = `
      SELECT COUNT(*) as total
      FROM \`close_bill\`
      WHERE 1=1
    `;

    const params = [];
    const countParams = [];

    // ================= 🔍 SEARCH =================
    if (search) {
      const clean = search.replace(/[-\s]/g, "");

      sql += `
        AND (
          REPLACE(REPLACE(\`receive_code\`, '-', ''), ' ', '') LIKE ?
          OR REPLACE(REPLACE(\`reference_no\`, '-', ''), ' ', '') LIKE ?
        )
      `;

      countSql += `
        AND (
          REPLACE(REPLACE(\`receive_code\`, '-', ''), ' ', '') LIKE ?
          OR REPLACE(REPLACE(\`reference_no\`, '-', ''), ' ', '') LIKE ?
        )
      `;

      params.push(`%${clean}%`, `%${clean}%`);
      countParams.push(`%${clean}%`, `%${clean}%`);
    }

    // ================= 🔍 REFERENCE =================
    if (reference_no) {
      sql += ` AND \`reference_no\` LIKE ?`;
      countSql += ` AND \`reference_no\` LIKE ?`;

      params.push(`%${reference_no}%`);
      countParams.push(`%${reference_no}%`);
    }

    // ================= 🏢 WAREHOUSE (MULTI) =================
    if (warehouse_id) {
      const ids = warehouse_id
        .split(",")
        .map((x) => x.trim())
        .filter((x) => x !== "") // 🔥 ตัด empty ก่อน
        .map((x) => Number(x))
        .filter((x) => !isNaN(x) && x > 0); // 🔥 กัน 0 / NaN

      if (ids.length > 0) {
        const placeholders = ids.map(() => "?").join(",");

        sql += ` AND warehouse_id IN (${placeholders})`;
        countSql += ` AND warehouse_id IN (${placeholders})`;

        params.push(...ids);
        countParams.push(...ids);
      }
    }

    // ================= 📅 CREATE DATE (วันเดียว) =================
    if (create_date) {
      sql += ` AND \`create_date\` = ?`;
      countSql += ` AND \`create_date\` = ?`;

      params.push(create_date);
      countParams.push(create_date);
    }

    // ================= 📅 STATUS18 DATE (วันเดียว) =================
    if (date_status18) {
      sql += ` AND \`date_status18\` = ?`;
      countSql += ` AND \`date_status18\` = ?`;

      params.push(date_status18);
      countParams.push(date_status18);
    }

    // ================= 🔥 SIGN FILTER =================
    if (has_sign === "true") {
      sql += ` AND (\`sign_name\` IS NOT NULL AND \`sign_name\` != '')`;
      countSql += ` AND (\`sign_name\` IS NOT NULL AND \`sign_name\` != '')`;
    }

    if (has_sign === "false") {
      sql += ` AND (\`sign_name\` IS NULL OR \`sign_name\` = '')`;
      countSql += ` AND (\`sign_name\` IS NULL OR \`sign_name\` = '')`;
    }

    // ================= 🔥 IMAGE FILTER =================
    if (has_image === "true") {
      sql += ` AND (\`document_id\` IS NOT NULL AND \`document_id\` != '')`;
      countSql += ` AND (\`document_id\` IS NOT NULL AND \`document_id\` != '')`;
    }

    if (has_image === "false") {
      sql += ` AND (\`document_id\` IS NULL OR \`document_id\` = '')`;
      countSql += ` AND (\`document_id\` IS NULL OR \`document_id\` = '')`;
    }

    // ================= 📌 PAGINATION =================
    sql += ` ORDER BY \`created_at\` DESC LIMIT ? OFFSET ?`;
    params.push(Number(l), Number(offset));

    const [rows] = await db.query(sql, params);
    const [countRows] = await db.query(countSql, countParams);

    const total = countRows?.[0]?.total || 0;

    return res.json(getPagingData(rows, total, p, l));
  } catch (err) {
    console.error("ERROR:", err);
    return res.status(500).json({
      message: err.message,
    });
  }
};

export const exportBackupImages = async (req, res) => {
  try {
    const {
      search,
      reference_no,
      has_sign,
      has_image,
      warehouse_id,
      create_date,
      date_status18,
    } = req.query;

    let sql = `
      SELECT *
      FROM \`close_bill\`
      WHERE 1=1
    `;

    const params = [];

    // ================= 🔍 SEARCH =================
    if (search) {
      const clean = search.replace(/[-\s]/g, "");

      sql += `
        AND (
          REPLACE(REPLACE(\`receive_code\`, '-', ''), ' ', '') LIKE ?
          OR REPLACE(REPLACE(\`reference_no\`, '-', ''), ' ', '') LIKE ?
        )
      `;

      params.push(`%${clean}%`, `%${clean}%`);
    }

    // ================= 🔍 REFERENCE =================
    if (reference_no) {
      sql += ` AND \`reference_no\` LIKE ?`;
      params.push(`%${reference_no}%`);
    }

    // ================= 🏢 WAREHOUSE (MULTI) =================
    if (warehouse_id && warehouse_id !== "all") {
      const ids = warehouse_id
        .split(",")
        .map((x) => Number(x))
        .filter((x) => !isNaN(x));

      if (ids.length > 0) {
        const placeholders = ids.map(() => "?").join(",");

        sql += ` AND warehouse_id IN (${placeholders})`;
        params.push(...ids);
      }
    }

    // ================= 📅 CREATE DATE =================
    if (create_date) {
      sql += ` AND \`create_date\` = ?`;
      params.push(create_date);
    }

    // ================= 📅 STATUS18 DATE =================
    if (date_status18) {
      sql += ` AND \`date_status18\` = ?`;
      params.push(date_status18);
    }

    // ================= 🔥 SIGN =================
    if (has_sign === "true") {
      sql += ` AND (\`sign_name\` IS NOT NULL AND \`sign_name\` != '')`;
    }

    if (has_sign === "false") {
      sql += ` AND (\`sign_name\` IS NULL OR \`sign_name\` = '')`;
    }

    // ================= 🔥 IMAGE =================
    if (has_image === "true") {
      sql += ` AND (\`document_id\` IS NOT NULL AND \`document_id\` != '')`;
    }

    if (has_image === "false") {
      sql += ` AND (\`document_id\` IS NULL OR \`document_id\` = '')`;
    }

    // 🔥 sort เหมือนหน้าเว็บ
    sql += ` ORDER BY \`created_at\` DESC`;

    const [rows] = await db.query(sql, params);

    // ================= 📊 CREATE EXCEL =================
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("BackupImages");

    worksheet.columns = [
      { header: "Create Date", key: "create_date", width: 15 },
      { header: "Warehouse", key: "warehouse_name", width: 20 },
      { header: "Receive Code", key: "receive_code", width: 25 },
      { header: "Reference", key: "reference_no", width: 25 },
      { header: "Package", key: "package_name", width: 20 },
      { header: "Status 18", key: "date_status18", width: 15 },
      { header: "Sign", key: "sign_name", width: 20 },
      { header: "Image", key: "document_id", width: 20 },
    ];

    rows.forEach((r) => {
      worksheet.addRow({
        create_date: r.create_date,
        warehouse_name: r.warehouse_name,
        receive_code: r.receive_code,
        reference_no: r.reference_no,
        package_name: r.package_name,
        date_status18: r.date_status18,
        sign_name: r.sign_name,
        document_id: r.document_id,
      });
    });

    // ================= 📥 RESPONSE =================
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=backup_images.xlsx",
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("EXPORT ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};

export const getWarehouses = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT id, name
      FROM mm_warehouses
      ORDER BY id ASC
    `);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};
