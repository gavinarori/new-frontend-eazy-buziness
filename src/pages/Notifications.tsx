"use client"

import React, { useState } from "react"
import { Bell, Check, Trash2, AlertCircle, Info, CheckCircle, AlertTriangle } from "lucide-react"
import { format } from "date-fns"
import { useAuth } from "../contexts/AuthContext"
import { useAppDispatch, useAppSelector } from "../app/hooks"
import { fetchProducts } from "../features/products/productsSlice"
import { fetchSupplies } from "../features/supplies/suppliesSlice"
import { fetchInvoices } from "../features/invoices/invoicesSlice"

interface Notification {
  id: string
  title: string
  message: string
  type: "info" | "success" | "warning" | "error"
  read: boolean
  createdAt: Date
}

const Notifications: React.FC = () => {
  const { userData } = useAuth()
  const dispatch = useAppDispatch()
  const products = useAppSelector(s => s.products.items)
  const invoices = useAppSelector(s => s.invoices.items as any[])
  const supplies = useAppSelector(s => s.supplies.items as any[])
  const loading = useAppSelector(s => s.products.loading || s.invoices.loading || s.supplies.loading)
  const shops = useAppSelector(s => s.shops.items as any[])
  const [filter, setFilter] = useState("all")

  React.useEffect(() => {
    dispatch(fetchProducts({ shopId: userData?.role === 'super_admin' ? undefined : userData?.shopId } as any))
    dispatch(fetchInvoices({} as any))
    dispatch(fetchSupplies({} as any))
  }, [dispatch, userData?.role, userData?.shopId])

  const generateNotifications = (): Notification[] => {
    const notifications: Notification[] = []
    let notificationId = 1

    // Filter data based on user role
    let filteredProducts = products
    let filteredInvoices = invoices
    let filteredSupplies = supplies

    // For super admin, include all registered businesses
    if (userData?.role === "super_admin") {
      const registeredShops = shops.filter((shop) => shop.isActive === true)

      // Filter data to only include items from registered businesses
      filteredProducts = products.filter((product) => registeredShops.some((shop) => shop.id === product.shopId))
      filteredInvoices = invoices.filter((invoice) => registeredShops.some((shop) => shop.id === invoice.shopId))
      filteredSupplies = supplies.filter((supply) => registeredShops.some((shop) => shop.id === supply.shopId))
    }

    // Low stock alerts
    const lowStockProducts = filteredProducts.filter(
      (product) => product.stock <= product.minStock && product.stock > 0,
    )
    lowStockProducts.forEach((product) => {
      const shopName =
        userData?.role === "super_admin" ? shops.find((shop) => shop.id === product.shopId)?.name || "Unknown Shop" : ""
      const shopPrefix = userData?.role === "super_admin" ? `[${shopName}] ` : ""

      notifications.push({
        id: `low-stock-${notificationId++}`,
        title: "Low Stock Alert",
        message: `${shopPrefix}${product.name} is running low (${product.stock} units remaining). Minimum stock level is ${product.minStock} units.`,
        type: "warning",
        read: false,
        createdAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
      })
    })

    // Out of stock alerts
    const outOfStockProducts = filteredProducts.filter((product) => product.stock === 0)
    outOfStockProducts.forEach((product) => {
      const shopName =
        userData?.role === "super_admin" ? shops.find((shop) => shop.id === product.shopId)?.name || "Unknown Shop" : ""
      const shopPrefix = userData?.role === "super_admin" ? `[${shopName}] ` : ""

      notifications.push({
        id: `out-of-stock-${notificationId++}`,
        title: "Out of Stock Alert",
        message: `${shopPrefix}${product.name} is completely out of stock. Immediate restocking required.`,
        type: "error",
        read: false,
        createdAt: new Date(Date.now() - Math.random() * 12 * 60 * 60 * 1000),
      })
    })

    // Recent paid invoices
    const paidInvoices = filteredInvoices
      .filter((invoice) => invoice.status === "paid" && invoice.paidAt)
      .sort((a, b) => {
        const dateA = a.paidAt instanceof Date ? a.paidAt : new Date(a.paidAt!)
        const dateB = b.paidAt instanceof Date ? b.paidAt : new Date(b.paidAt!)
        return dateB.getTime() - dateA.getTime()
      })
      .slice(0, 5)

    paidInvoices.forEach((invoice) => {
      const paidDate = invoice.paidAt instanceof Date ? invoice.paidAt : new Date(invoice.paidAt!)
      const shopName =
        userData?.role === "super_admin" ? shops.find((shop) => shop.id === invoice.shopId)?.name || "Unknown Shop" : ""
      const shopPrefix = userData?.role === "super_admin" ? `[${shopName}] ` : ""

      notifications.push({
        id: `payment-${notificationId++}`,
        title: "Invoice Payment Received",
        message: `${shopPrefix}Invoice ${invoice.invoiceNumber} has been paid by ${invoice.customerName} ($${invoice.total.toFixed(2)}).`,
        type: "success",
        read: Math.random() > 0.3,
        createdAt: paidDate,
      })
    })

    // Overdue invoices
    const overdueInvoices = filteredInvoices.filter((invoice) => {
      const dueDate = invoice.dueDate instanceof Date ? invoice.dueDate : new Date(invoice.dueDate)
      return invoice.status === "pending" && dueDate < new Date()
    })

    overdueInvoices.forEach((invoice) => {
      const dueDate = invoice.dueDate instanceof Date ? invoice.dueDate : new Date(invoice.dueDate)
      const daysOverdue = Math.floor((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
      const shopName =
        userData?.role === "super_admin" ? shops.find((shop) => shop.id === invoice.shopId)?.name || "Unknown Shop" : ""
      const shopPrefix = userData?.role === "super_admin" ? `[${shopName}] ` : ""

      notifications.push({
        id: `overdue-${notificationId++}`,
        title: "Overdue Invoice",
        message: `${shopPrefix}Invoice ${invoice.invoiceNumber} from ${invoice.customerName} is ${daysOverdue} day(s) overdue ($${invoice.total.toFixed(2)}).`,
        type: "error",
        read: false,
        createdAt: new Date(dueDate.getTime() + 24 * 60 * 60 * 1000),
      })
    })

    // Recent supply deliveries
    const recentSupplies = filteredSupplies
      .filter((supply) => supply.status === "received")
      .sort((a, b) => {
        const dateA = a.receivedAt instanceof Date ? a.receivedAt : new Date(a.receivedAt)
        const dateB = b.receivedAt instanceof Date ? b.receivedAt : new Date(b.receivedAt)
        return dateB.getTime() - dateA.getTime()
      })
      .slice(0, 3)

    recentSupplies.forEach((supply) => {
      const receivedDate = supply.receivedAt instanceof Date ? supply.receivedAt : new Date(supply.receivedAt)
      const shopName =
        userData?.role === "super_admin" ? shops.find((shop) => shop.id === supply.shopId)?.name || "Unknown Shop" : ""
      const shopPrefix = userData?.role === "super_admin" ? `[${shopName}] ` : ""

      notifications.push({
        id: `supply-${notificationId++}`,
        title: "Supply Delivery Received",
        message: `${shopPrefix}New supply delivery received from ${supply.supplierName}: ${supply.quantity} units of ${supply.productName}.`,
        type: "info",
        read: Math.random() > 0.5,
        createdAt: receivedDate,
      })
    })

    // High value recent invoices
    const highValueInvoices = filteredInvoices
      .filter((invoice) => invoice.total > 500)
      .sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt)
        const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt)
        return dateB.getTime() - dateA.getTime()
      })
      .slice(0, 3)

    highValueInvoices.forEach((invoice) => {
      const createdDate = invoice.createdAt instanceof Date ? invoice.createdAt : new Date(invoice.createdAt)
      const shopName =
        userData?.role === "super_admin" ? shops.find((shop) => shop.id === invoice.shopId)?.name || "Unknown Shop" : ""
      const shopPrefix = userData?.role === "super_admin" ? `[${shopName}] ` : ""

      notifications.push({
        id: `high-value-${notificationId++}`,
        title: "High Value Invoice Created",
        message: `${shopPrefix}High value invoice ${invoice.invoiceNumber} created for ${invoice.customerName} ($${invoice.total.toFixed(2)}).`,
        type: "info",
        read: Math.random() > 0.4,
        createdAt: createdDate,
      })
    })

    // Sort all notifications by creation date (newest first)
    return notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  const [notifications, setNotifications] = useState<Notification[]>([])

  // Generate notifications when data is loaded
  React.useEffect(() => {
    if (!loading && products.length > 0) {
      const generatedNotifications = generateNotifications()
      setNotifications(generatedNotifications)
    }
  }, [loading, products, invoices, supplies, shops, userData?.role])

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle size={20} className="text-green-600" />
      case "warning":
        return <AlertTriangle size={20} className="text-yellow-600" />
      case "error":
        return <AlertCircle size={20} className="text-red-600" />
      default:
        return <Info size={20} className="text-blue-600" />
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "success":
        return "border-l-green-500 bg-green-50"
      case "warning":
        return "border-l-yellow-500 bg-yellow-50"
      case "error":
        return "border-l-red-500 bg-red-50"
      default:
        return "border-l-blue-500 bg-blue-50"
    }
  }

  const markAsRead = (id: string) => {
    setNotifications(notifications.map((notif) => (notif.id === id ? { ...notif, read: true } : notif)))
  }

  const markAllAsRead = () => {
    setNotifications(notifications.map((notif) => ({ ...notif, read: true })))
  }

  const deleteNotification = (id: string) => {
    setNotifications(notifications.filter((notif) => notif.id !== id))
  }

  const filteredNotifications = notifications.filter((notif) => {
    if (filter === "unread") return !notif.read
    if (filter === "read") return notif.read
    return true
  })

  const unreadCount = notifications.filter((n) => !n.read).length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Notifications</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-300">
            {userData?.role === "super_admin"
              ? "Stay updated with alerts from all registered businesses"
              : "Stay updated with important business alerts and updates"}
            {unreadCount > 0 && (
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                {unreadCount} unread
              </span>
            )}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Check size={20} />
            <span>Mark All Read</span>
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{notifications.length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Bell size={24} className="text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Unread</p>
              <p className="text-2xl font-bold text-red-600">{unreadCount}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertCircle size={24} className="text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Warnings</p>
              <p className="text-2xl font-bold text-yellow-600">
                {notifications.filter((n) => n.type === "warning").length}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <AlertTriangle size={24} className="text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Success</p>
              <p className="text-2xl font-bold text-green-600">
                {notifications.filter((n) => n.type === "success").length}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle size={24} className="text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 dark:bg-gray-800 dark:border-gray-700">
        <div className="flex space-x-4">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === "all" ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100"
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === "unread" ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100"
            }`}
          >
            Unread ({unreadCount})
          </button>
          <button
            onClick={() => setFilter("read")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === "read" ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100"
            }`}
          >
            Read ({notifications.length - unreadCount})
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-4">
        {filteredNotifications.map((notification) => (
          <div
            key={notification.id}
            className={`bg-white rounded-lg shadow-sm border-l-4 ${getNotificationColor(notification.type)} ${
              !notification.read ? "border-r-4 border-r-blue-500" : ""
            } overflow-hidden`}
          >
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <div className="flex-shrink-0 mt-1">{getNotificationIcon(notification.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className={`text-lg font-semibold ${!notification.read ? "text-gray-900 dark:text-gray-600" : "text-gray-700 dark:text-gray-700"}`}>
                        {notification.title}
                      </h3>
                      {!notification.read && <span className="w-2 h-2 bg-blue-500 rounded-full"></span>}
                    </div>
                    <p className={`${!notification.read ? "text-gray-800 dark:text-gray-600" : "text-gray-600 dark:text-gray-700"} mb-2`}>
                      {notification.message}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {format(notification.createdAt, "MMM dd, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  {!notification.read && (
                    <button
                      onClick={() => markAsRead(notification.id)}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Mark as read"
                    >
                      <Check size={18} />
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(notification.id)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    title="Delete notification"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredNotifications.length === 0 && (
        <div className="text-center py-12">
          <Bell size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-800 mb-2">No notifications found</h3>
          <p className="text-gray-600">
            {filter === "unread"
              ? "You're all caught up! No unread notifications."
              : filter === "read"
                ? "No read notifications to display."
                : userData?.role === "super_admin"
                  ? "No notifications from registered businesses."
                  : "You don't have any notifications yet."}
          </p>
        </div>
      )}
    </div>
  )
}

export default Notifications
