import { Router } from 'express';
import { query } from '../db';
import { authenticate, authorize } from '../middleware/auth';
import { generatePDF, generateExcel, generateCSV } from '../services/exportService';
import { sendReportEmail, isEmailConfigured } from '../services/emailService';

const router = Router();
router.use(authenticate);

// ─── Helper: build date filter clause ───
function dateFilter(prefix: string, startDate: any, endDate: any, params: any[], pc: { n: number }, dateCol = 'transaction_date') {
  let clause = '';
  if (startDate) {
    params.push(startDate);
    clause += ` AND ${prefix}${dateCol}::date >= $${pc.n++}::date`;
  }
  if (endDate) {
    params.push(endDate);
    clause += ` AND ${prefix}${dateCol}::date <= $${pc.n++}::date`;
  }
  return clause;
}

// ─── Summary Statistics ───
router.get('/summary', async (req, res, next) => {
  try {
    const { locationId, startDate, endDate } = req.query;
    const params: any[] = [];
    const pc = { n: 1 };

    let materialsWhere = ' WHERE 1=1';
    if (locationId) { params.push(locationId); materialsWhere += ` AND location_id = $${pc.n++}`; }
    materialsWhere += dateFilter('', startDate, endDate, params, pc);

    const materialsResult = await query(
      `SELECT COALESCE(SUM(weight_kg), 0) as total_kg, COALESCE(SUM(total_cost), 0) as total_cost, COUNT(*) as count FROM transaction ${materialsWhere}`, params
    );

    const locationsResult = await query('SELECT COUNT(*) as count FROM location WHERE is_active = true');
    const pickersResult = await query('SELECT COUNT(*) as count FROM waste_picker WHERE is_active = true');

    const payParams: any[] = [];
    let payWhere = " WHERE payment_status IN ('pending', 'partial')";
    if (locationId) { payParams.push(locationId); payWhere += ' AND location_id = $1'; }
    const paymentsResult = await query(
      `SELECT COALESCE(SUM(total_cost - COALESCE(paid_amount, 0)), 0) as total FROM transaction ${payWhere}`, payParams
    );

    // Sales totals
    const salesParams: any[] = [];
    const spc = { n: 1 };
    let salesWhere = ' WHERE 1=1';
    if (locationId) { salesParams.push(locationId); salesWhere += ` AND location_id = $${spc.n++}`; }
    salesWhere += dateFilter('', startDate, endDate, salesParams, spc, 'sale_date');
    const salesResult = await query(
      `SELECT COALESCE(SUM(total_amount), 0) as total_revenue, COALESCE(SUM(weight_kg), 0) as total_kg, COUNT(*) as count FROM sale ${salesWhere}`, salesParams
    );

    res.json({
      totalMaterialsKg: parseFloat(materialsResult.rows[0].total_kg) || 0,
      totalPurchaseCost: parseFloat(materialsResult.rows[0].total_cost) || 0,
      totalTransactions: parseInt(materialsResult.rows[0].count) || 0,
      activeLocations: parseInt(locationsResult.rows[0].count) || 0,
      activeWastePickers: parseInt(pickersResult.rows[0].count) || 0,
      pendingPayments: parseFloat(paymentsResult.rows[0].total) || 0,
      totalSalesRevenue: parseFloat(salesResult.rows[0].total_revenue) || 0,
      totalSalesKg: parseFloat(salesResult.rows[0].total_kg) || 0,
      totalSalesCount: parseInt(salesResult.rows[0].count) || 0,
    });
  } catch (error) {
    next(error);
  }
});

