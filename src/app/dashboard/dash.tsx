"use client"

import { useMemo } from "react"
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
  TrendingUp,
  Activity,
} from "lucide-react"
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from "date-fns"
import { useAuth } from "@/hooks/useApi"
import { useProducts, useInvoices, useUsers, useShops, useSales } from "@/hooks/useApi"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"

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

  const currency = "KSH"

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
  const pendingUsers = (allUsers || []).filter((user: any) => user.role === "customer")
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
      const category = product.categoryId || "Uncategorized"
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
    (invoices || []).reduce((sum, invoice) => sum + invoice.total, 0) +
    (sales || []).reduce((sum, sale) => sum + sale.total, 0)
  const totalProducts = (products || []).length
  const totalInvoices = (invoices || []).length
  const totalSales = (sales || []).length
  const totalStaff = (users || []).filter((user: any) => user.role === "seller").length
  const lowStockItems = (products || []).filter((product) => product.stock <= 5).length
  const pendingInvoices = (invoices || []).filter(
    (invoice) => invoice.status === "draft" || invoice.status === "sent",
  ).length

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

  if (loading) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-96" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
          {isSuper ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Super Admin Dashboard</h1>
                <p className="text-muted-foreground">Manage business onboarding and system-wide operations</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Total Businesses</p>
                        <p className="text-2xl font-bold">{allShops?.length || 0}</p>
                        <Badge variant="secondary" className="mt-1">
                          {activeShops.length} active
                        </Badge>
                      </div>
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <Building2 className="h-6 w-6 text-primary" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Pending Onboarding</p>
                        <p className="text-2xl font-bold text-orange-600">{pendingShops.length}</p>
                        <Badge variant="outline" className="mt-1 border-orange-600 text-orange-600">
                          Awaiting approval
                        </Badge>
                      </div>
                      <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                        <Clock className="h-6 w-6 text-orange-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                        <p className="text-2xl font-bold">{allUsers?.length || 0}</p>
                        <Badge
                          variant="secondary"
                          className="mt-1 bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                        >
                          {activeUsers.length} active
                        </Badge>
                      </div>
                      <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                        <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Pending Users</p>
                        <p className="text-2xl font-bold text-red-600">{pendingUsers.length}</p>
                        <Badge variant="outline" className="mt-1 border-red-600 text-red-600">
                          Need activation
                        </Badge>
                      </div>
                      <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">
                        <UserCheck className="h-6 w-6 text-red-600 dark:text-red-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {pendingShops.length > 0 && (
                <Alert
                  variant="default"
                  className="border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-900"
                >
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <AlertTitle className="text-orange-800 dark:text-orange-200">
                    Businesses Awaiting Onboarding
                  </AlertTitle>
                  <AlertDescription className="text-orange-700 dark:text-orange-300">
                    {pendingShops.length} business(es) have registered and are waiting for approval
                  </AlertDescription>
                </Alert>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Pending Business Onboarding</CardTitle>
                  <CardDescription>Review and approve new business registrations</CardDescription>
                </CardHeader>
                <CardContent>
                  {pendingShops.length > 0 ? (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Business Name</TableHead>
                            <TableHead>Admin</TableHead>
                            <TableHead>Registered</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pendingShops.map((shop) => {
                            const admin = (allUsers || []).find((user: any) => user.shopId === shop.id)
                            return (
                              <TableRow key={shop.id}>
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10">
                                      <AvatarFallback className="bg-primary/10">
                                        <Building2 className="h-5 w-5 text-primary" />
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <p className="font-medium">{shop.name}</p>
                                      <p className="text-sm text-muted-foreground">
                                        {shop.description || "No description"}
                                      </p>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {admin ? (
                                    <div>
                                      <p className="font-medium">{(admin as any).name}</p>
                                      <p className="text-sm text-muted-foreground">{(admin as any).email}</p>
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground">No admin assigned</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {format(new Date(shop.createdAt), "MMM dd, yyyy")}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {shop.description || "No location"}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button size="sm" variant="outline">
                                    <Settings className="h-4 w-4 mr-2" />
                                    Manage
                                  </Button>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="rounded-full bg-muted p-4 mb-4">
                        <Building2 className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground">No businesses pending onboarding</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Pending User Approvals</CardTitle>
                  <CardDescription>Review and activate new user accounts</CardDescription>
                </CardHeader>
                <CardContent>
                  {pendingUsers.length > 0 ? (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Business</TableHead>
                            <TableHead>Registered</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pendingUsers.map((user: any) => {
                            const userShop = (allShops || []).find((shop) => shop.id === user.shopId)
                            return (
                              <TableRow key={user.id}>
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <Avatar>
                                      <AvatarFallback>
                                        {user?.name
                                          ? user.name
                                              .split(" ")
                                              .map((n: string) => n[0])
                                              .join("")
                                          : "?"}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <p className="font-medium">{user.name}</p>
                                      <p className="text-sm text-muted-foreground">{user.email}</p>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="secondary" className="capitalize">
                                    {user.role.replace("_", " ")}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {userShop ? userShop.name : "No business assigned"}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {format(new Date(user.createdAt), "MMM dd, yyyy")}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button size="sm" className="bg-green-600 hover:bg-green-700">
                                    <UserCheck className="h-4 w-4 mr-2" />
                                    Approve
                                  </Button>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="rounded-full bg-muted p-4 mb-4">
                        <UserCheck className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground">No users pending approval</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                <p className="text-muted-foreground">Welcome back! Here's what's happening with your business.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                        <p className="text-2xl font-bold">
                          {currencySymbol}
                          {totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                        <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Products</p>
                        <p className="text-2xl font-bold">{totalProducts.toLocaleString()}</p>
                      </div>
                      <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                        <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Invoices</p>
                        <p className="text-2xl font-bold">{totalInvoices.toLocaleString()}</p>
                      </div>
                      <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                        <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Quick Sales</p>
                        <p className="text-2xl font-bold">{totalSales.toLocaleString()}</p>
                      </div>
                      <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                        <ShoppingCart className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Staff Members</p>
                        <p className="text-2xl font-bold">{totalStaff.toLocaleString()}</p>
                      </div>
                      <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                        <Users className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {(lowStockItems > 0 || pendingInvoices > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {lowStockItems > 0 && (
                    <Alert
                      variant="default"
                      className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-900"
                    >
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <AlertTitle className="text-yellow-800 dark:text-yellow-200">Low Stock Alert</AlertTitle>
                      <AlertDescription className="text-yellow-700 dark:text-yellow-300">
                        {lowStockItems} product(s) are running low on stock
                      </AlertDescription>
                    </Alert>
                  )}

                  {pendingInvoices > 0 && (
                    <Alert
                      variant="default"
                      className="border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-900"
                    >
                      <Clock className="h-4 w-4 text-blue-600" />
                      <AlertTitle className="text-blue-800 dark:text-blue-200">Pending Invoices</AlertTitle>
                      <AlertDescription className="text-blue-700 dark:text-blue-300">
                        {pendingInvoices} invoice(s) are pending payment
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      Sales & Revenue Trend
                    </CardTitle>
                    <CardDescription>Last 6 months performance overview</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 sm:h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={salesData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="name" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                          <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                          <RechartsTooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px",
                            }}
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
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-primary" />
                      Product Categories
                    </CardTitle>
                    <CardDescription>Distribution by category value</CardDescription>
                  </CardHeader>
                  <CardContent>
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
                          <RechartsTooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px",
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Payments</CardTitle>
                    <CardDescription>Latest paid invoices</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {recentInvoices.length > 0 ? (
                        recentInvoices.map((invoice, index) => (
                          <div key={invoice.id}>
                            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarFallback className="bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                                    <DollarSign className="h-5 w-5" />
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{invoice.customerName}</p>
                                  <p className="text-sm text-muted-foreground">Invoice #{invoice.id.slice(-8)}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-green-600 dark:text-green-400">
                                  {currencySymbol}
                                  {invoice.total.toLocaleString("en-US", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {format(new Date(invoice.createdAt), "MMM dd")}
                                </p>
                              </div>
                            </div>
                            {index < recentInvoices.length - 1 && <Separator className="my-2" />}
                          </div>
                        ))
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <div className="rounded-full bg-muted p-4 mb-4">
                            <FileText className="h-8 w-8 text-muted-foreground" />
                          </div>
                          <p className="text-muted-foreground">No recent payments</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Recent Products</CardTitle>
                    <CardDescription>Newly added inventory</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {recentProducts.length > 0 ? (
                        recentProducts.map((product, index) => (
                          <div key={product.id}>
                            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10 rounded-lg">
                                  <AvatarImage
                                    src={
                                      product.images?.[0]?.url ||
                                      "https://images.pexels.com/photos/3394659/pexels-photo-3394659.jpeg?auto=compress&cs=tinysrgb&w=50" ||
                                      "/placeholder.svg"
                                    }
                                    alt={product.name}
                                    className="object-cover"
                                  />
                                  <AvatarFallback className="rounded-lg">
                                    <Package className="h-5 w-5" />
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="font-medium truncate">{product.name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {product.categoryId || "Uncategorized"}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-primary">
                                  {currencySymbol}
                                  {product.price.toLocaleString("en-US", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </p>
                                <Badge variant="secondary" className="text-xs">
                                  {product.stock} in stock
                                </Badge>
                              </div>
                            </div>
                            {index < recentProducts.length - 1 && <Separator className="my-2" />}
                          </div>
                        ))
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <div className="rounded-full bg-muted p-4 mb-4">
                            <Package className="h-8 w-8 text-muted-foreground" />
                          </div>
                          <p className="text-muted-foreground">No products added yet</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
