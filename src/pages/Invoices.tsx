"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import {
  Plus,
  Search,
  Eye,
  Edit,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Save,
  X,
  Trash2,
  ShoppingCart,
  CreditCard,
  Banknote,
  Smartphone,
  Download,
} from "lucide-react"
import { format } from "date-fns"
import { useForm, useFieldArray } from "react-hook-form"
import { useAuth } from "../contexts/AuthContext"
import { useAppDispatch, useAppSelector } from "../app/hooks"
import { fetchInvoices, createInvoiceThunk, updateInvoiceStatus } from "../features/invoices/invoicesSlice"
import { fetchProducts } from "../features/products/productsSlice"
import { fetchShops } from "../features/shops/shopsSlice"
import { invoicesApi, productsApi } from "../services/apiClient"
import type { Invoice, InvoiceItem, SaleItem } from "../types"
import { jsPDF } from "jspdf"
import { useDialog } from "../contexts/DialogContext"
import { useToast } from "../contexts/ToastContext"

interface InvoiceFormData {
  customerName: string
  customerEmail: string
  dueDate: string
  items: {
    productId: string
    quantity: number
    price: number
  }[]
}

interface SaleFormData {
  customerName?: string
  paymentMethod: "cash" | "card" | "mobile" | "bank_transfer"
  items: {
    productId: string
    quantity: number
    price: number
  }[]
}