// ─── Purchases Report (by vendor) ───
router.get('/purchases', async (req, res, next) => {
  try {
    const { locationId, wastePickerId, materialId, startDate, endDate, groupBy } = req.query;
    const params: any[] = [];
    const pc = { n: 1 };

    if (groupBy === 'vendor') {
      let where = ' WHERE 1=1';
      if (locationId) { params.push(locationId); where += ` AND t.location_id = $${pc.n++}`; }
      if (wastePickerId) { params.push(wastePickerId); where += ` AND t.waste_picker_id = $${pc.n++}`; }
      if (materialId) { params.push(materialId); where += ` AND t.material_category_id = $${pc.n++}`; }
      where += dateFilter('t.', startDate, endDate, params, pc);

      const result = await query(`
        SELECT
          wp.id AS waste_picker_id,
          wp.first_name || ' ' || wp.last_name AS waste_picker_name,
          COUNT(t.id) AS transaction_count,
          SUM(t.weight_kg) AS total_weight_kg,
          SUM(t.total_cost) AS total_cost,
          SUM(COALESCE(t.paid_amount, 0)) AS total_paid,
          SUM(t.total_cost - COALESCE(t.paid_amount, 0)) AS total_outstanding
        FROM transaction t
        JOIN waste_picker wp ON t.waste_picker_id = wp.id
        ${where}
        GROUP BY wp.id, wp.first_name, wp.last_name
        ORDER BY total_weight_kg DESC
      `, params);

      return res.json({ purchases: result.rows });
    }

    if (groupBy === 'material') {
      let where = ' WHERE 1=1';
      if (locationId) { params.push(locationId); where += ` AND t.location_id = $${pc.n++}`; }
      if (wastePickerId) { params.push(wastePickerId); where += ` AND t.waste_picker_id = $${pc.n++}`; }
      where += dateFilter('t.', startDate, endDate, params, pc);

      const result = await query(`
        SELECT
          mc.id AS material_id,
          mc.name AS material_name,
          COUNT(t.id) AS transaction_count,
          SUM(t.weight_kg) AS total_weight_kg,
          AVG(t.unit_price) AS avg_price_per_kg,
          SUM(t.total_cost) AS total_cost
        FROM transaction t
        JOIN material_category mc ON t.material_category_id = mc.id
        ${where}
        GROUP BY mc.id, mc.name
        ORDER BY total_weight_kg DESC
      `, params);

      return res.json({ purchases: result.rows });
    }

    // Default: detailed list
    let where = ' WHERE 1=1';
    if (locationId) { params.push(locationId); where += ` AND t.location_id = $${pc.n++}`; }
    if (wastePickerId) { params.push(wastePickerId); where += ` AND t.waste_picker_id = $${pc.n++}`; }
    if (materialId) { params.push(materialId); where += ` AND t.material_category_id = $${pc.n++}`; }
    where += dateFilter('t.', startDate, endDate, params, pc);

    const result = await query(`
      SELECT
        t.id, t.transaction_number, t.transaction_date::date AS transaction_date, t.source_type,
        l.name AS location_name,
        mc.name AS material_name,
        wp.first_name || ' ' || wp.last_name AS waste_picker_name,
        ac.name AS apartment_name,
        au.unit_number AS apartment_unit,
        t.weight_kg, t.quality_grade, t.unit_price, t.total_cost,
        t.payment_status, t.payment_method,
        COALESCE(t.paid_amount, 0) AS paid_amount,
        t.total_cost - COALESCE(t.paid_amount, 0) AS outstanding
      FROM transaction t
      JOIN location l ON t.location_id = l.id
      JOIN material_category mc ON t.material_category_id = mc.id
      LEFT JOIN waste_picker wp ON t.waste_picker_id = wp.id
      LEFT JOIN apartment_complex ac ON t.apartment_complex_id = ac.id
      LEFT JOIN apartment_unit au ON t.apartment_unit_id = au.id
      ${where}
      ORDER BY t.transaction_date DESC
      LIMIT 1000
    `, params);

    return res.json({ purchases: result.rows });
  } catch (error) {
    return next(error);
  }
});

