"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Package, AlertTriangle, TrendingUp, Search, Download, Edit, Save } from "lucide-react"
import { useAuth } from "../contexts/AuthContext"
import { useToast } from "../contexts/ToastContext"
import { useDialog } from "../contexts/DialogContext"
import { useAppDispatch, useAppSelector } from "../app/hooks"
import { fetchProducts } from "../features/products/productsSlice"
import { productsApi } from "../services/apiClient"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"

const Inventory: React.FC = () => {
  const { userData } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [stockFilter, setStockFilter] = useState("all")
  const [showStockModal, setShowStockModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<any>(null)
  const [newStock, setNewStock] = useState<number | "">("")
  const [saving, setSaving] = useState(false)

  const dispatch = useAppDispatch()
  const products = useAppSelector((s) => s.products.items)
  const productsLoading = useAppSelector((s) => s.products.loading)

  useEffect(() => {
    dispatch(fetchProducts({ shopId: userData?.shopId } as any))
  }, [dispatch, userData?.shopId])

  const { showToast } = useToast()
  const { confirm } = useDialog()

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      (product.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.sku || "").toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = categoryFilter === "all" || (product as any).categoryId === categoryFilter

    let matchesStock = true
    if (stockFilter === "low") {
      matchesStock = (product.stock || 0) <= 5
    } else if (stockFilter === "out") {
      matchesStock = product.stock === 0
    } else if (stockFilter === "good") {
      matchesStock = (product.stock || 0) > 5
    }

    return matchesSearch && matchesCategory && matchesStock
  })

  const categories = [...new Set(products.map((p) => (p as any).categoryId || ""))].filter(Boolean) as string[]
  const totalStockValue = products.reduce((sum, product) => sum + (product.stock || 0) * (product.price || 0), 0)
  const lowStockItems = products.filter((p) => (p.stock || 0) <= 5)
  const outOfStockItems = products.filter((p) => p.stock === 0)
  const totalUnits = products.reduce((sum, product) => sum + product.stock, 0)

  const getStockStatus = (product: any) => {
    if (product.stock === 0) return { status: "Out of Stock", variant: "destructive" as const }
    if (product.stock <= 5) return { status: "Low Stock", variant: "default" as const }
    return { status: "In Stock", variant: "default" as const }
  }

  const openStockModal = (product: any) => {
    setEditingProduct(product)
    setNewStock(product.stock ?? 0)
    setShowStockModal(true)
  }

  const handleSaveStock = async () => {
    if (newStock === "" || Number.isNaN(Number(newStock)) || Number(newStock) < 0) {
      showToast({ type: "warning", title: "Invalid value", message: "Please enter a valid non-negative stock value." })
      return
    }

    if (editingProduct && Number(newStock) < editingProduct.stock) {
      const ok = await confirm({
        title: "Reduce stock",
        message: `Reduce stock of ${editingProduct.name} from ${editingProduct.stock} to ${newStock}?`,
        confirmText: "Reduce",
        cancelText: "Cancel",
        tone: "danger",
      })
      if (!ok) return
    }

    setSaving(true)
    try {
      await productsApi.update(editingProduct.id, { stock: Number(newStock) })
      await dispatch(fetchProducts({ shopId: userData?.shopId } as any))
      showToast({
        type: "success",
        title: "Stock updated",
        message: `${editingProduct.name} stock set to ${newStock}.`,
      })
      setShowStockModal(false)
      setEditingProduct(null)
      setNewStock("")
    } catch (err) {
      console.error("Failed to update stock", err)
      showToast({ type: "error", title: "Update failed", message: "Could not update stock. Please try again." })
    } finally {
      setSaving(false)
    }
  }

  if (productsLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Management</h1>
          <p className="text-muted-foreground mt-1">Track stock levels and inventory value</p>
        </div>
        <Button>
          <Download className="mr-2 h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stock Units</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalUnits.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{lowStockItems.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              ${totalStockValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {(lowStockItems.length > 0 || outOfStockItems.length > 0) && (
        <div className="space-y-4">
          {outOfStockItems.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Out of Stock Alert</AlertTitle>
              <AlertDescription>{outOfStockItems.length} product(s) are completely out of stock</AlertDescription>
            </Alert>
          )}

          {lowStockItems.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Low Stock Alert</AlertTitle>
              <AlertDescription>{lowStockItems.length} product(s) are running low on stock</AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={stockFilter} onValueChange={setStockFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="All Stock Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stock Levels</SelectItem>
                <SelectItem value="good">In Stock</SelectItem>
                <SelectItem value="low">Low Stock</SelectItem>
                <SelectItem value="out">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Current Stock</TableHead>
                <TableHead>Unit Cost</TableHead>
                <TableHead>Stock Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => {
                const stockStatus = getStockStatus(product)
                const stockValue = (product.stock || 0) * (product.price || 0)

                return (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            (Array.isArray(product.images) ? product.images[0]?.url : undefined) ||
                            "https://images.pexels.com/photos/3394659/pexels-photo-3394659.jpeg?auto=compress&cs=tinysrgb&w=50"
                          }
                          alt={product.name}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-muted-foreground">${product.price}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{product.sku}</TableCell>
                    <TableCell className="text-muted-foreground">{(product as any).categoryId || "—"}</TableCell>
                    <TableCell>
                      <span className={`font-semibold ${(product.stock || 0) <= 5 ? "text-red-600" : ""}`}>
                        {product.stock} units
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      $
                      {(product.price || 0).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-green-600">
                        ${stockValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={stockStatus.variant}>{stockStatus.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => openStockModal(product)} title="Edit stock">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No products found</h3>
              <p className="text-muted-foreground">Try adjusting your search criteria.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Stock Dialog */}
      <Dialog open={showStockModal} onOpenChange={setShowStockModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Stock</DialogTitle>
            <DialogDescription>Update the stock quantity for {editingProduct?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="stock">New Stock Quantity</Label>
              <Input
                id="stock"
                type="number"
                min="0"
                value={newStock}
                onChange={(e) => setNewStock(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="Enter stock quantity"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowStockModal(false)
                setEditingProduct(null)
                setNewStock("")
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveStock} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Inventory