// PDF Generation Utility
const generateInvoicePDF = (invoice: Invoice, shopInfo: any, currencySymbol: string) => {
  if (!jsPDF) {
    console.error("jsPDF not loaded")
    // Fallback toast handled in caller
    return
  }

  const doc = new jsPDF()

  // Set font
  doc.setFont("helvetica")

  // Header
  doc.setFontSize(20)
  doc.setTextColor(51, 51, 51)
  doc.text(shopInfo?.name || "Your Business", 20, 30)

  doc.setFontSize(12)
  doc.setTextColor(102, 102, 102)
  doc.text(shopInfo?.address || "Business Address", 20, 40)
  doc.text(shopInfo?.phone || "Business Phone", 20, 50)

  // Invoice title and number
  doc.setFontSize(24)
  doc.setTextColor(37, 99, 235)
  doc.text("INVOICE", 140, 30)

  doc.setFontSize(12)
  doc.setTextColor(51, 51, 51)
  doc.text(`Invoice #: ${invoice.invoiceNumber}`, 140, 45)
  doc.text(`Date: ${format(invoice.createdAt, "MMM dd, yyyy")}`, 140, 55)
  doc.text(`Due Date: ${format(invoice.dueDate, "MMM dd, yyyy")}`, 140, 65)

  // Status badge
  const statusColors = {
    paid: [34, 197, 94] as [number, number, number],
    pending: [234, 179, 8] as [number, number, number],
    overdue: [239, 68, 68] as [number, number, number],
  }
  const statusColor = (statusColors[invoice.status] || [107, 114, 128]) as [number, number, number]
  const [r, g, b] = statusColor
  doc.setFillColor(r, g, b)
  doc.rect(140, 70, 30, 8, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(10)
  doc.text(invoice.status.toUpperCase(), 142, 76)

  // Customer information
  doc.setFontSize(14)
  doc.setTextColor(51, 51, 51)
  doc.text("Bill To:", 20, 85)

  doc.setFontSize(12)
  doc.text(invoice.customerName, 20, 95)
  if (invoice.customerEmail) {
    doc.text(invoice.customerEmail, 20, 105)
  }

  // Line separator
  doc.setLineWidth(0.5)
  doc.setDrawColor(229, 231, 235)
  doc.line(20, 120, 190, 120)

  // Table headers
  const startY = 135
  doc.setFontSize(10)
  doc.setTextColor(107, 114, 128)
  doc.text("DESCRIPTION", 20, startY)
  doc.text("QTY", 120, startY)
  doc.text("PRICE", 140, startY)
  doc.text("TOTAL", 165, startY)

  // Table content
  doc.setTextColor(51, 51, 51)
  let currentY = startY + 10

  invoice.items.forEach((item, index) => {
    if (currentY > 250) {
      // Check if we need a new page
      doc.addPage()
      currentY = 30
    }

    const itemPrice = Number(item.price) || 0
    const itemTotal = Number(item.total) || 0
    const itemQuantity = Number(item.quantity) || 0

    console.log(
      `[v0] Item ${index}: price=${item.price} (${typeof item.price}), total=${item.total} (${typeof item.total})`,
    )

    doc.text(item.productName, 20, currentY)
    doc.text(itemQuantity.toString(), 120, currentY)
    doc.text(`${currencySymbol}${itemPrice.toFixed(2)}`, 140, currentY)
    doc.text(`${currencySymbol}${itemTotal.toFixed(2)}`, 165, currentY)

    currentY += 10
  })

  // Totals section
  const totalsY = Math.max(currentY + 20, 220)

  // Line separator
  doc.setLineWidth(0.5)
  doc.setDrawColor(229, 231, 235)
  doc.line(120, totalsY - 5, 190, totalsY - 5)

  const subtotal = Number(invoice.subtotal) || 0
  const tax = Number(invoice.tax) || 0
  const total = Number(invoice.total) || 0

  doc.setFontSize(11)
  doc.setTextColor(107, 114, 128)
  doc.text("Subtotal:", 120, totalsY)
  doc.text(`${currencySymbol}${subtotal.toFixed(2)}`, 165, totalsY)

  doc.text("Tax:", 120, totalsY + 10)
  doc.text(`${currencySymbol}${tax.toFixed(2)}`, 165, totalsY + 10)

  // Total line
  doc.setLineWidth(0.5)
  doc.line(120, totalsY + 15, 190, totalsY + 15)

  doc.setFontSize(12)
  doc.setTextColor(51, 51, 51)
  doc.text("Total:", 120, totalsY + 25)
  doc.text(`${currencySymbol}${total.toFixed(2)}`, 165, totalsY + 25)

  // Footer
  doc.setFontSize(9)
  doc.setTextColor(107, 114, 128)
  doc.text("Thank you for your business!", 20, 280)
  doc.text(`Generated on ${format(new Date(), "MMM dd, yyyy HH:mm")}`, 120, 280)

  // Save the PDF
  doc.save(`Invoice-${invoice.invoiceNumber}.pdf`)
}

const Invoices: React.FC = () => {
  const { userData } = useAuth()
  const [activeTab, setActiveTab] = useState<"invoices" | "sales">("invoices")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showQuickSaleModal, setShowQuickSaleModal] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showLoadMore, setShowLoadMore] = useState(false)

  // Ensure proper shop isolation - only fetch data for current user's shop
  const currentShopId = userData?.shopId
  const dispatch = useAppDispatch()
  const invoices = useAppSelector(s => s.invoices.items as any[])
  const invoicesLoading = useAppSelector(s => s.invoices.loading)
  const products = useAppSelector(s => s.products.items as any[])
  const allShops = useAppSelector(s => s.shops.items as any[])
  useEffect(() => {
    dispatch(fetchInvoices({} as any))
    dispatch(fetchProducts({ shopId: currentShopId } as any))
    dispatch(fetchShops())
  }, [dispatch, currentShopId])
  const currentShop = allShops.find((shop) => shop.id === currentShopId)

  const { confirm } = useDialog()
  const { showToast } = useToast()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
    setValue,
    formState: { errors },
  } = useForm<InvoiceFormData>({
    defaultValues: {
      items: [{ productId: "", quantity: 1, price: 0 }],
    },
  })

  // Quick sale form
  const {
    register: registerSale,
    handleSubmit: handleSubmitSale,
    reset: resetSale,
    watch: watchSale,
    control: controlSale,
    setValue: setValueSale,
    formState: { errors: saleErrors },
  } = useForm<SaleFormData>({
    defaultValues: {
      paymentMethod: "cash",
      items: [{ productId: "", quantity: 1, price: 0 }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  })

  const {
    fields: saleFields,
    append: appendSale,
    remove: removeSale,
  } = useFieldArray({
    control: controlSale,
    name: "items",
  })

  const watchedItems = watch("items")
  const watchedSaleItems = watchSale("items")

  // Get current shop data for VAT and currency - already filtered above
  const vatRate = currentShop?.vatRate ? Number.parseFloat(currentShop.vatRate.toString()) / 100 : 0.1 // Default 10%
  const currency = currentShop?.currency || "USD"

  // Currency symbol mapping
  const getCurrencySymbol = (currency: string) => {
    switch (currency) {
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

  // Validation helpers
  const isSaleInvalid = (watchedSaleItems || []).some((item: any) => {
    const product = products.find((p) => p.id === item.productId)
    if (!product) return true
    if (product.stock <= 0) return true
    if (!item.quantity || item.quantity < 1) return true
    if (item.quantity > product.stock) return true
    return false
  })

  const isInvoiceCreateInvalid = (!editingInvoice) && (watchedItems || []).some((item: any) => {
    const product = products.find((p) => p.id === item.productId)
    if (!product) return true
    if (product.stock <= 0) return true
    if (!item.quantity || item.quantity < 1) return true
    if (item.quantity > product.stock) return true
    return false
  })

  // Calculate totals for invoices
  const subtotal = watchedItems.reduce((sum, item) => {
    return sum + item.quantity * item.price
  }, 0)
  const tax = subtotal * vatRate // Use business VAT rate
  const total = subtotal + tax

  // Calculate totals for quick sales
  const saleSubtotal = watchedSaleItems.reduce((sum, item) => {
    return sum + item.quantity * item.price
  }, 0)
  const saleTax = saleSubtotal * vatRate
  const saleTotal = saleSubtotal + saleTax

  // Memoize filtered invoices for better performance
  const filteredInvoices = useMemo(() => {
    return invoices
      .filter((invoice) => {
        const matchesSearch =
          invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          invoice.customerName.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesStatus = statusFilter === "all" || invoice.status === statusFilter
        return matchesSearch && matchesStatus
      })
      .sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt)
        const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt)
        return dateB.getTime() - dateA.getTime()
      })
  }, [invoices, searchQuery, statusFilter])

  // Memoize filtered sales for better performance
  const filteredSales = useMemo(() => {
    return sales
      .filter((sale) => {
        const matchesSearch =
          sale.saleNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (sale.customerName && sale.customerName.toLowerCase().includes(searchQuery.toLowerCase()))
        return matchesSearch
      })
      .sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt)
        const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt)
        return dateB.getTime() - dateA.getTime()
      })
  }, [ searchQuery])

  // Show load more button if we have exactly 50 invoices (the limit)
  useEffect(() => {
    setShowLoadMore(invoices.length === 50)
  }, [invoices.length])

  // Update price when product is selected for invoices
  useEffect(() => {
    console.log("[v0] Invoice items changed:", watchedItems)
    watchedItems.forEach((item, index) => {
      if (item.productId) {
        const product = products.find((p) => p.id === item.productId)
        console.log("[v0] Found product for invoice item:", product)
        if (product && Number(item.price) !== Number(product.price)) {
          console.log("[v0] Updating invoice price from", item.price, "to", product.price)
          setValue(`items.${index}.price`, Number(product.price))
          setValue(`items.${index}.price`, Number(product.price), { shouldValidate: true, shouldDirty: true })
        }
      }
    })
  }, [watchedItems, products, setValue])

  useEffect(() => {
    console.log("[v0] Watching sale items for price updates:", watchedSaleItems)
    watchedSaleItems.forEach((item, index) => {
      if (item.productId) {
        const product = products.find((p) => p.id === item.productId)
        console.log("[v0] Found product for sale item:", product)
        if (product && Number(item.price) !== Number(product.price)) {
          console.log("[v0] Updating sale price from", item.price, "to", product.price)
          setValueSale(`items.${index}.price`, Number(product.price), { shouldValidate: true, shouldDirty: true })
        }
      }
    })
  }, [watchedSaleItems, products, setValueSale])

  // Load jsPDF dynamically
  useEffect(() => {
    if (typeof window !== "undefined" && !window.jsPDF) {
      const script = document.createElement("script")
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"
      script.onload = () => {
        console.log("jsPDF loaded successfully")
      }
      script.onerror = () => {
        console.error("Failed to load jsPDF")
      }
      document.head.appendChild(script)
    }
  }, [])

  const generateInvoiceNumber = () => {
    const timestamp = Date.now().toString().slice(-6)
    return `INV-${timestamp}`
  }

  const generateSaleNumber = () => {
    const timestamp = Date.now().toString().slice(-6)
    return `SALE-${timestamp}`
  }

  const handleDownloadPDF = async (invoice: Invoice) => {
    try {
      // Check if jsPDF is available
      if (typeof window === "undefined") {
        throw new Error("PDF generation is only available in the browser")
      }

      // Try to load jsPDF if not already loaded
      if (!window.jsPDF) {
        console.log("[v0] Loading jsPDF library...")
        await new Promise((resolve, reject) => {
          const script = document.createElement("script")
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"
          script.onload = () => {
            console.log("[v0] jsPDF loaded successfully")
            resolve(true)
          }
          script.onerror = () => {
            console.error("[v0] Failed to load jsPDF")
            reject(new Error("Failed to load PDF library"))
          }
          document.head.appendChild(script)
        })
      }

      console.log("[v0] Invoice data before PDF generation:", {
        items: invoice.items.map((item) => ({
          name: item.productName,
          price: item.price,
          priceType: typeof item.price,
          total: item.total,
          totalType: typeof item.total,
        })),
        subtotal: invoice.subtotal,
        tax: invoice.tax,
        total: invoice.total,
      })

      // Generate PDF
      console.log("[v0] Generating PDF for invoice:", invoice.invoiceNumber)
      generateInvoicePDF(invoice, currentShop, currencySymbol)
    } catch (error: unknown) {
      console.error("[v0] Error generating PDF:", error)
      const message = error instanceof Error ? error.message : String(error)
      showToast({ type: 'error', title: 'PDF failed', message: `Failed to generate PDF: ${message}` })
    }
  }

  const onSubmit = async (data: InvoiceFormData) => {
    setLoading(true)
    setError("")
    try {
      // Validate stock availability
      for (const item of data.items) {
        const product = products.find((p) => p.id === item.productId)
        if (!product) {
          throw new Error(`Product not found`)
        }

        if (!editingInvoice && product.stock < item.quantity) {
          throw new Error(`Insufficient stock for ${product.name}. Available: ${product.stock}`)
        }

        if (editingInvoice) {
          const originalItem = editingInvoice.items.find((i) => i.productId === item.productId)
          const originalQuantity = originalItem ? originalItem.quantity : 0
          const availableStock = product.stock + originalQuantity
          if (availableStock < item.quantity) {
            throw new Error(
              `Insufficient stock for ${product.name}. Available: ${availableStock} (including original quantity)`,
            )
          }
        }
      }

      const invoiceItems: InvoiceItem[] = data.items.map((item) => {
        const product = products.find((p) => p.id === item.productId)
        return {
          productId: item.productId,
          productName: product?.name || "",
          quantity: item.quantity,
          price: item.price,
          total: item.quantity * item.price,
        }
      })

      const invoiceData = {
        invoiceNumber: editingInvoice?.invoiceNumber || generateInvoiceNumber(),
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        items: invoiceItems,
        subtotal,
        tax,
        total,
        status: "pending" as const,
        dueDate: new Date(data.dueDate),
        shopId: userData?.shopId || "default",
        createdBy: userData?.id || "unknown",
      }

      let savedInvoiceId

      if (editingInvoice) {
        // Handle stock adjustments for edited invoice
        const originalItems = editingInvoice.items
        const newItems = data.items

        // First, restore stock from original items
        for (const originalItem of originalItems) {
          const product = products.find((p) => p.id === originalItem.productId)
          if (product) {
            await updateProduct(originalItem.productId, {
              stock: product.stock + originalItem.quantity,
            })
          }
        }

        // Then, deduct stock for new items
        for (const newItem of newItems) {
          const product = products.find((p) => p.id === newItem.productId)
          if (product) {
            const updatedProduct = products.find((p) => p.id === newItem.productId)
            const currentStock = updatedProduct
              ? updatedProduct.stock + originalItems.find((oi) => oi.productId === newItem.productId)?.quantity || 0
              : 0
            await updateProduct(newItem.productId, {
              stock: currentStock - newItem.quantity,
            })
          }
        }

        await updateInvoice(editingInvoice.id, invoiceData)
        savedInvoiceId = editingInvoice.id
        console.log("Invoice updated successfully")
      } else {
        savedInvoiceId = await createInvoice(invoiceData)
        // Deduct stock from products
        for (const item of data.items) {
          const product = products.find((p) => p.id === item.productId)
          if (product) {
            await updateProduct(item.productId, {
              stock: product.stock - item.quantity,
            })
          }
        }
        console.log("Invoice created successfully")
      }

      // Show success message and offer PDF download
      showToast({ type: 'success', title: 'Invoice saved', message: 'The invoice was saved successfully.' })
      const downloadPDF = await confirm({ title: 'Download PDF', message: 'Would you like to download the PDF now?', confirmText: 'Download', cancelText: 'Later' })
      if (downloadPDF) {
        // Get the saved invoice for PDF generation
        const savedInvoice = editingInvoice || {
          ...invoiceData,
          id: savedInvoiceId,
          createdAt: new Date(),
        }
        handleDownloadPDF(savedInvoice as Invoice)
      }

      reset()
      setShowCreateModal(false)
      setEditingInvoice(null)
    } catch (err: any) {
      console.error("Error saving invoice:", err)
      setError(err.message || "Failed to save invoice. Please try again.")
      showToast({ type: 'error', title: 'Save failed', message: 'Could not save invoice.' })
    } finally {
      setLoading(false)
    }
  }

  const onQuickSaleSubmit = async (data: SaleFormData) => {
    setLoading(true)
    setError("")
    try {
      // Validate shop exists
      if (!currentShopId) {
        throw new Error("No shop associated with user")
      }

      // Validate stock availability
      for (const item of data.items) {
        const product = products.find((p) => p.id === item.productId)
        if (!product) {
          throw new Error(`Product not found`)
        }

        if (product.stock < item.quantity) {
          throw new Error(`Insufficient stock for ${product.name}. Available: ${product.stock}`)
        }
      }

      const saleItems: SaleItem[] = data.items.map((item) => {
        const product = products.find((p) => p.id === item.productId)
        return {
          productId: item.productId,
          productName: product?.name || "",
          quantity: item.quantity,
          price: item.price,
          total: item.quantity * item.price,
        }
      })

      const saleData = {
        saleNumber: generateSaleNumber(),
        customerName: data.customerName || "Walk-in Customer",
        items: saleItems,
        subtotal: saleSubtotal,
        tax: saleTax,
        total: saleTotal,
        paymentMethod: data.paymentMethod,
        shopId: currentShopId,
        createdBy: userData?.id || "unknown",
      }

      await createSale(saleData)

      // Deduct stock from products
      for (const item of data.items) {
        const product = products.find((p) => p.id === item.productId)
        if (product) {
          await updateProduct(item.productId, {
            stock: product.stock - item.quantity,
          })
        }
      }

      console.log("Quick sale completed successfully")
      showToast({ type: 'success', title: 'Sale completed', message: 'Inventory has been updated.' })
      resetSale()
      setShowQuickSaleModal(false)
    } catch (err: any) {
      console.error("Error processing quick sale:", err)
      setError(err.message || "Failed to process sale. Please try again.")
      showToast({ type: 'error', title: 'Sale failed', message: 'Could not complete sale.' })
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice)
    reset({
      customerName: invoice.customerName,
      customerEmail: invoice.customerEmail || "",
      dueDate: format(invoice.dueDate, "yyyy-MM-dd"),
      items: invoice.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
      })),
    })
    setShowCreateModal(true)
  }

  const handleView = (invoice: Invoice) => {
    setViewingInvoice(invoice)
    setShowViewModal(true)
  }

  const handleDelete = async (invoiceId: string) => {
    const ok = await confirm({ title: 'Delete invoice', message: 'Are you sure you want to delete this invoice? This action cannot be undone.', tone: 'danger', confirmText: 'Delete', cancelText: 'Cancel' })
    if (ok) {
      try {
        await deleteInvoice(invoiceId)
        console.log("Invoice deleted successfully")
        showToast({ type: 'success', title: 'Invoice deleted', message: 'The invoice has been removed.' })
      } catch (err) {
        console.error("Error deleting invoice:", err)
        showToast({ type: 'error', title: 'Delete failed', message: 'Could not delete invoice.' })
      }
    }
  }

  const handleStatusChange = async (invoiceId: string, newStatus: "paid" | "pending" | "overdue") => {
    try {
      await updateInvoice(invoiceId, {
        status: newStatus,
        ...(newStatus === "paid" && { paidAt: new Date() }),
      })
      console.log("Invoice status updated successfully")
    } catch (err) {
      console.error("Error updating invoice status:", err)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
        return <CheckCircle size={16} className="text-green-600" />
      case "pending":
        return <Clock size={16} className="text-yellow-600" />
      case "overdue":
        return <AlertCircle size={16} className="text-red-600" />
      default:
        return null
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "overdue":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const totalRevenue = invoices.reduce((sum, invoice) => sum + invoice.total, 0)
  const paidAmount = invoices.filter((i) => i.status === "paid").reduce((sum, invoice) => sum + invoice.total, 0)
  const pendingAmount = invoices.filter((i) => i.status === "pending").reduce((sum, invoice) => sum + invoice.total, 0)

  if (invoicesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header and Action Buttons */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Sales & Invoices</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-300">Manage your instant sales and invoices</p>
        </div>
        <div className="flex space-x-3">
          {/* Quick Sale Button */}
          <button
            onClick={() => {
              resetSale({ paymentMethod: "cash", items: [{ productId: "", quantity: 1, price: 0 }] })
              setShowQuickSaleModal(true)
            }}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
          >
            <ShoppingCart size={20} />
            <span>Quick Sale</span>
          </button>
          {/* Create Invoice Button */}
          <button
            onClick={() => {
              setEditingInvoice(null)
              reset({ items: [{ productId: "", quantity: 1, price: 0 }] })
              setShowCreateModal(true)
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Plus size={20} />
            <span>Create Invoice</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("invoices")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "invoices"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center space-x-2">
              <FileText size={16} />
              <span>Invoices ({invoices.length})</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab("sales")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "sales"
                ? "border-green-500 text-green-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center space-x-2">
              <ShoppingCart size={16} />
              <span>Quick Sales ({sales.length})</span>
            </div>
          </button>
        </nav>
      </div>

      {/* Summary Cards */}
      {activeTab === "invoices" ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total Revenue */}
          <div className="rounded-lg shadow-sm border p-6 bg-white border-gray-100 dark:bg-gray-800 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                  {currencySymbol}
                  {totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-blue-100">
                <FileText size={24} className="text-blue-600" />
              </div>
            </div>
          </div>

          {/* Paid Amount */}
          <div className="rounded-lg shadow-sm border p-6 bg-white border-gray-100 dark:bg-gray-800 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Paid Amount</p>
                <p className="text-2xl font-bold text-green-600">
                  {currencySymbol}
                  {paidAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-100">
                <CheckCircle size={24} className="text-green-600" />
              </div>
            </div>
          </div>

          {/* Pending Amount */}
          <div className="rounded-lg shadow-sm border p-6 bg-white border-gray-100 dark:bg-gray-800 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Pending Amount</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {currencySymbol}
                  {pendingAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-yellow-100">
                <Clock size={24} className="text-yellow-600" />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total Sales */}
          <div className="rounded-lg shadow-sm border p-6 bg-white border-gray-100 dark:bg-gray-800 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Sales</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{sales.length}</p>
              </div>
              <div className="p-3 rounded-lg bg-green-100">
                <ShoppingCart size={24} className="text-green-600" />
              </div>
            </div>
          </div>

          {/* Sales Revenue */}
          <div className="rounded-lg shadow-sm border p-6 bg-white border-gray-100 dark:bg-gray-800 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Sales Revenue</p>
                <p className="text-2xl font-bold text-green-600">
                  {currencySymbol}
                  {sales
                    .reduce((sum, sale) => sum + sale.total, 0)
                    .toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-100">
                <CreditCard size={24} className="text-green-600" />
              </div>
            </div>
          </div>

          {/* Average Sale */}
          <div className="rounded-lg shadow-sm border p-6 bg-white border-gray-100 dark:bg-gray-800 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Average Sale</p>
                <p className="text-2xl font-bold text-blue-600">
                  {currencySymbol}
                  {sales.length > 0
                    ? (sales.reduce((sum, sale) => sum + sale.total, 0) / sales.length).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : "0.00"}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-blue-100">
                <Banknote size={24} className="text-blue-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="rounded-lg shadow-sm border p-6 bg-white border-gray-100 dark:bg-gray-800 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder={activeTab === "invoices" ? "Search invoices..." : "Search sales..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300 bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
            />
          </div>
          {/* Status Filter - Only for Invoices */}
          {activeTab === "invoices" && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300 bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
            >
              <option value="all">All Status</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
            </select>
          )}
        </div>
      </div>

      {/* Content based on active tab */}
      {activeTab === "invoices" ? (
        /* Invoices Table */
        <div className="rounded-lg shadow-sm border overflow-x-auto bg-white border-gray-100 dark:bg-gray-800 dark:border-gray-700">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100 dark:bg-gray-900 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  Invoice
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  Due Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <p className="font-medium text-gray-800 dark:text-gray-100">{invoice.invoiceNumber}</p>
                      <p className="text-sm text-gray-400 dark:text-gray-400">{format(invoice.createdAt, "MMM dd, yyyy")}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <p className="font-medium text-gray-800 dark:text-gray-100">{invoice.customerName}</p>
                      {invoice.customerEmail && <p className="text-sm text-gray-400 dark:text-gray-400">{invoice.customerEmail}</p>}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="font-semibold text-gray-800 dark:text-gray-100">
                      {currencySymbol}
                      {invoice.total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={invoice.status}
                      onChange={(e) => handleStatusChange(invoice.id, e.target.value as "paid" | "pending" | "overdue")}
                      className={`px-2.5 py-0.5 rounded-full text-xs font-medium border-0 focus:ring-2 focus:ring-blue-500 ${getStatusColor(invoice.status)}`}
                    >
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                      <option value="overdue">Overdue</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                    {format(invoice.dueDate, "MMM dd, yyyy")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex space-x-2">
                      {/* Download PDF button */}
                      <button
                        onClick={() => handleDownloadPDF(invoice as Invoice)}
                        className="p-2 transition-colors text-gray-500 dark:text-gray-300 hover:text-purple-600"
                        title="Download PDF"
                      >
                        <Download size={16} />
                      </button>
                      {/* View button */}
                      <button
                        onClick={() => handleView(invoice as Invoice)}
                        className="p-2 transition-colors text-gray-500 dark:text-gray-300 hover:text-blue-400"
                        title="View invoice"
                      >
                        <Eye size={16} />
                      </button>
                      {/* Edit button */}
                      <button
                        onClick={() => handleEdit(invoice as Invoice)}
                        className="p-2 transition-colors text-gray-500 dark:text-gray-300 hover:text-green-400"
                        title="Edit invoice"
                      >
                        <Edit size={16} />
                      </button>
                      {/* Delete button */}
                      <button
                        onClick={() => handleDelete(invoice.id)}
                        className="p-2 transition-colors text-gray-500 dark:text-gray-300 hover:text-red-400"
                        title="Delete invoice"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredInvoices.length === 0 && (
            <div className="text-center py-12">
              <FileText size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-800 mb-2">No invoices found</h3>
              <p className="text-gray-600">Create your first invoice to get started.</p>
            </div>
          )}
        </div>
      ) : (
        /* Sales Table */
        <div className="rounded-lg shadow-sm border overflow-x-auto bg-white border-gray-100 dark:bg-gray-800 dark:border-gray-700">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100 dark:bg-gray-900 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  Sale #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  Payment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  Items
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <p className="font-medium text-gray-800 dark:text-gray-100">{sale.saleNumber}</p>
                      <div className="flex items-center space-x-2">
                        <p className="text-sm text-gray-400 dark:text-gray-400">{format(sale.createdAt, "MMM dd, yyyy")}</p>
                        {sale.invoiceId ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            Invoiced
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                            No Invoice
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="font-medium text-gray-800 dark:text-gray-100">{sale.customerName || "Walk-in Customer"}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="font-semibold text-green-600">
                      {currencySymbol}
                      {sale.total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        sale.paymentMethod === "cash"
                          ? "bg-green-100 text-green-800"
                          : sale.paymentMethod === "card"
                            ? "bg-blue-100 text-blue-800"
                            : sale.paymentMethod === "mobile"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {sale.paymentMethod === "cash" && <Banknote size={12} className="mr-1" />}
                      {sale.paymentMethod === "card" && <CreditCard size={12} className="mr-1" />}
                      {sale.paymentMethod === "mobile" && <Smartphone size={12} className="mr-1" />}
                      {sale.paymentMethod.replace("_", " ").toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                    {format(sale.createdAt, "MMM dd, yyyy h:mm a")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                    <div className="flex items-center space-x-3">
                      <span>
                        {sale.items.length} item{sale.items.length !== 1 ? "s" : ""}
                      </span>
                      {!sale.invoiceId && (
                        <button
                          className="text-sm text-blue-600 hover:text-blue-800"
                          onClick={async () => {
                            try {
                              // Build invoice from sale data
                              const invoiceItems = sale.items.map((item) => ({
                                productId: item.productId,
                                productName: item.productName,
                                quantity: item.quantity,
                                price: item.price,
                                total: item.total,
                              }))
                              const invoiceData = {
                                invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
                                customerName: sale.customerName || "Walk-in Customer",
                                items: invoiceItems,
                                subtotal: sale.subtotal,
                                tax: sale.tax,
                                total: sale.total,
                                status: "paid" as const,
                                paidAt: new Date(),
                                dueDate: new Date(),
                                shopId: currentShopId || "default",
                                createdBy: userData?.id || "unknown",
                              }
                              const invoiceId = await createInvoice(invoiceData)
                              await updateSale(sale.id, { invoiceId })
                            } catch (e) {
                              console.error("Failed to create invoice from sale", e)
                              showToast({ type: 'error', title: 'Convert failed', message: 'Failed to create invoice from sale.' })
                            }
                          }}
                        >
                          Create Invoice
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredSales.length === 0 && (
            <div className="text-center py-12">
              <ShoppingCart size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-800 mb-2">No sales found</h3>
              <p className="text-gray-600">Process your first quick sale to get started.</p>
            </div>
          )}
        </div>
      )}

      {/* Optional Load More message or button */}
      {showLoadMore && activeTab === "invoices" && (
        <div className="text-center">
          <p className="text-sm mb-4 text-gray-400">
            Showing recent 50 invoices. For older invoices, use search or filters.
          </p>
        </div>
      )}

      {/* Modal for creating or editing invoices */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 dark:border dark:border-gray-700">
            {/* Modal Header */}
            <div className="p-6 border-b flex items-center justify-between border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                {editingInvoice ? "Edit Invoice" : "Create New Invoice"}
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setEditingInvoice(null)
                  reset()
                  setError("")
                }}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            {/* Error message if any */}
            {error && (
              <div className="mx-6 mt-4 border px-4 py-3 rounded-lg bg-red-50 border-red-200 text-red-700">{error}</div>
            )}

            {/* Form for invoice data */}
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
              {/* Customer Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Customer Name</label>
                  <input
                    type="text"
                    {...register("customerName", { required: "Customer name is required" })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300 bg-white text-gray-900"
                    placeholder="Enter customer name"
                  />
                  {errors.customerName && <p className="mt-1 text-sm text-red-600">{errors.customerName.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Customer Email</label>
                  <input
                    type="email"
                    {...register("customerEmail")}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300 bg-white text-gray-900"
                    placeholder="Enter customer email"
                  />
                </div>
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Due Date</label>
                <input
                  type="date"
                  {...register("dueDate", { required: "Due date is required" })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300 bg-white text-gray-900"
                />
                {errors.dueDate && <p className="mt-1 text-sm text-red-600">{errors.dueDate.message}</p>}
              </div>

              {/* Items Table */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Items</label>
                <div className="border rounded-lg overflow-hidden border-gray-300">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Product</th>
                        <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Qty</th>
                        <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Price</th>
                        <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Total</th>
                        <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fields.map((field, index) => (
                        <tr key={field.id}>
                          <td className="px-4 py-2">
                            <select
                              {...register(`items.${index}.productId`, {
                                required: "Product is required",
                                onChange: (e) => {
                                  const product = products.find((p) => p.id === e.target.value)
                                  const price = product ? Number(product.price) : 0
                                  setValue(`items.${index}.price`, price, { shouldValidate: true, shouldDirty: true })
                                },
                              })}
                              className="w-full px-2 py-1 border rounded text-sm border-gray-300 bg-white text-gray-900"
                            >
                              <option value="">Select product...</option>
                              {products.map((product) => (
                                <option key={product.id} value={product.id} disabled={product.stock <= 0}>
                                  {product.name} (Stock: {product.stock}{product.stock <= 0 ? ' - out' : ''})
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              min="1"
                              {...register(`items.${index}.quantity`, { 
                                required: true, 
                                min: 1,
                                validate: (qty) => {
                                  const productId = watch(`items.${index}.productId`)
                                  const product = products.find((p) => p.id === productId)
                                  if (!product) return 'Select a product'
                                  if (product.stock <= 0) return 'Product is out of stock'
                                  if (Number(qty) > product.stock) return `Max available: ${product.stock}`
                                  return true
                                }
                              })}
                              className="w-full px-2 py-1 border rounded text-sm border-gray-300 bg-white text-gray-900"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              step="0.01"
                              readOnly
                              {...register(`items.${index}.price`, { required: true, min: 0 })}
                              className="w-full px-2 py-1 border rounded text-sm border-gray-300 bg-gray-50 text-gray-500"
                            />
                          </td>
                          <td className="px-4 py-2 font-medium text-gray-800">
                            {currencySymbol}
                            {((watchedItems[index]?.quantity || 0) * (watchedItems[index]?.price || 0)).toLocaleString(
                              "en-US",
                              { minimumFractionDigits: 2, maximumFractionDigits: 2 },
                            )}
                          </td>
                          <td className="px-4 py-2">
                            {fields.length > 1 && (
                              <button
                                type="button"
                                onClick={() => remove(index)}
                                className="text-red-600 hover:text-red-400 transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="p-3 bg-gray-50 dark:bg-gray-900">
                    <button
                      type="button"
                      onClick={() => append({ productId: "", quantity: 1, price: 0 })}
                      className="text-sm font-medium text-blue-600 hover:text-blue-400"
                    >
                      + Add Item
                    </button>
                  </div>
                </div>
              </div>

              {/* Price Summary */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="space-y-2">
                  {/* Subtotal */}
                  <div className="flex justify-between">
                    <span className="text-gray-700">Subtotal:</span>
                    <span className="font-semibold text-gray-800">
                      {currencySymbol}
                      {subtotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  {/* Tax */}
                  <div className="flex justify-between">
                    <span className="text-gray-700">Tax ({(vatRate * 100).toFixed(1)}%):</span>
                    <span className="font-semibold text-gray-800">
                      {currencySymbol}
                      {tax.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  {/* Total */}
                  <div className="flex justify-between font-semibold text-lg border-t pt-2 border-gray-200">
                    <span>Total:</span>
                    <span>
                      {currencySymbol}
                      {total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Modal action buttons */}
              <div className="flex justify-end space-x-3">
                {/* Cancel Button */}
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false)
                    setEditingInvoice(null)
                    reset()
                    setError("")
                  }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-100 transition-colors text-gray-700"
                >
                  Cancel
                </button>
                {/* Save/Update Button */}
                <button
                  type="submit"
                  disabled={loading || isInvoiceCreateInvalid}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
                >
                  <Save size={20} />
                  <span>{loading ? "Saving..." : editingInvoice ? "Update Invoice" : "Create Invoice"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Sale Modal */}
      {showQuickSaleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 dark:border dark:border-gray-700 rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="p-6 border-b dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Quick Sale (POS)</h2>
              <button
                onClick={() => {
                  setShowQuickSaleModal(false)
                  resetSale()
                  setError("")
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Quick Sale Form */}
            <form onSubmit={handleSubmitSale(onQuickSaleSubmit)}>
              <div className="p-6 space-y-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>
                )}

                {/* Customer and Payment Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Customer Name (Optional)</label>
                    <input
                      type="text"
                      {...registerSale("customerName")}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Walk-in Customer"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method *</label>
                    <select
                      {...registerSale("paymentMethod", { required: "Payment method is required" })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="mobile">Mobile Payment</option>
                      <option value="bank_transfer">Bank Transfer</option>
                    </select>
                    {saleErrors.paymentMethod && (
                      <p className="mt-1 text-sm text-red-600">{saleErrors.paymentMethod.message}</p>
                    )}
                  </div>
                </div>

                {/* Items Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <label className="block text-sm font-medium text-gray-700">Items *</label>
                    <button
                      type="button"
                      onClick={() => appendSale({ productId: "", quantity: 1, price: 0 })}
                      className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded-lg hover:bg-green-200 transition-colors"
                    >
                      + Add Item
                    </button>
                  </div>

                  <div className="space-y-4">
                    {saleFields.map((field, index) => (
                      <div
                        key={field.id}
                        className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border border-gray-200 rounded-lg"
                      >
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                          <select
                            {...registerSale(`items.${index}.productId`, {
                              required: "Product is required",
                              onChange: (e) => {
                                const product = products.find((p) => p.id === e.target.value)
                                const price = product ? Number(product.price) : 0
                                setValueSale(`items.${index}.price`, price, { shouldValidate: true, shouldDirty: true })
                              },
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          >
                            <option value="">Select Product</option>
                            {products.map((product) => (
                              <option key={product.id} value={product.id} disabled={product.stock <= 0}>
                                {product.name} ({product.stock} available{product.stock <= 0 ? ' - out of stock' : ''})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                          <input
                            type="number"
                            min="1"
                            {...registerSale(`items.${index}.quantity`, {
                              required: "Quantity is required",
                              min: { value: 1, message: "Quantity must be at least 1" },
                              validate: (qty) => {
                                const productId = watchSale(`items.${index}.productId`)
                                const product = products.find((p) => p.id === productId)
                                if (!product) return 'Select a product'
                                if (product.stock <= 0) return 'Product is out of stock'
                                if (Number(qty) > product.stock) return `Max available: ${product.stock}`
                                return true
                              }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            readOnly
                            {...registerSale(`items.${index}.price`, {
                              required: "Price is required",
                              min: { value: 0, message: "Price must be positive" },
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                          />
                        </div>
                        <div className="flex items-end">
                          {saleFields.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeSale(index)}
                              className="w-full px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors flex items-center justify-center"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Price Summary */}
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-700">Subtotal:</span>
                      <span className="font-semibold text-gray-800">
                        {currencySymbol}
                        {saleSubtotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700">Tax ({(vatRate * 100).toFixed(1)}%):</span>
                      <span className="font-semibold text-gray-800">
                        {currencySymbol}
                        {saleTax.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between text-lg font-semibold border-t pt-2 border-green-200">
                      <span>Total:</span>
                      <span>
                        {currencySymbol}
                        {saleTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal action buttons */}
              <div className="p-6 border-t bg-gray-50 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickSaleModal(false)
                    resetSale()
                    setError("")
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || isSaleInvalid}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
                >
                  <ShoppingCart size={20} />
                  <span>{loading ? "Processing..." : "Complete Sale"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Invoice Modal */}
      {showViewModal && viewingInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 dark:border dark:border-gray-700 rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="p-6 border-b dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Invoice Details - {viewingInvoice.invoiceNumber}</h2>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => handleDownloadPDF(viewingInvoice)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
                >
                  <Download size={20} />
                  <span>Download PDF</span>
                </button>
                <button
                  onClick={() => {
                    setShowViewModal(false)
                    setViewingInvoice(null)
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Invoice Details */}
            <div className="p-6 space-y-6">
              {/* Customer and Invoice Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Customer Information</h3>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Name:</span>
                      <p className="text-gray-800 dark:text-gray-100">{viewingInvoice.customerName}</p>
                    </div>
                    {viewingInvoice.customerEmail && (
                      <div>
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Email:</span>
                        <p className="text-gray-800 dark:text-gray-100">{viewingInvoice.customerEmail}</p>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Invoice Information</h3>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Invoice Number:</span>
                      <p className="text-gray-800 dark:text-gray-100">{viewingInvoice.invoiceNumber}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Created:</span>
                      <p className="text-gray-800 dark:text-gray-100">{format(viewingInvoice.createdAt, "MMM dd, yyyy")}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Due Date:</span>
                      <p className="text-gray-800 dark:text-gray-100">{format(viewingInvoice.dueDate, "MMM dd, yyyy")}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Status:</span>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ml-2 ${getStatusColor(viewingInvoice.status)}`}
                      >
                        {getStatusIcon(viewingInvoice.status)}
                        <span className="ml-1">
                          {viewingInvoice.status.charAt(0).toUpperCase() + viewingInvoice.status.slice(1)}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Items</h3>
                <div className="border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Product
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Quantity
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Price
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {viewingInvoice.items.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.productName}</div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 dark:text-gray-100">{item.quantity}</div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 dark:text-gray-100">
                              {currencySymbol}
                              {item.price.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {currencySymbol}
                              {item.total.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Price Summary */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Subtotal:</span>
                    <span className="font-semibold text-gray-800">
                      {currencySymbol}
                      {viewingInvoice.subtotal.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Tax:</span>
                    <span className="font-semibold text-gray-800">
                      {currencySymbol}
                      {viewingInvoice.tax.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between text-lg font-semibold border-t pt-2 border-gray-200">
                    <span>Total:</span>
                    <span>
                      {currencySymbol}
                      {viewingInvoice.total.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowViewModal(false)
                    setViewingInvoice(null)
                    handleEdit(viewingInvoice)
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <Edit size={20} />
                  <span>Edit Invoice</span>
                </button>
                <button
                  onClick={() => {
                    setShowViewModal(false)
                    setViewingInvoice(null)
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Declare global jsPDF interface
declare global {
  interface Window {
    jsPDF: any
  }
}

export default Invoices