// ─── Sales Report (by client) ───
router.get('/sales', async (req, res, next) => {
  try {
    const { locationId, clientId, materialId, startDate, endDate, groupBy } = req.query;
    const params: any[] = [];
    const pc = { n: 1 };

    if (groupBy === 'client') {
      let where = ' WHERE 1=1';
      if (locationId) { params.push(locationId); where += ` AND s.location_id = $${pc.n++}`; }
      if (clientId) { params.push(clientId); where += ` AND s.client_id = $${pc.n++}`; }
      where += dateFilter('s.', startDate, endDate, params, pc, 'sale_date');

      const result = await query(`
        SELECT
          c.id AS client_id,
          c.name AS client_name,
          COUNT(s.id) AS sale_count,
          SUM(s.weight_kg) AS total_weight_kg,
          SUM(s.total_amount) AS total_revenue,
          SUM(COALESCE(s.paid_amount, 0)) AS total_paid,
          SUM(s.total_amount - COALESCE(s.paid_amount, 0)) AS total_outstanding
        FROM sale s
        JOIN client c ON s.client_id = c.id
        ${where}
        GROUP BY c.id, c.name
        ORDER BY total_revenue DESC
      `, params);

      return res.json({ sales: result.rows });
    }

    if (groupBy === 'material') {
      let where = ' WHERE 1=1';
      if (locationId) { params.push(locationId); where += ` AND s.location_id = $${pc.n++}`; }
      if (clientId) { params.push(clientId); where += ` AND s.client_id = $${pc.n++}`; }
      where += dateFilter('s.', startDate, endDate, params, pc, 'sale_date');

      const result = await query(`
        SELECT
          mc.id AS material_id,
          mc.name AS material_name,
          COUNT(s.id) AS sale_count,
          SUM(s.weight_kg) AS total_weight_kg,
          AVG(s.unit_price) AS avg_price_per_kg,
          SUM(s.total_amount) AS total_revenue
        FROM sale s
        JOIN material_category mc ON s.material_category_id = mc.id
        ${where}
        GROUP BY mc.id, mc.name
        ORDER BY total_revenue DESC
      `, params);

      return res.json({ sales: result.rows });
    }

    // Default: detailed list
    let where = ' WHERE 1=1';
    if (locationId) { params.push(locationId); where += ` AND s.location_id = $${pc.n++}`; }
    if (clientId) { params.push(clientId); where += ` AND s.client_id = $${pc.n++}`; }
    if (materialId) { params.push(materialId); where += ` AND s.material_category_id = $${pc.n++}`; }
    where += dateFilter('s.', startDate, endDate, params, pc, 'sale_date');

    const result = await query(`
      SELECT
        s.id, s.sale_number, s.sale_date::date AS sale_date,
        l.name AS location_name,
        c.name AS client_name,
        mc.name AS material_name,
        s.weight_kg, s.unit_price, s.total_amount,
        s.payment_status, s.payment_method,
        COALESCE(s.paid_amount, 0) AS paid_amount,
        s.total_amount - COALESCE(s.paid_amount, 0) AS outstanding,
        s.delivery_status
      FROM sale s
      JOIN location l ON s.location_id = l.id
      JOIN client c ON s.client_id = c.id
      JOIN material_category mc ON s.material_category_id = mc.id
      ${where}
      ORDER BY s.sale_date DESC
      LIMIT 1000
    `, params);

    return res.json({ sales: result.rows });
  } catch (error) {
    return next(error);
  }
});

