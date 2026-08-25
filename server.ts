import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for JSON parsing and CORS for API integrations
  app.use(express.json());

  // API Documentation & Health Check Endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'operational',
      system: 'PharmaCare Pharmacy Management System API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      offlineCapable: true,
      features: [
        'Inventory Sync',
        'FEFO Batch Tracking',
        'POS & Sales Invoicing',
        'Prescription Dispensing',
        'Purchase Order Management',
        'Audit Logging'
      ]
    });
  });

  // REST API Endpoints for External Inventory & ERP Integrations
  app.get('/api/inventory/summary', (req, res) => {
    res.json({
      message: 'Integration endpoint for external ERP and Inventory Sync.',
      timestamp: new Date().toISOString(),
      supportedMethods: ['GET /api/inventory/summary', 'POST /api/inventory/sync', 'GET /api/medicines', 'POST /api/sales/external'],
      documentation: 'PharmaCare supports standard RESTful JSON data exchanges for automated enterprise stock updates.'
    });
  });

  // External Medicine Catalog API
  app.get('/api/medicines', (req, res) => {
    res.json({
      success: true,
      data: [
        { id: 'med-1', code: 'MED-AMOX-500', name: 'Amoxicillin Capsules 500mg', category: 'Antibiotics', price: 12.00 },
        { id: 'med-2', code: 'MED-PARA-500', name: 'Paracetamol Tablets 500mg', category: 'Analgesics', price: 5.50 },
        { id: 'med-3', code: 'MED-METF-850', name: 'Metformin HCl Tablets 850mg', category: 'Antidiabetics', price: 16.50 },
        { id: 'med-4', code: 'MED-AMLO-5', name: 'Amlodipine Besylate 5mg', category: 'Antihypertensives', price: 9.80 },
        { id: 'med-5', code: 'MED-AZITH-500', name: 'Azithromycin 500mg Tablets', category: 'Antibiotics', price: 14.00 },
        { id: 'med-6', code: 'MED-SALB-INH', name: 'Salbutamol Inhaler 100mcg', category: 'Respiratory', price: 18.50 },
      ]
    });
  });

  // External Purchase Order / Inbound Sync API
  app.post('/api/inventory/sync', (req, res) => {
    const { items, supplierId, reference } = req.body || {};
    res.json({
      success: true,
      syncId: `sync-${Date.now()}`,
      reference: reference || 'EXT-SYNC-AUTO',
      message: 'External inventory synchronization received successfully.',
      itemsCount: Array.isArray(items) ? items.length : 0,
      timestamp: new Date().toISOString()
    });
  });

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        host: '0.0.0.0',
        port: 3000
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PharmaCare PMS Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
