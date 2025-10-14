"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Plus, Search, Edit, Trash2, Package, AlertCircle, Save, X, Tag } from "lucide-react"
import { useForm } from "react-hook-form"
import { Controller } from "react-hook-form";
import { useAuth } from "../contexts/AuthContext"
import { useDialog } from "../contexts/DialogContext"
import { useToast } from "../contexts/ToastContext"
import { useAppDispatch, useAppSelector } from "../app/hooks"
import { fetchProducts } from "../features/products/productsSlice"
import { fetchCategories } from "../features/categories/categoriesSlice"
import { productsApi, categoriesApi } from "../services/apiClient"
import type { Product } from "../types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"

interface ProductFormData {
  name: string
  description: string
  sku: string
  category: string
  price: number
  cost: number
  stock: number
  minStock: number
  image?: File
}

interface CategoryFormData {
  name: string
}

const Products: React.FC = () => {
  const { userData } = useAuth()
  const dispatch = useAppDispatch()
  const [showAddModal, setShowAddModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [loading, setLoading] = useState(false)
  const [categoryLoading, setCategoryLoading] = useState(false)
  const [error, setError] = useState("")
  const [categoryError, setCategoryError] = useState("")
  const [imagePreview, setImagePreview] = useState<string>("")
  const [imageUploading, setImageUploading] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  
  const products = useAppSelector((s) => s.products.items)
  const productsLoading = useAppSelector((s) => s.products.loading)
  const categories = useAppSelector((s) => s.categories.items) || []


  useEffect(() => {
    dispatch(fetchProducts({ shopId: userData?.shopId } as any))
    dispatch(fetchCategories(userData?.shopId))
  }, [dispatch, userData?.shopId])

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<ProductFormData>()
  const {
    register: registerCategory,
    handleSubmit: handleSubmitCategory,
    reset: resetCategory,
    formState: { errors: categoryErrors },
  } = useForm<CategoryFormData>()
  const { confirm } = useDialog()
  const { showToast } = useToast()

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = (error) => reject(error)
    })
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError("Image size must be less than 2MB")
        return
      }

      if (!file.type.startsWith("image/")) {
        setError("Please select a valid image file")
        return
      }

      setImageUploading(true)
      try {
        setImageFile(file)
        const base64 = await convertToBase64(file)
        setImagePreview(base64)
        setError("")
      } catch (err) {
        setError("Failed to process image")
      } finally {
        setImageUploading(false)
      }
    }
  }

  const onSubmit = async (data: ProductFormData) => {
    setLoading(true);
    setError("");
  
    try {
      const formData = new FormData();
      formData.append("name", data.name);
      formData.append("description", data.description);
      formData.append("sku", data.sku);
      formData.append("price", String(data.price ?? 0));
      formData.append("cost", String(data.cost ?? 0));
      formData.append("stock", String(data.stock ?? 0));
      formData.append("minStock", String(data.minStock ?? 0));
      formData.append("shopId", userData?.shopId || "default");
      formData.append("categoryId", data.category || "");
  
      if (imageFile) {
        formData.append("image", imageFile);
      }
  
      if (editingProduct) {
        await productsApi.update(editingProduct.id, formData);
        showToast({ type: "success", title: "Product updated", message: "Product details saved successfully." });
      } else {
        await productsApi.create(formData);
        showToast({ type: "success", title: "Product added", message: "New product has been added." });
      }
  
      await dispatch(fetchProducts({ shopId: userData?.shopId } as any));
      reset();
      setShowAddModal(false);
      setEditingProduct(null);
      setImagePreview("");
      setImageFile(null);
    } catch (err) {
      console.error("Error saving product:", err);
      setError("Failed to save product. Please try again.");
      showToast({ type: "error", title: "Save failed", message: "Could not save product. Try again." });
    } finally {
      setLoading(false);
    }
  };
  

  const onCategorySubmit = async (data: CategoryFormData) => {
    setCategoryLoading(true)
    setCategoryError("")

    try {
      await categoriesApi.create({ name: data.name, shopId: userData?.shopId || "default" } as any)
      await dispatch(fetchCategories(userData?.shopId))

      showToast({ type: "success", title: "Category added", message: "New category has been added." })
      resetCategory()
      setShowCategoryModal(false)
    } catch (err) {
      console.error("Error adding category:", err)
      setCategoryError("Failed to add category. Please try again.")
      showToast({ type: "error", title: "Add failed", message: "Could not add category." })
    } finally {
      setCategoryLoading(false)
    }
  }

  const handleEdit = (product: any) => {
    setEditingProduct(product)
    setImagePreview(product.images?.[0]?.url || product.image || "")
    setImageFile(null)
    reset({
      name: product.name,
      description: product.description,
      sku: product.sku,
      category: product.category,
      price: product.price,
      cost: product.cost,
      stock: product.stock,
      minStock: product.minStock,
    })
    setShowAddModal(true)
  }

  const handleDelete = async (productId: string) => {
    const ok = await confirm({
      title: "Delete product",
      message: "Are you sure you want to delete this product? This action cannot be undone.",
      tone: "danger",
      confirmText: "Delete",
      cancelText: "Cancel",
    })
    if (ok) {
      try {
        await productsApi.delete(productId)
        await dispatch(fetchProducts({ shopId: userData?.shopId } as any))
        showToast({ type: "success", title: "Product deleted", message: "The product has been removed." })
      } catch (err) {
        console.error("Error deleting product:", err)
        showToast({ type: "error", title: "Delete failed", message: "Could not delete product." })
      }
    }
  }

  const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
    const productsUsingCategory = products.filter((product) => product.categoryId === categoryId)

    if (productsUsingCategory.length > 0) {
      showToast({
        type: "warning",
        title: "Cannot delete",
        message: `Category "${categoryName}" is used by ${productsUsingCategory.length} product(s).`,
      })
      return
    }

    const ok = await confirm({
      title: "Delete category",
      message: `Are you sure you want to delete the category "${categoryName}"?`,
      tone: "danger",
      confirmText: "Delete",
      cancelText: "Cancel",
    })
    if (ok) {
      try {
        await categoriesApi.delete(categoryId)
        await dispatch(fetchCategories(userData?.shopId))
        showToast({ type: "success", title: "Category deleted", message: "The category has been removed." })
      } catch (err) {
        console.error("Error deleting category:", err)
        showToast({ type: "error", title: "Delete failed", message: "Could not delete category." })
      }
    }
  }

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      (product.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.sku || "").toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === "all" || product.categoryId === selectedCategory
    return matchesSearch && matchesCategory
  })

  const lowStockThreshold = 5
  const lowStockProducts = products.filter((product) => (product.stock || 0) <= lowStockThreshold)

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
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground mt-1">Manage your product inventory and categories</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setShowCategoryModal(true)}>
            <Tag className="mr-2 h-4 w-4" />
            Manage Categories
          </Button>
          <Button
            onClick={() => {
              setEditingProduct(null)
              reset()
              setImagePreview("")
              setShowAddModal(true)
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Low Stock Alert</AlertTitle>
          <AlertDescription>{lowStockProducts.length} product(s) are running low on stock</AlertDescription>
        </Alert>
      )}

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
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {products.reduce((sum, product) => sum + product.stock, 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{lowStockProducts.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              $
              {products
                .reduce((sum, product) => sum + product.stock * (product.cost ?? 0), 0)
                .toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
      </div>

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
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Array.isArray(categories) && categories.length > 0 ? (
  categories.map((category) => (
    <SelectItem key={category.id} value={category.id}>
      {category.name}
    </SelectItem>
  ))
) : (
  <SelectItem disabled value="no-categories">No categories</SelectItem>
)}

              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts.map((product:any) => (
          <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className="relative">
              <img
                src={
                  product.images?.[0]?.url ||
                  "https://images.pexels.com/photos/3394659/pexels-photo-3394659.jpeg?auto=compress&cs=tinysrgb&w=200" } 
                alt={product.name}
                className="w-full h-48 object-cover"
              />
              {product.stock <= product?.minStock && (
                <Badge className="absolute top-2 right-2" variant="secondary">
                  Low Stock
                </Badge>
              )}
            </div>

            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-sm line-clamp-1">{product.name}</h3>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(product)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => handleDelete(product.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <p className="text-xs text-muted-foreground mb-2">SKU: {product.sku}</p>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Price:</span>
                  <span className="font-semibold text-green-600">
                    ${product.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Stock:</span>
                  <span className={`font-semibold ${(product.stock || 0) <= lowStockThreshold ? "text-red-600" : ""}`}>
                    {product.stock} units
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Category:</span>
                  <span className="text-muted-foreground">
                    {categories.find((c) => c.id === (product as any).categoryId)?.name || "—"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Value:</span>
                  <span className="font-semibold text-blue-600">
                    $
                    {((product.stock || 0) * (product.price || 0)).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No products found</h3>
            <p className="text-muted-foreground">Try adjusting your search criteria or add a new product.</p>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Product Dialog */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
      <DialogDescription>
        {editingProduct ? "Update product information" : "Add a new product to your inventory"}
      </DialogDescription>
    </DialogHeader>

    {error && (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )}

    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4"
    >
      {/* Product name and SKU */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Product Name</Label>
          <Input
            id="name"
            {...register("name", { required: "Product name is required" })}
            placeholder="Enter product name"
          />
          {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="sku">SKU</Label>
          <Input
            id="sku"
            {...register("sku", { required: "SKU is required" })}
            placeholder="Enter SKU"
          />
          {errors.sku && <p className="text-sm text-destructive">{errors.sku.message}</p>}
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          {...register("description")}
          placeholder="Enter product description"
          rows={3}
        />
      </div>

      {/* Category, Price, Cost */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>

          {/* ✅ Controlled Select for RHF */}
          <Controller
            name="category"
            control={control}
            rules={{ required: "Category is required" }}
            render={({ field }) => (
              <Select
                onValueChange={(value) => field.onChange(value)}
                value={field.value || ""}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(categories) &&
                    categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.category && <p className="text-sm text-destructive">{errors.category.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="price">Price ($)</Label>
          <Input
            id="price"
            type="number"
            step="0.01"
            {...register("price", { required: "Price is required", min: 0 })}
            placeholder="0.00"
          />
          {errors.price && <p className="text-sm text-destructive">{errors.price.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="cost">Cost ($)</Label>
          <Input
            id="cost"
            type="number"
            step="0.01"
            {...register("cost", { required: "Cost is required", min: 0 })}
            placeholder="0.00"
          />
          {errors.cost && <p className="text-sm text-destructive">{errors.cost.message}</p>}
        </div>
      </div>

      {/* Stock */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="stock">Stock Quantity</Label>
          <Input
            id="stock"
            type="number"
            {...register("stock", { required: "Stock quantity is required", min: 0 })}
            placeholder="0"
          />
          {errors.stock && <p className="text-sm text-destructive">{errors.stock.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="minStock">Minimum Stock</Label>
          <Input
            id="minStock"
            type="number"
            {...register("minStock", { required: "Minimum stock is required", min: 0 })}
            placeholder="0"
          />
          {errors.minStock && <p className="text-sm text-destructive">{errors.minStock.message}</p>}
        </div>
      </div>

      {/* Image Upload */}
      <div className="space-y-2">
        <Label htmlFor="image">Product Image</Label>
        {imagePreview && (
          <div className="relative inline-block">
            <img
              src={imagePreview || "/placeholder.svg"}
              alt="Preview"
              className="w-32 h-32 object-cover rounded-lg border"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute -top-2 -right-2 h-6 w-6"
              onClick={() => { setImagePreview(""); setImageFile(null); }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        <Input id="image" type="file" accept="image/*" onChange={handleImageChange} disabled={imageUploading} />
        {imageUploading && <p className="text-sm text-blue-600">Processing image...</p>}
        <p className="text-sm text-muted-foreground">
          Upload an image (max 2MB). Supported formats: JPG, PNG, GIF, WebP
        </p>
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setShowAddModal(false);
            setEditingProduct(null);
            reset(); // ✅ clears all fields, including category
            setImagePreview("");
            setError("");
          }}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          <Save className="mr-2 h-4 w-4" />
          {loading ? "Saving..." : editingProduct ? "Update Product" : "Add Product"}
        </Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>

      {/* Category Management Dialog */}
      <Dialog open={showCategoryModal} onOpenChange={setShowCategoryModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Categories</DialogTitle>
            <DialogDescription>Add or remove product categories</DialogDescription>
          </DialogHeader>

          {categoryError && (
            <Alert variant="destructive">
              <AlertDescription>{categoryError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmitCategory(onCategorySubmit)} className="flex gap-3">
            <div className="flex-1">
              <Input
                {...registerCategory("name", { required: "Category name is required" })}
                placeholder="Enter category name"
              />
              {categoryErrors.name && <p className="text-sm text-destructive mt-1">{categoryErrors.name.message}</p>}
            </div>
            <Button type="submit" disabled={categoryLoading}>
              <Plus className="mr-2 h-4 w-4" />
              {categoryLoading ? "Adding..." : "Add Category"}
            </Button>
          </form>

          <div className="space-y-2">
  <h3 className="font-medium mb-3">Existing Categories</h3>

  {Array.isArray(categories) && categories.length === 0 ? (
    <p className="text-center py-4 text-muted-foreground">
      No categories found. Add your first category above.
    </p>
  ) : (
    Array.isArray(categories) &&
    categories.map((category: any) => (
      <div
        key={category.id}
        className="flex items-center justify-between p-3 bg-muted rounded-lg"
      >
        <div className="flex items-center gap-3">
          <Tag className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{category.name}</span>
          <span className="text-sm text-muted-foreground">
            (
            {Array.isArray(products)
              ? products.filter((p: any) => p.category === category.name).length
              : 0}{' '}
            products)
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive"
          onClick={() => handleDeleteCategory(category.id, category.name)}
          title="Delete category"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    ))
  )}
</div>

        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Products