// ─── Traceability Report ───
router.get('/traceability', async (req, res, next) => {
  try {
    const { apartmentId, unitId, wastePickerId, materialId, startDate, endDate, days = 42 } = req.query;
    const params: any[] = [];
    let paramCount = 1;

    let where = ' WHERE 1=1';
    if (apartmentId) { params.push(apartmentId); where += ` AND t.apartment_complex_id = $${paramCount++}`; }
    if (unitId) { params.push(unitId); where += ` AND t.apartment_unit_id = $${paramCount++}`; }
    if (wastePickerId) { params.push(wastePickerId); where += ` AND t.waste_picker_id = $${paramCount++}`; }
    if (materialId) { params.push(materialId); where += ` AND t.material_category_id = $${paramCount++}`; }
    if (startDate) { params.push(startDate); where += ` AND t.transaction_date::date >= $${paramCount++}::date`; }
    else if (!endDate) { params.push(days); where += ` AND t.transaction_date >= CURRENT_DATE - ($${paramCount++} || ' days')::INTERVAL`; }
    if (endDate) { params.push(endDate); where += ` AND t.transaction_date::date <= $${paramCount++}::date`; }

    const result = await query(`
      SELECT
        t.id AS transaction_id, t.transaction_number, t.transaction_date, t.source_type,
        CASE
          WHEN t.source_type = 'apartment' THEN ac.name || COALESCE(' - Unit ' || COALESCE(au.unit_number, t.apartment_unit), '')
          WHEN t.source_type = 'waste_picker' THEN wp.first_name || ' ' || wp.last_name
        END AS source_name,
        ac.id AS apartment_id, ac.name AS apartment_name,
        t.apartment_unit_id, au.unit_number AS apartment_unit_number, au.resident_name AS apartment_resident_name,
        wp.id AS waste_picker_id, wp.first_name || ' ' || wp.last_name AS waste_picker_name,
        l.id AS location_id, l.name AS location_name,
        mc.id AS material_id, mc.name AS material_category,
        t.weight_kg, t.quality_grade, t.unit_price, t.total_cost, t.payment_status
      FROM transaction t
      JOIN location l ON t.location_id = l.id
      JOIN material_category mc ON t.material_category_id = mc.id
      LEFT JOIN apartment_complex ac ON t.apartment_complex_id = ac.id
      LEFT JOIN apartment_unit au ON t.apartment_unit_id = au.id
      LEFT JOIN waste_picker wp ON t.waste_picker_id = wp.id
      ${where}
      ORDER BY t.transaction_date DESC
    `, params);

    // Build summary with same where clause
    const sParams = [...params];
    const summaryResult = await query(`
      SELECT
        t.source_type,
        CASE
          WHEN t.source_type = 'apartment' THEN ac.name || COALESCE(' - Unit ' || COALESCE(au.unit_number, t.apartment_unit), '')
          WHEN t.source_type = 'waste_picker' THEN wp.first_name || ' ' || wp.last_name
        END AS source_name,
        mc.name AS material_category,
        SUM(t.weight_kg) AS total_weight_kg,
        COUNT(t.id) AS transaction_count,
        SUM(t.total_cost) AS total_cost,
        MIN(t.transaction_date) AS first_transaction,
        MAX(t.transaction_date) AS last_transaction
      FROM transaction t
      JOIN material_category mc ON t.material_category_id = mc.id
      LEFT JOIN apartment_complex ac ON t.apartment_complex_id = ac.id
      LEFT JOIN apartment_unit au ON t.apartment_unit_id = au.id
      LEFT JOIN waste_picker wp ON t.waste_picker_id = wp.id
      ${where}
      GROUP BY t.source_type,
        CASE
          WHEN t.source_type = 'apartment' THEN ac.name || COALESCE(' - Unit ' || COALESCE(au.unit_number, t.apartment_unit), '')
          WHEN t.source_type = 'waste_picker' THEN wp.first_name || ' ' || wp.last_name
        END,
        mc.name
      ORDER BY total_weight_kg DESC
    `, sParams);

    res.json({ transactions: result.rows, summary: summaryResult.rows });
  } catch (error) {
    next(error);
  }
});

// ─── Trends ───
router.get('/trends', async (req: any, res, next) => {
  try {
    const { locationId, startDate, endDate, days = 30 } = req.query;
    const params: any[] = [];
    const pc = { n: 1 };

    let where = ' WHERE 1=1';
    if (locationId) { params.push(locationId); where += ` AND t.location_id = $${pc.n++}`; }
    if (startDate) { params.push(startDate); where += ` AND t.transaction_date::date >= $${pc.n++}::date`; }
    else { params.push(days); where += ` AND t.transaction_date >= CURRENT_DATE - ($${pc.n++} || ' days')::INTERVAL`; }
    if (endDate) { params.push(endDate); where += ` AND t.transaction_date::date <= $${pc.n++}::date`; }

    const result = await query(`
      SELECT
        DATE(t.transaction_date) AS date,
        COUNT(t.id) AS total_transactions,
        SUM(t.weight_kg) AS total_weight_kg,
        SUM(t.total_cost) AS total_value
      FROM transaction t
      ${where}
      GROUP BY DATE(t.transaction_date)
      ORDER BY date ASC
    `, params);

    res.json({ trends: result.rows });
  } catch (error) {
    next(error);
  }
});

// ─── Pending Payments ───
router.get('/pending-payments', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const { locationId } = req.query;
    const params: any[] = [];

    let where = " WHERE t.payment_status IN ('pending', 'partial')";
    if (locationId) { params.push(locationId); where += ' AND t.location_id = $1'; }

    const result = await query(`
      SELECT
        t.id AS transaction_id, t.transaction_number, t.transaction_date,
        wp.first_name || ' ' || wp.last_name AS waste_picker_name,
        mc.name AS material_category,
        l.name AS location_name,
        t.weight_kg, t.total_cost, COALESCE(t.paid_amount, 0) AS paid_amount,
        t.total_cost - COALESCE(t.paid_amount, 0) AS amount_due,
        t.payment_status
      FROM transaction t
      JOIN location l ON t.location_id = l.id
      JOIN material_category mc ON t.material_category_id = mc.id
      LEFT JOIN waste_picker wp ON t.waste_picker_id = wp.id
      ${where}
      ORDER BY t.transaction_date DESC
    `, params);

    res.json({ payments: result.rows });
  } catch (error) {
    next(error);
  }
});

