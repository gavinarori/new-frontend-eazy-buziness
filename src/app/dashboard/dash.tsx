import React, { useMemo } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import {
  DollarSign,
  Users,
  Package,
  FileText,
  ShoppingCart,
  AlertTriangle,
  Clock,
  Building2,
  UserCheck,
  Settings,
} from "lucide-react"
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from "date-fns"
import { useAuth } from "@/hooks/useApi"
import { useProducts, useInvoices, useUsers, useShops, useSales } from "@/hooks/useApi"

export default function Page() {
  const { user, loading: authLoading } = useAuth()

  const currentShopId = user?.shopId
  const isSuper = user?.role === "superadmin"

  const { data: products, loading: productsLoading } = useProducts(currentShopId)
  const { data: invoices, loading: invoicesLoading } = useInvoices(currentShopId)
  const { data: sales, loading: salesLoading } = useSales(currentShopId)
  const { data: users, loading: usersLoading } = useUsers(currentShopId)

  const { data: allShops } = useShops()
  const { data: allUsers } = useUsers()

  const loading = authLoading || productsLoading || invoicesLoading || salesLoading || usersLoading

  const currency = "KSH" // Default currency since it's not in the current shop model

  const getCurrencySymbol = (c: string) => {
    switch (c) {
      case "USD":
        return "$"
      case "EUR":
        return "€"
      case "GBP":
        return "£"
      case "KSH":
        return "KSh"
      case "JPY":
        return "¥"
      default:
        return "$"
    }
  }

  const currencySymbol = getCurrencySymbol(currency)

  const pendingShops = allShops?.filter((shop) => shop.status === "pending") || []
  const activeShops = allShops?.filter((shop) => shop.status === "approved") || []
  const pendingUsers = (allUsers || []).filter((user: any) => user.role === "customer") // Assuming customers need approval
  const activeUsers = (allUsers || []).filter((user: any) => user.role !== "customer")

  const salesData = useMemo(() => {
    if (isSuper) return []

    const months = eachMonthOfInterval({
      start: subMonths(new Date(), 5),
      end: new Date(),
    })

    return months.map((month) => {
      const monthStart = startOfMonth(month)
      const monthEnd = endOfMonth(month)

      const monthInvoices = (invoices || []).filter((invoice) => {
        const invoiceDate = new Date(invoice.createdAt)
        return invoiceDate >= monthStart && invoiceDate <= monthEnd
      })

      const monthSales = (sales || []).filter((sale) => {
        const saleDate = new Date(sale.createdAt)
        return saleDate >= monthStart && saleDate <= monthEnd
      })

      const totalSales = monthInvoices.length + monthSales.length
      const totalRevenue =
        monthInvoices.reduce((sum, invoice) => sum + invoice.total, 0) +
        monthSales.reduce((sum, sale) => sum + sale.total, 0)

      return {
        name: format(month, "MMM"),
        sales: totalSales,
        revenue: Math.round(totalRevenue),
      }
    })
  }, [invoices, sales, isSuper])

  const categoryData = useMemo(() => {
    if (isSuper) return []

    const categoryStats = (products || []).reduce((acc: Record<string, { count: number; value: number }>, product) => {
      const category = product.categoryId || "Uncategorized" // Using categoryId since we don't have category name directly
      if (!acc[category]) {
        acc[category] = { count: 0, value: 0 }
      }
      acc[category].count += 1
      acc[category].value += product.stock * product.price
      return acc
    }, {})

    const colors = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"]
    const totalValue = Object.values(categoryStats).reduce((sum, cat) => sum + cat.value, 0)

    return Object.entries(categoryStats).map(([name, stats], index) => ({
      name,
      value: totalValue > 0 ? Math.round((stats.value / totalValue) * 100) : 0,
      color: colors[index % colors.length],
    }))
  }, [products, isSuper])

  const totalRevenue =
    (invoices || []).reduce((sum, invoice) => sum + invoice.total, 0) + (sales || []).reduce((sum, sale) => sum + sale.total, 0)
  const totalProducts = (products || []).length
  const totalInvoices = (invoices || []).length
  const totalSales = (sales || []).length
  const totalStaff = (users || []).filter((user: any) => user.role === "seller").length // Using 'seller' instead of 'staff'
  const lowStockItems = (products || []).filter((product) => product.stock <= 5).length // Using 5 as default low stock threshold
  const pendingInvoices = (invoices || []).filter((invoice) => invoice.status === "draft" || invoice.status === "sent").length

  const recentInvoices = useMemo(() => {
    if (isSuper) return []

    return (invoices || [])
      .filter((invoice) => invoice.status === "paid")
      .sort((a, b) => {
        const dateA = new Date(a.createdAt)
        const dateB = new Date(b.createdAt)
        return dateB.getTime() - dateA.getTime()
      })
      .slice(0, 5)
  }, [invoices, isSuper])

  const recentProducts = useMemo(() => {
    if (isSuper) return []

    return (products || [])
      .sort((a, b) => {
        const dateA = new Date(a.createdAt)
        const dateB = new Date(b.createdAt)
        return dateB.getTime() - dateA.getTime()
      })
      .slice(0, 5)
  }, [products, isSuper])

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
                </div>
              ) : isSuper ? (
                <div className="space-y-6">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Super Admin Dashboard</h1>
                    <p className="mt-1 text-gray-600 dark:text-gray-400">
                      Manage business onboarding and system-wide operations
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Businesses</p>
                          <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{allShops?.length || 0}</p>
                          <p className="text-sm text-blue-600 mt-1">{activeShops.length} active</p>
                        </div>
                        <div className="p-3 bg-blue-100 rounded-lg">
                          <Building2 size={24} className="text-blue-600" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Onboarding</p>
                          <p className="text-2xl font-bold text-orange-600">{pendingShops.length}</p>
                          <p className="text-sm text-orange-600 mt-1">Awaiting approval</p>
                        </div>
                        <div className="p-3 bg-orange-100 rounded-lg">
                          <Clock size={24} className="text-orange-600" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Users</p>
                          <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{allUsers?.length || 0}</p>
                          <p className="text-sm text-green-600 mt-1">{activeUsers.length} active</p>
                        </div>
                        <div className="p-3 bg-green-100 rounded-lg">
                          <Users size={24} className="text-green-600" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Users</p>
                          <p className="text-2xl font-bold text-red-600">{pendingUsers.length}</p>
                          <p className="text-sm text-red-600 mt-1">Need activation</p>
                        </div>
                        <div className="p-3 bg-red-100 rounded-lg">
                          <UserCheck size={24} className="text-red-600" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {pendingShops.length > 0 && (
                    <div className="bg-orange-50 dark:bg-orange-900 border border-orange-200 dark:border-orange-700 rounded-lg p-4">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle size={20} className="text-orange-600" />
                        <h3 className="font-medium text-orange-800 dark:text-orange-200">Businesses Awaiting Onboarding</h3>
                      </div>
                      <p className="text-orange-700 dark:text-orange-300 mt-1">
                        {pendingShops.length} business(es) have registered and are waiting for approval
                      </p>
                    </div>
                  )}

                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Pending Business Onboarding</h3>
                    {pendingShops.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-100 dark:border-gray-600">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Business Name
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Admin
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Registered
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Location
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-600">
                            {pendingShops.map((shop) => {
                              const admin = (allUsers || []).find((user: any) => user.shopId === shop.id)
                              return (
                                <tr key={shop.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                        <Building2 size={20} className="text-blue-600" />
                                      </div>
                                      <div className="ml-4">
                                        <p className="font-medium text-gray-800 dark:text-gray-200">{shop.name}</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">{shop.description || "No description"}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    {admin ? (
                                      <div>
                                        <p className="font-medium text-gray-800 dark:text-gray-200">{(admin as any).name}</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">{(admin as any).email}</p>
                                      </div>
                                    ) : (
                                      <span className="text-gray-500 dark:text-gray-400">No admin assigned</span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                                    {format(new Date(shop.createdAt), "MMM dd, yyyy")}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">{shop.description || "No location"}</td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors flex items-center space-x-1">
                                      <Settings size={14} />
                                      <span>Manage</span>
                                    </button>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Building2 size={48} className="mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-600 dark:text-gray-400">No businesses pending onboarding</p>
                      </div>
                    )}
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Pending User Approvals</h3>
                    {pendingUsers.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-100 dark:border-gray-600">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                User
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Role
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Business
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Registered
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-600">
                            {pendingUsers.map((user: any) => {
                              const userShop = (allShops || []).find((shop) => shop.id === user.shopId)
                              return (
                                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                        <span className="text-gray-600 font-medium text-sm">
                                          {user?.name ? user.name.split(" ").map((n: string) => n[0]).join("") : "?"}
                                        </span>
                                      </div>
                                      <div className="ml-4">
                                        <p className="font-medium text-gray-800 dark:text-gray-200">{user.name}</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">{user.email}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 capitalize">
                                      {user.role.replace("_", " ")}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                                    {userShop ? userShop.name : "No business assigned"}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                                    {format(new Date(user.createdAt), "MMM dd, yyyy")}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <button className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors flex items-center space-x-1">
                                      <UserCheck size={14} />
                                      <span>Approve</span>
                                    </button>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <UserCheck size={48} className="mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-600 dark:text-gray-400">No users pending approval</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Dashboard</h1>
                    <p className="mt-1 text-gray-600 dark:text-gray-400">
                      Welcome back! Here's what's happening with your business.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenue</p>
                          <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                            {currencySymbol}
                            {totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div className="p-3 bg-green-100 rounded-lg">
                          <DollarSign size={24} className="text-green-600" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Products</p>
                          <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{totalProducts.toLocaleString()}</p>
                        </div>
                        <div className="p-3 bg-blue-100 rounded-lg">
                          <Package size={24} className="text-blue-600" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Invoices</p>
                          <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{totalInvoices.toLocaleString()}</p>
                        </div>
                        <div className="p-3 bg-purple-100 rounded-lg">
                          <FileText size={24} className="text-purple-600" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Quick Sales</p>
                          <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{totalSales.toLocaleString()}</p>
                        </div>
                        <div className="p-3 bg-green-100 rounded-lg">
                          <ShoppingCart size={24} className="text-green-600" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Staff Members</p>
                          <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{totalStaff.toLocaleString()}</p>
                        </div>
                        <div className="p-3 bg-orange-100 rounded-lg">
                          <Users size={24} className="text-orange-600" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {(lowStockItems > 0 || pendingInvoices > 0) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {lowStockItems > 0 && (
                        <div className="bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
                          <div className="flex items-center space-x-2">
                            <AlertTriangle size={20} className="text-yellow-600" />
                            <h3 className="font-medium text-yellow-800 dark:text-yellow-200">Low Stock Alert</h3>
                          </div>
                          <p className="text-yellow-700 dark:text-yellow-300 mt-1">{lowStockItems} product(s) are running low on stock</p>
                        </div>
                      )}

                      {pendingInvoices > 0 && (
                        <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                          <div className="flex items-center space-x-2">
                            <Clock size={20} className="text-blue-600" />
                            <h3 className="font-medium text-blue-800 dark:text-blue-200">Pending Invoices</h3>
                          </div>
                          <p className="text-blue-700 dark:text-blue-300 mt-1">{pendingInvoices} invoice(s) are pending payment</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Sales & Revenue Trend</h3>
                      <div className="h-64 sm:h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={salesData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <RechartsTooltip
                              formatter={(value: any, name: any) => [
                                name === "revenue" ? `${currencySymbol}${Number(value).toLocaleString()}` : value,
                                name === "revenue" ? "Revenue" : "Sales",
                              ]}
                            />
                            <Line type="monotone" dataKey="sales" stroke="#3B82F6" strokeWidth={2} name="sales" />
                            <Line type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2} name="revenue" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Product Categories</h3>
                      <div className="h-64 sm:h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={categoryData}
                              cx="50%"
                              cy="50%"
                              outerRadius={100}
                              fill="#8884d8"
                              dataKey="value"
                              label={({ name, value }) => `${name}: ${value}%`}
                            >
                              {categoryData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <RechartsTooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Recent Payments</h3>
                      <div className="space-y-4">
                        {recentInvoices.length > 0 ? (
                          recentInvoices.map((invoice) => (
                            <div key={invoice.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                              <div>
                                <p className="font-medium text-gray-800 dark:text-gray-200">{invoice.customerName}</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Invoice #{invoice.id.slice(-8)}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-green-600">
                                  {currencySymbol}
                                  {invoice.total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {format(new Date(invoice.createdAt), "MMM dd")}
                                </p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-gray-600 dark:text-gray-400 text-center py-4">No recent payments</p>
                        )}
                      </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Recent Products</h3>
                      <div className="space-y-4">
                        {recentProducts.length > 0 ? (
                          recentProducts.map((product) => (
                            <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                              <div className="flex items-center space-x-3">
                                <img
                                  src={product.images?.[0]?.url || "https://images.pexels.com/photos/3394659/pexels-photo-3394659.jpeg?auto=compress&cs=tinysrgb&w=50"}
                                  alt={product.name}
                                  className="w-10 h-10 rounded-lg object-cover"
                                />
                                  <div>
                                    <p className="font-medium text-gray-800 dark:text-gray-200 truncate">{product.name}</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{product.categoryId || "Uncategorized"}</p>
                                  </div>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-blue-600">
                                  {currencySymbol}
                                  {product.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{product.stock} in stock</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-gray-600 dark:text-gray-400 text-center py-4">No products added yet</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
