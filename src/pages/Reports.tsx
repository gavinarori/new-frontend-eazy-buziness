import React, { useState } from 'react';
import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, TrendingUp, Users, Package, FileText, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { useToast } from '../contexts/ToastContext';
import autoTable from 'jspdf-autotable';
import { useAuth } from '../contexts/AuthContext';
import { useProducts, useInvoices, useSupplies, useUsers, useFirestore } from '../hooks/useFirestore';
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';

const Reports: React.FC = () => {
  const { userData } = useAuth();
  const [dateRange, setDateRange] = useState('30');
  const [reportType, setReportType] = useState('sales');

  // Fetch real data
  const { data: products, loading: productsLoading } = useProducts(userData?.shopId);
  const { data: invoices, loading: invoicesLoading } = useInvoices(userData?.shopId);
  const { data: supplies, loading: suppliesLoading } = useSupplies(userData?.shopId);
  const { data: users, loading: usersLoading } = useUsers(userData?.shopId);
  const { data: shops } = useFirestore('shops');

  const loading = productsLoading || invoicesLoading || suppliesLoading || usersLoading;
  const { showToast } = useToast();

  // Get current shop data for currency
  const currentShop = shops.find(shop => shop.id === userData?.shopId);
  const currency = currentShop?.currency || 'USD';
  const vatRate = currentShop?.vatRate ? parseFloat(currentShop.vatRate.toString()) / 100 : 0.1;

  // Currency symbol mapping
  const getCurrencySymbol = (currency: string) => {
    switch (currency) {
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'GBP': return '£';
      case 'KSH': return 'KSh';
      case 'JPY': return '¥';
      default: return '$';
    }
  };

  const currencySymbol = getCurrencySymbol(currency);
  // vatRate is currently unused; keep for future report calculations

  // Generate sales data from real invoices
  const generateSalesData = () => {
    const months = eachMonthOfInterval({
      start: subMonths(new Date(), 5),
      end: new Date()
    });

    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      
      const monthInvoices = invoices.filter(invoice => {
        const invoiceDate = invoice.createdAt instanceof Date ? invoice.createdAt : new Date(invoice.createdAt);
        return invoiceDate >= monthStart && invoiceDate <= monthEnd;
      });

      const sales = monthInvoices.length;
      const revenue = monthInvoices.reduce((sum: number, invoice: any) => sum + invoice.total, 0);
      const profit = monthInvoices.reduce((sum: number, invoice: any) => {
        const invoiceProfit = invoice.items?.reduce((itemSum: number, item: any) => {
          const product = products.find(p => p.id === item.productId);
          const itemProfit = product ? (item.price - product.cost) * item.quantity : 0;
          return itemSum + itemProfit;
        }, 0) || 0;
        return sum + invoiceProfit;
      }, 0);

      return {
        name: format(month, 'MMM'),
        sales,
        revenue: Math.round(revenue),
        profit: Math.round(profit)
      };
    });
  };

  // Generate product category data
  const generateProductData = () => {
    const categoryStats = products.reduce((acc, product) => {
      const category = product.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = { count: 0, value: 0 };
      }
      acc[category].count += 1;
      acc[category].value += product.stock * product.price;
      return acc;
    }, {} as Record<string, { count: number; value: number }>);

    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
    const totalValue = Object.values(categoryStats).reduce((sum, cat) => sum + cat.value, 0);

    return Object.entries(categoryStats).map(([name, stats], index) => ({
      name,
      value: totalValue > 0 ? Math.round((stats.value / totalValue) * 100) : 0,
      color: colors[index % colors.length]
    }));
  };

  // Generate staff performance data
  const generateStaffPerformance = () => {
    const staffMembers = users.filter(user => user.role === 'staff');
    
    return staffMembers.map(staff => {
      const staffInvoices = invoices.filter(invoice => invoice.createdBy === staff.id);
      const sales = staffInvoices.length;
      const commissionRate = (staff.commissionRate || 5) / 100; // Use staff commission rate or default 5%
      const commission = staffInvoices.reduce((sum, invoice) => sum + (invoice.total * commissionRate), 0);
      const target = staff.salesTarget || 100; // Use staff target or default 100

      return {
        name: staff.name,
        sales,
        commission: Math.round(commission),
        target,
        commissionRate: staff.commissionRate || 5
      };
    });
  };

  // Generate top products data
  const generateTopProducts = () => {
    const productSales = products.map(product => {
      const soldQuantity = invoices.reduce((sum: number, invoice: any) => {
        const item = invoice.items?.find((item: any) => item.productId === product.id);
        return sum + (item ? item.quantity : 0);
      }, 0);

      const revenue = invoices.reduce((sum: number, invoice) => {
        const item = invoice.items?.find((item: any) => item.productId === product.id);
        return sum + (item ? item.total : 0);
      }, 0);

      return {
        name: product.name,
        sold: soldQuantity,
        revenue
      };
    }).filter(product => product.sold > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 4);

    return productSales;
  };

  // Calculate real metrics
  const totalRevenue = invoices.reduce((sum, invoice) => sum + invoice.total, 0);
  const totalSales = invoices.length;
  const pendingInvoices = invoices.filter(invoice => invoice.status === 'pending').length;
  const activeProducts = products.filter(product => product.stock > 0).length;
  const lowStockItems = products.filter(product => product.stock <= product.minStock).length;

  // Export to PDF function
  const exportToPDF = () => {
    try {
      // Get current date range in days
      const daysBack = parseInt(dateRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);
      
      // Filter data based on selected date range
      const filteredInvoices = invoices.filter(invoice => {
        const invoiceDate = invoice.createdAt instanceof Date ? invoice.createdAt : new Date(invoice.createdAt);
        return invoiceDate >= startDate;
      });
      
      const filteredSupplies = supplies.filter(supply => {
        const supplyDate = supply.receivedAt instanceof Date ? supply.receivedAt : new Date(supply.receivedAt);
        return supplyDate >= startDate;
      });
      
      // Calculate filtered metrics
      const filteredTotalRevenue = filteredInvoices.reduce((sum, invoice) => sum + invoice.total, 0);
      const filteredTotalSales = filteredInvoices.length;
      const filteredPendingInvoices = filteredInvoices.filter(invoice => invoice.status === 'pending').length;
      const filteredSupplyCost = filteredSupplies.reduce((sum, supply) => sum + (supply.totalCost || supply.cost || 0), 0);
      
      // Calculate filtered staff performance
      const filteredStaffPerformance = users.filter(user => user.role === 'staff').map(staff => {
        const staffInvoices = filteredInvoices.filter(invoice => invoice.createdBy === staff.id);
        const sales = staffInvoices.length;
        const commissionRate = (staff.commissionRate || 5) / 100;
        const commission = staffInvoices.reduce((sum: number, invoice: any) => sum + (invoice.total * commissionRate), 0);
        const target = staff.salesTarget || 100;

        return {
          name: staff.name,
          sales,
          commission: Math.round(commission),
          target
        };
      });
      
      // Get shop name (assuming first shop or default)
      const shopName = userData?.shopId ? 'Main Store' : 'Business Hub'; // You can enhance this to get actual shop name
      
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const margin = 20;
      let yPosition = margin;

      // Add shop name as headline
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(shopName, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;
      
      // Add report title
      doc.setFontSize(16);
      doc.setFont('helvetica', 'normal');
      doc.text('Comprehensive Business Report', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;

      // Add date
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated on: ${format(new Date(), 'MMMM dd, yyyy')}`, pageWidth / 2, yPosition, { align: 'center' });
      doc.text(`Report Period: Last ${dateRange} days`, pageWidth / 2, yPosition + 10, { align: 'center' });
      yPosition += 20;

      // Add key metrics
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Key Metrics', margin, yPosition);
      yPosition += 10;

      const metricsData = [
        ['Metric', 'Value'],
        ['Total Revenue', `${currencySymbol}${filteredTotalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        ['Total Sales', filteredTotalSales.toString()],
        ['Pending Invoices', filteredPendingInvoices.toString()],
        ['Active Products', activeProducts.toString()],
        ['Low Stock Items', lowStockItems.toString()],
        ['Total Staff', users.filter(u => u.role === 'staff').length.toString()],
        ['Total Supplies', filteredSupplies.length.toString()]
      ];

      autoTable(doc, {
        head: [metricsData[0]],
        body: metricsData.slice(1),
        startY: yPosition,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
        margin: { left: margin, right: margin }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 20;

      // Check if we need a new page
      if (yPosition > doc.internal.pageSize.height - 100) {
        doc.addPage();
        yPosition = margin;
      }

      // 1. Products Status Section
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Product Inventory Status', margin, yPosition);
      yPosition += 10;

      const productStatusData = [
        ['Product Name', 'Available Stock', 'Units Sold', 'Min Stock', 'Status'],
        ...products.map(product => {
          const soldQty = invoices.reduce((sum: number, invoice: any) => {
            const item = invoice.items?.find((item: any) => item.productId === product.id);
            return sum + (item ? item.quantity : 0);
          }, 0);
          
          const status = product.stock === 0 ? 'Out of Stock' : 
                        product.stock <= product.minStock ? 'Low Stock' : 'In Stock';
          
          return [
            product.name,
            product.stock.toString(),
            soldQty.toString(),
            product.minStock.toString(),
            status
          ];
        })
      ];

      autoTable(doc, {
        head: [productStatusData[0]],
        body: productStatusData.slice(1),
        startY: yPosition,
        theme: 'grid',
        headStyles: { fillColor: [139, 92, 246] },
        margin: { left: margin, right: margin }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 20;

      // Check if we need a new page
      if (yPosition > doc.internal.pageSize.height - 100) {
        doc.addPage();
        yPosition = margin;
      }

      // 2. Sales Data Section
      const filteredSalesData = generateSalesData().filter((_item: any) => {
        // For simplicity, include all months in the sales data as it's already historical
        return true;
      });
      
      if (filteredSalesData.length > 0) {
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Monthly Sales Performance', margin, yPosition);
        yPosition += 10;

        const salesTableData = [
          ['Month', 'Sales Count', 'Revenue', 'Profit'],
          ...filteredSalesData.map(item => [
            item.name,
            item.sales.toString(),
            `${currencySymbol}${item.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            `${currencySymbol}${item.profit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          ])
        ];

        autoTable(doc, {
          head: [salesTableData[0]],
          body: salesTableData.slice(1),
          startY: yPosition,
          theme: 'grid',
          headStyles: { fillColor: [16, 185, 129] },
          margin: { left: margin, right: margin }
        });

        yPosition = (doc as any).lastAutoTable.finalY + 20;
      }

      // Check if we need a new page
      if (yPosition > doc.internal.pageSize.height - 100) {
        doc.addPage();
        yPosition = margin;
      }

      // 3. Staff Performance Section
      if (staffPerformance.length > 0) {
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Staff Performance & Statistics', margin, yPosition);
        yPosition += 10;

        const staffTableData = [
          ['Staff Name', 'Sales Made', 'Target', 'Achievement %', 'Commission'],
          ...staffPerformance.map(staff => {
            const achievement = (staff.sales / staff.target) * 100;
            return [
              staff.name,
              staff.sales.toString(),
              staff.target.toString(),
              `${achievement.toFixed(1)}%`,
              `${currencySymbol}${staff.commission.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            ];
          })
        ];

        autoTable(doc, {
          head: [staffTableData[0]],
          body: staffTableData.slice(1),
          startY: yPosition,
          theme: 'grid',
          headStyles: { fillColor: [245, 158, 11] },
          margin: { left: margin, right: margin }
        });

        yPosition = (doc as any).lastAutoTable.finalY + 20;
      }

      // Check if we need a new page
      if (yPosition > doc.internal.pageSize.height - 100) {
        doc.addPage();
        yPosition = margin;
      }

      // 4. Supply Chain Summary
      if (filteredSupplies.length > 0) {
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Supply Chain Summary', margin, yPosition);
        yPosition += 10;

        const recentSupplies = filteredSupplies.slice(0, 10); // Show last 10 supplies
        const suppliesTableData = [
          ['Supplier', 'Product', 'Quantity', 'Cost', 'Status'],
          ...recentSupplies.map(supply => [
            supply.supplierName,
            supply.productName,
            supply.quantity.toString(),
            `${currencySymbol}${(supply.unitCost || supply.cost || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            supply.status.charAt(0).toUpperCase() + supply.status.slice(1)
          ])
        ];

        autoTable(doc, {
          head: [suppliesTableData[0]],
          body: suppliesTableData.slice(1),
          startY: yPosition,
          theme: 'grid',
          headStyles: { fillColor: [99, 102, 241] },
          margin: { left: margin, right: margin }
        });

        yPosition = (doc as any).lastAutoTable.finalY + 20;
      }

      // 5. Financial Summary
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Financial Summary', margin, yPosition);
      yPosition += 10;

      const totalCommissions = filteredStaffPerformance.reduce((sum, staff) => sum + staff.commission, 0);
      const inventoryValue = products.reduce((sum, product) => sum + (product.stock * product.cost), 0);

      const financialData = [
        ['Financial Metric', 'Amount'],
        ['Total Revenue', `${currencySymbol}${filteredTotalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        ['Total Supply Costs', `${currencySymbol}${filteredSupplyCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        ['Total Commissions', `${currencySymbol}${totalCommissions.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        ['Current Inventory Value', `${currencySymbol}${inventoryValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        ['Net Profit (Estimated)', `${currencySymbol}${(filteredTotalRevenue - filteredSupplyCost - totalCommissions).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]
      ];

      autoTable(doc, {
        head: [financialData[0]],
        body: financialData.slice(1),
        startY: yPosition,
        theme: 'grid',
        headStyles: { fillColor: [34, 197, 94] },
        margin: { left: margin, right: margin }
      });

      // Add footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(
          `Page ${i} of ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.height - 10,
          { align: 'center' }
        );
      }

      // Save the PDF
      const fileName = `${shopName.toLowerCase().replace(/\s+/g, '-')}-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      doc.save(fileName);
      
      console.log('PDF exported successfully:', fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
      showToast({ type: 'error', title: 'Export failed', message: 'Failed to generate PDF. Please try again.' });
    }
  };

  // Generate data based on real data
  const salesData = generateSalesData();
  const productData = generateProductData();
  const staffPerformance = generateStaffPerformance();
  const topProducts = generateTopProducts();

  // Calculate total stock value
  const totalStockValue = useMemo(() => {
    return products.reduce((sum, product) => sum + (product.stock * product.price), 0);
  }, [products]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Reports & Analytics</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-300">Comprehensive business insights and performance metrics</p>
        </div>
        <div className="flex space-x-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 3 months</option>
            <option value="365">Last year</option>
          </select>
          <button 
            onClick={exportToPDF}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Download size={20} />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{currencySymbol}{totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <p className="text-sm text-green-600 mt-1">From {totalSales} invoices</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign size={24} className="text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Sales</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{totalSales}</p>
              <p className="text-sm text-blue-600 mt-1">Total invoices created</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <TrendingUp size={24} className="text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Pending Invoices</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{pendingInvoices}</p>
              <p className="text-sm text-yellow-600 mt-1">
                {currencySymbol}{invoices.filter(i => i.status === 'pending').reduce((sum, i) => sum + i.total, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} pending
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <FileText size={24} className="text-yellow-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Active Products</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{activeProducts}</p>
              <p className="text-2xl font-bold text-purple-600">{currencySymbol}{totalStockValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Package size={24} className="text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Report Type Selector */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 dark:bg-gray-800 dark:border-gray-700">
        <div className="flex space-x-4">
          <button
            onClick={() => setReportType('sales')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              reportType === 'sales' 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100'
            }`}
          >
            Sales Report
          </button>
          <button
            onClick={() => setReportType('products')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              reportType === 'products' 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100'
            }`}
          >
            Product Analysis
          </button>
          <button
            onClick={() => setReportType('staff')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              reportType === 'staff' 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100'
            }`}
          >
            Staff Performance
          </button>
        </div>
      </div>

      {/* Charts Section */}
      {reportType === 'sales' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 dark:bg-gray-800 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Sales & Revenue Trend</h3>
            <div className="h-64 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="sales" stroke="#3B82F6" strokeWidth={2} />
                <Line type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 dark:bg-gray-800 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Monthly Profit</h3>
            <div className="h-64 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="profit" fill="#8B5CF6" />
              </BarChart>
            </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {reportType === 'products' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 dark:bg-gray-800 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Sales by Category</h3>
            <div className="h-64 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={productData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}%`}
                >
                  {productData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 dark:bg-gray-800 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Top Selling Products</h3>
            {topProducts.length > 0 ? (
              <div className="space-y-4">
                {topProducts.map((product, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-800">{product.name}</p>
                      <p className="text-sm text-gray-600">{product.sold} units sold</p>
                    </div>
                    <p className="font-semibold text-green-600">{currencySymbol}{product.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Package size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">No sales data available yet</p>
              </div>
            )}
          </div>
        </div>
      )}

      {reportType === 'staff' && (
        <div className="grid grid-cols-1 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Staff Performance & Commission</h3>
            {staffPerformance.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff Member</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sales Made</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Achievement</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commission</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {staffPerformance.map((staff, index) => {
                      const achievement = (staff.sales / staff.target) * 100;
                      return (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-blue-600 font-medium text-sm">
                                  {staff.name.split(' ').map(n => n[0]).join('')}
                                </span>
                              </div>
                              <div className="ml-4">
                                <p className="font-medium text-gray-800">{staff.name}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <p className="text-gray-800">{staff.sales}</p>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <p className="text-gray-800">{staff.target}</p>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                <div 
                                  className={`h-2 rounded-full ${achievement >= 100 ? 'bg-green-500' : achievement >= 75 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                  style={{ width: `${Math.min(achievement, 100)}%` }}
                                ></div>
                              </div>
                              <span className={`text-sm font-medium ${achievement >= 100 ? 'text-green-600' : achievement >= 75 ? 'text-yellow-600' : 'text-red-600'}`}>
                                {achievement.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <p className="font-semibold text-green-600">{currencySymbol}{staff.commission.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <Users size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">No staff members found</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;