// ─── Export Report ───
router.get('/export', async (req: any, res, next): Promise<any> => {
  try {
    const { reportType = 'purchases', format = 'csv', startDate, endDate, locationId, wastePickerId, clientId, groupBy } = req.query;

    let reportData: any[];
    let title = '';
    let columns: { header: string; key: string; width?: number }[] = [];
    const dateSubtitle = startDate && endDate ? `${startDate} to ${endDate}` : 'All time';

    if (reportType === 'purchases' || reportType === 'transactions') {
      title = 'Purchases Report';
      const params: any[] = [];
      const pc = { n: 1 };
      let where = ' WHERE 1=1';
      if (locationId) { params.push(locationId); where += ` AND t.location_id = $${pc.n++}`; }
      if (wastePickerId) { params.push(wastePickerId); where += ` AND t.waste_picker_id = $${pc.n++}`; }
      where += dateFilter('t.', startDate, endDate, params, pc);

      if (groupBy === 'vendor') {
        columns = [
          { header: 'Vendor', key: 'waste_picker_name', width: 120 },
          { header: 'Transactions', key: 'transaction_count', width: 80 },
          { header: 'Weight (kg)', key: 'total_weight_kg', width: 80 },
          { header: 'Total Cost', key: 'total_cost', width: 80 },
          { header: 'Paid', key: 'total_paid', width: 80 },
          { header: 'Outstanding', key: 'total_outstanding', width: 80 },
        ];
        const result = await query(`
          SELECT wp.first_name || ' ' || wp.last_name AS waste_picker_name,
            COUNT(t.id) AS transaction_count, SUM(t.weight_kg) AS total_weight_kg,
            SUM(t.total_cost) AS total_cost, SUM(COALESCE(t.paid_amount, 0)) AS total_paid,
            SUM(t.total_cost - COALESCE(t.paid_amount, 0)) AS total_outstanding
          FROM transaction t JOIN waste_picker wp ON t.waste_picker_id = wp.id ${where}
          GROUP BY wp.first_name, wp.last_name ORDER BY total_weight_kg DESC
        `, params);
        reportData = result.rows;
      } else {
        columns = [
          { header: 'Date', key: 'transaction_date', width: 80 },
          { header: 'TX#', key: 'transaction_number', width: 80 },
          { header: 'Location', key: 'location_name', width: 100 },
          { header: 'Vendor', key: 'waste_picker_name', width: 100 },
          { header: 'Material', key: 'material_name', width: 80 },
          { header: 'Weight (kg)', key: 'weight_kg', width: 70 },
          { header: 'Unit Price', key: 'unit_price', width: 70 },
          { header: 'Total', key: 'total_cost', width: 70 },
          { header: 'Status', key: 'payment_status', width: 60 },
        ];
        const result = await query(`
          SELECT t.transaction_date::date AS transaction_date, t.transaction_number,
            l.name AS location_name, wp.first_name || ' ' || wp.last_name AS waste_picker_name,
            mc.name AS material_name, t.weight_kg, t.unit_price, t.total_cost, t.payment_status
          FROM transaction t
          JOIN location l ON t.location_id = l.id
          JOIN material_category mc ON t.material_category_id = mc.id
          LEFT JOIN waste_picker wp ON t.waste_picker_id = wp.id
          ${where} ORDER BY t.transaction_date DESC LIMIT 5000
        `, params);
        reportData = result.rows;
      }
    } else if (reportType === 'sales') {
      title = 'Sales Report';
      const params: any[] = [];
      const pc = { n: 1 };
      let where = ' WHERE 1=1';
      if (locationId) { params.push(locationId); where += ` AND s.location_id = $${pc.n++}`; }
      if (clientId) { params.push(clientId); where += ` AND s.client_id = $${pc.n++}`; }
      where += dateFilter('s.', startDate, endDate, params, pc, 'sale_date');

      if (groupBy === 'client') {
        columns = [
          { header: 'Client', key: 'client_name', width: 120 },
          { header: 'Sales', key: 'sale_count', width: 60 },
          { header: 'Weight (kg)', key: 'total_weight_kg', width: 80 },
          { header: 'Revenue', key: 'total_revenue', width: 80 },
          { header: 'Paid', key: 'total_paid', width: 80 },
          { header: 'Outstanding', key: 'total_outstanding', width: 80 },
        ];
        const result = await query(`
          SELECT c.name AS client_name, COUNT(s.id) AS sale_count,
            SUM(s.weight_kg) AS total_weight_kg, SUM(s.total_amount) AS total_revenue,
            SUM(COALESCE(s.paid_amount, 0)) AS total_paid,
            SUM(s.total_amount - COALESCE(s.paid_amount, 0)) AS total_outstanding
          FROM sale s JOIN client c ON s.client_id = c.id ${where}
          GROUP BY c.name ORDER BY total_revenue DESC
        `, params);
        reportData = result.rows;
      } else {
        columns = [
          { header: 'Date', key: 'sale_date', width: 80 },
          { header: 'Sale#', key: 'sale_number', width: 80 },
          { header: 'Location', key: 'location_name', width: 100 },
          { header: 'Client', key: 'client_name', width: 100 },
          { header: 'Material', key: 'material_name', width: 80 },
          { header: 'Weight (kg)', key: 'weight_kg', width: 70 },
          { header: 'Unit Price', key: 'unit_price', width: 70 },
          { header: 'Total', key: 'total_amount', width: 70 },
          { header: 'Payment', key: 'payment_status', width: 60 },
          { header: 'Delivery', key: 'delivery_status', width: 60 },
        ];
        const result = await query(`
          SELECT s.sale_date::date AS sale_date, s.sale_number,
            l.name AS location_name, c.name AS client_name,
            mc.name AS material_name, s.weight_kg, s.unit_price, s.total_amount,
            s.payment_status, s.delivery_status
          FROM sale s
          JOIN location l ON s.location_id = l.id
          JOIN client c ON s.client_id = c.id
          JOIN material_category mc ON s.material_category_id = mc.id
          ${where} ORDER BY s.sale_date DESC LIMIT 5000
        `, params);
        reportData = result.rows;
      }
    } else if (reportType === 'traceability') {
      title = 'Traceability Report';
      columns = [
        { header: 'Date', key: 'transaction_date', width: 70 },
        { header: 'TX#', key: 'transaction_number', width: 70 },
        { header: 'Source', key: 'source_name', width: 110 },
        { header: 'Vendor', key: 'waste_picker_name', width: 90 },
        { header: 'Location', key: 'location_name', width: 90 },
        { header: 'Material', key: 'material_category', width: 70 },
        { header: 'Weight (kg)', key: 'weight_kg', width: 60 },
        { header: 'Cost', key: 'total_cost', width: 60 },
        { header: 'Status', key: 'payment_status', width: 60 },
      ];
      const params: any[] = [];
      const pc = { n: 1 };
      let where = ' WHERE 1=1';
      where += dateFilter('t.', startDate, endDate, params, pc);

      const result = await query(`
        SELECT t.transaction_date::date AS transaction_date, t.transaction_number, t.source_type,
          CASE
            WHEN t.source_type = 'apartment' THEN ac.name || COALESCE(' - Unit ' || COALESCE(au.unit_number, t.apartment_unit), '')
            WHEN t.source_type = 'waste_picker' THEN wp.first_name || ' ' || wp.last_name
          END AS source_name,
          wp.first_name || ' ' || wp.last_name AS waste_picker_name,
          l.name AS location_name, mc.name AS material_category,
          t.weight_kg, t.total_cost, t.payment_status
        FROM transaction t
        JOIN location l ON t.location_id = l.id
        JOIN material_category mc ON t.material_category_id = mc.id
        LEFT JOIN apartment_complex ac ON t.apartment_complex_id = ac.id
        LEFT JOIN apartment_unit au ON t.apartment_unit_id = au.id
        LEFT JOIN waste_picker wp ON t.waste_picker_id = wp.id
        ${where} ORDER BY t.transaction_date DESC LIMIT 5000
      `, params);
      reportData = result.rows;
    } else {
      return res.status(400).json({ error: `Unknown report type: ${reportType}` });
    }

    const data = { title, subtitle: dateSubtitle, columns, rows: reportData || [] };

    if (format === 'pdf') {
      const buffer = await generatePDF(data);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${title.replace(/ /g, '_')}.pdf"`);
      return res.send(buffer);
    }

    if (format === 'excel' || format === 'xlsx') {
      const buffer = await generateExcel(data);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${title.replace(/ /g, '_')}.xlsx"`);
      return res.send(buffer);
    }

    // Default: CSV
    const csv = generateCSV(data);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${title.replace(/ /g, '_')}.csv"`);
    return res.send(csv);
  } catch (error) {
    next(error);
  }
});

