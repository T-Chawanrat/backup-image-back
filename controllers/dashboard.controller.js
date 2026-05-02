import db from "../config/db.js";

const buildDashboardQuery = ({ table, dateField }) => {
  return `
    SELECT
      DATE(${dateField}) as date,

      COUNT(*) as total_bill,

      CAST(SUM(CASE WHEN has_sign = 0 THEN 1 ELSE 0 END) AS UNSIGNED) as no_sign,

      CAST(SUM(CASE WHEN has_image_all = 0 THEN 1 ELSE 0 END) AS UNSIGNED) as no_image

    FROM (
      SELECT
        receive_code,
        ${dateField},

        MAX(CASE 
          WHEN sign_name IS NOT NULL AND sign_name != '' THEN 1 
          ELSE 0 
        END) as has_sign,

        MIN(CASE 
          WHEN document_id IS NOT NULL AND document_id != '' THEN 1 
          ELSE 0 
        END) as has_image_all

      FROM ${table}

      WHERE ${dateField} IS NOT NULL   -- 🔥 กัน NULL

      GROUP BY receive_code, ${dateField}
    ) t

    GROUP BY DATE(${dateField})        -- 🔥 group ให้ตรง format

    ORDER BY DATE(${dateField}) ASC
  `;
};

export const getDashboardCreateDate = async (req, res) => {
  try {
    const sql = buildDashboardQuery({
      table: "create_bill",
      dateField: "create_date",
    });

    const [rows] = await db.query(sql);
    res.json(rows);
  } catch (err) {
    console.error("CREATE DATE ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};

export const getDashboardStatus18 = async (req, res) => {
  try {
    const sql = buildDashboardQuery({
      table: "close_bill",
      dateField: "date_status18",
    });

    const [rows] = await db.query(sql);
    res.json(rows);
  } catch (err) {
    console.error("STATUS18 ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};