// ─── Email Report ───
router.post('/email', authorize('admin', 'manager'), async (req: any, res, next): Promise<any> => {
  try {
    if (!(await isEmailConfigured())) {
      return res.status(400).json({ error: 'Email is not configured. Contact your administrator to set SMTP settings.' });
    }

    const { to, reportType = 'purchases', format = 'pdf', startDate, endDate, subject, message } = req.body;

    if (!to) {
      return res.status(400).json({ error: 'Recipient email address is required' });
    }

    const dateSubtitle = startDate && endDate ? `${startDate} to ${endDate}` : 'All time';
    const title = reportType === 'sales' ? 'Sales Report' : reportType === 'traceability' ? 'Traceability Report' : 'Purchases Report';
    let columns: any[] = [];
    let reportData: any[] = [];

    if (reportType === 'sales') {
      columns = [
        { header: 'Date', key: 'sale_date' }, { header: 'Client', key: 'client_name' },
        { header: 'Material', key: 'material_name' }, { header: 'Weight (kg)', key: 'weight_kg' },
        { header: 'Total', key: 'total_amount' }, { header: 'Status', key: 'payment_status' },
      ];
      const sParams: any[] = [];
      const spc = { n: 1 };
      let sWhere = ' WHERE 1=1';
      sWhere += dateFilter('s.', startDate, endDate, sParams, spc, 'sale_date');
      const result = await query(`
        SELECT s.sale_date::date AS sale_date, c.name AS client_name, mc.name AS material_name,
          s.weight_kg, s.total_amount, s.payment_status
        FROM sale s JOIN client c ON s.client_id = c.id JOIN material_category mc ON s.material_category_id = mc.id
        JOIN location l ON s.location_id = l.id ${sWhere} ORDER BY s.sale_date DESC LIMIT 5000
      `, sParams);
      reportData = result.rows;
    } else {
      columns = [
        { header: 'Date', key: 'transaction_date' }, { header: 'Vendor', key: 'waste_picker_name' },
        { header: 'Material', key: 'material_name' }, { header: 'Weight (kg)', key: 'weight_kg' },
        { header: 'Total', key: 'total_cost' }, { header: 'Status', key: 'payment_status' },
      ];
      const qParams: any[] = [];
      const qpc = { n: 1 };
      let qWhere = ' WHERE 1=1';
      qWhere += dateFilter('t.', startDate, endDate, qParams, qpc);
      const result = await query(`
        SELECT t.transaction_date::date AS transaction_date,
          wp.first_name || ' ' || wp.last_name AS waste_picker_name,
          mc.name AS material_name, t.weight_kg, t.total_cost, t.payment_status
        FROM transaction t
        JOIN material_category mc ON t.material_category_id = mc.id
        LEFT JOIN waste_picker wp ON t.waste_picker_id = wp.id
        ${qWhere} ORDER BY t.transaction_date DESC LIMIT 5000
      `, qParams);
      reportData = result.rows;
    }

    const data = { title, subtitle: dateSubtitle, columns, rows: reportData };

    let attachment: { filename: string; content: Buffer | string; contentType: string };
    if (format === 'excel' || format === 'xlsx') {
      const buffer = await generateExcel(data);
      attachment = { filename: `${title.replace(/ /g, '_')}.xlsx`, content: buffer, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
    } else if (format === 'csv') {
      const csv = generateCSV(data);
      attachment = { filename: `${title.replace(/ /g, '_')}.csv`, content: csv, contentType: 'text/csv' };
    } else {
      const buffer = await generatePDF(data);
      attachment = { filename: `${title.replace(/ /g, '_')}.pdf`, content: buffer, contentType: 'application/pdf' };
    }

    await sendReportEmail({
      to,
      subject: subject || `CIVICycle - ${title}`,
      body: `
        <p>${message || `Please find attached the ${title.toLowerCase()}.`}</p>
        <p><strong>Period:</strong> ${dateSubtitle}</p>
        <p><strong>Records:</strong> ${reportData.length}</p>
      `,
      attachments: [attachment],
    });

    res.json({ message: 'Report sent successfully', to, reportType, format });
  } catch (error) {
    next(error);
  }
});

// ─── Email config status ───
router.get('/email-status', authorize('admin', 'manager'), async (_req, res) => {
  res.json({ configured: await isEmailConfigured() });
});

export default router;
