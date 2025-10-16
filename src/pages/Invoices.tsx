"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { format } from "date-fns"
import { Search, Save, X, Trash2, ShoppingCart } from "lucide-react"
import { useAuth } from "../contexts/AuthContext"
import { invoicesApi, productsApi, type Invoice as ApiInvoice, type Product as ApiProduct } from "../services/apiClient"

// Types for local forms
interface InvoiceFormItem { productId: string; quantity: number; price: number }
interface InvoiceFormData { customerName: string; dueDate?: string; items: InvoiceFormItem[] }
interface QuickSaleFormData { customerName?: string; items: InvoiceFormItem[] }

type Status = ApiInvoice['status'] | 'paid'

const Invoices: React.FC = () => {
  const { userData } = useAuth()
  const shopId = userData?.shopId

  const [invoices, setInvoices] = useState<ApiInvoice[]>([])
  const [products, setProducts] = useState<ApiProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all")
  const [showCreate, setShowCreate] = useState(false)
  const [showQuickSale, setShowQuickSale] = useState(false)
  const [editing, setEditing] = useState<ApiInvoice | null>(null)

  // Invoice form
  const invoiceForm = useForm<InvoiceFormData>({ defaultValues: { items: [{ productId: "", quantity: 1, price: 0 }] } })
  const { control, register, handleSubmit, reset, watch, setValue, formState: { errors } } = invoiceForm
  const { fields, append, remove } = useFieldArray({ control, name: "items" })

  // Quick sale form
  const saleForm = useForm<QuickSaleFormData>({ defaultValues: { items: [{ productId: "", quantity: 1, price: 0 }] } })
  const { control: saleControl, register: registerSale, handleSubmit: handleSubmitSale, reset: resetSale, watch: watchSale, setValue: setValueSale } = saleForm
  const { fields: saleFields, append: appendSale, remove: removeSale } = useFieldArray({ control: saleControl, name: "items" })

  // Load data
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError("")
      try {
        const [invRes, prodRes] = await Promise.all([
          invoicesApi.getAll(shopId),
          productsApi.getAll(shopId),
        ])
        setInvoices(invRes.invoices)
        setProducts(prodRes.products)
      } catch (e: any) {
        setError(e?.message || "Failed to load data")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [shopId])

  const watchedItems = watch("items")
  useEffect(() => {
    watchedItems.forEach((item, idx) => {
      if (item.productId) {
        const p = products.find(pr => pr.id === item.productId)
        if (p && Number(item.price) !== Number(p.price)) {
          setValue(`items.${idx}.price`, Number(p.price), { shouldDirty: true, shouldValidate: true })
        }
      }
    })
  }, [watchedItems, products, setValue])

  const watchedSaleItems = watchSale("items")
  useEffect(() => {
    watchedSaleItems.forEach((item, idx) => {
      if (item.productId) {
        const p = products.find(pr => pr.id === item.productId)
        if (p && Number(item.price) !== Number(p.price)) {
          setValueSale(`items.${idx}.price`, Number(p.price), { shouldDirty: true, shouldValidate: true })
        }
      }
    })
  }, [watchedSaleItems, products, setValueSale])

  const subtotal = watchedItems.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.price) || 0), 0)
  const tax = 0
  const total = subtotal + tax

  const saleSubtotal = watchedSaleItems.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.price) || 0), 0)
  const saleTax = 0
  const saleTotal = saleSubtotal + saleTax

  const filtered = useMemo(() => {
    return invoices
      .filter(inv => {
        const q = searchQuery.toLowerCase()
        const matches = inv.customerName.toLowerCase().includes(q) || (inv as any).invoiceNumber?.toLowerCase?.().includes(q)
        const statusOk = statusFilter === "all" || inv.status === statusFilter
        return matches && statusOk
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [invoices, searchQuery, statusFilter])

  const refreshInvoices = async () => {
    try { const res = await invoicesApi.getAll(shopId); setInvoices(res.invoices) } catch {}
  }

  const onCreateInvoice = async (data: InvoiceFormData) => {
    setLoading(true)
    setError("")
    try {
      const items = data.items.map(it => {
        const p = products.find(pr => pr.id === it.productId)
        return { description: p?.name || "Item", quantity: Number(it.quantity) || 0, unitPrice: Number(it.price) || 0 }
      })
      const body: Omit<ApiInvoice, 'id' | 'createdAt' | 'updatedAt'> = {
        shopId: shopId || "",
        customerName: data.customerName,
        items,
        subtotal: items.reduce((s, i) => s + i.quantity * i.unitPrice, 0),
        tax: 0,
        total: items.reduce((s, i) => s + i.quantity * i.unitPrice, 0),
        dueDate: data.dueDate,
        status: (editing ? editing.status : "sent") as ApiInvoice['status'],
      }
      if (editing) { await invoicesApi.update(editing.id, body) } else { await invoicesApi.create(body) }
      await refreshInvoices()
      reset(); setEditing(null); setShowCreate(false)
    } catch (e: any) {
      setError(e?.message || "Failed to save invoice")
    } finally { setLoading(false) }
  }

  const onQuickSale = async (data: QuickSaleFormData) => {
    setLoading(true)
    setError("")
    try {
      const items = data.items.map(it => {
        const p = products.find(pr => pr.id === it.productId)
        return { description: p?.name || "Item", quantity: Number(it.quantity) || 0, unitPrice: Number(it.price) || 0 }
      })
      const body: Omit<ApiInvoice, 'id' | 'createdAt' | 'updatedAt'> = {
        shopId: shopId || "",
        customerName: data.customerName || "Walk-in Customer",
        items,
        subtotal: items.reduce((s, i) => s + i.quantity * i.unitPrice, 0),
        tax: (userData?.shop?.vatRate || 0) * items.reduce((s, i) => s + i.quantity * i.unitPrice, 0),
        total: items.reduce((s, i) => s + i.quantity * i.unitPrice * (1 + (userData?.shop?.vatRate || 0)), 0),
        status: "paid",
      }
      await invoicesApi.create(body)
      await refreshInvoices()
      resetSale(); setShowQuickSale(false)
    } catch (e: any) { setError(e?.message || "Failed to complete sale") } finally { setLoading(false) }
  }

  const onDelete = async (id: string) => {
    setLoading(true)
    try { await invoicesApi.delete(id); await refreshInvoices() } catch (e: any) { setError(e?.message || "Delete failed") } finally { setLoading(false) }
  }

  const onStatusChange = async (id: string, status: Status) => {
    setLoading(true)
    try {
      if (status === "paid") { await invoicesApi.markAsPaid(id) } else { await invoicesApi.update(id, { status }) }
      await refreshInvoices()
    } catch (e: any) { setError(e?.message || "Status update failed") } finally { setLoading(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Invoices</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-300">Create invoices and quick sales</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700" onClick={() => { resetSale({ items: [{ productId: "", quantity: 1, price: 0 }] }); setShowQuickSale(true) }}>Quick Sale</button>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700" onClick={() => { setEditing(null); reset({ items: [{ productId: "", quantity: 1, price: 0 }] }); setShowCreate(true) }}>New Invoice</button>
        </div>
      </div>

      <div className="rounded-lg border p-4 bg-white dark:bg-gray-800 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by customer or number" className="pl-9 pr-3 py-2 w-full border rounded-md dark:bg-gray-800 dark:border-gray-700" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700">
            <option value="all">All</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="void">Void</option>
          </select>
        </div>
      </div>

      <div className="rounded-lg border overflow-x-auto bg-white dark:bg-gray-800 dark:border-gray-700">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Invoice</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-gray-700">
          {filtered.map(inv => (
  <tr key={inv.id || inv._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
    <td className="px-6 py-3">
      {(inv as any).invoiceNumber ||
        ((inv.id || inv._id || '').slice(0, 8).toUpperCase())}
    </td>
    <td className="px-6 py-3">{inv.customerName}</td>
    <td className="px-6 py-3 font-semibold">
      {(inv.total || 0).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}
    </td>
    <td className="px-6 py-3">
      <span
        className={`px-2.5 py-0.5 rounded-full text-xs ${
          inv.status === "paid"
            ? "bg-green-100 text-green-800"
            : inv.status === "void"
            ? "bg-red-100 text-red-800"
            : "bg-blue-100 text-blue-800"
        }`}
      >
        {inv.status?.toUpperCase?.() || "SENT"}
      </span>
    </td>
    <td className="px-6 py-3">
      {inv.createdAt ? format(new Date(inv.createdAt), "MMM dd, yyyy") : "N/A"}
    </td>
    <td className="px-6 py-3 flex gap-2">
      <button
        className="px-2 py-1 border rounded"
        onClick={() => {
          setEditing(inv);
          setShowCreate(true);
          reset({
            customerName: inv.customerName,
            dueDate: inv.dueDate
              ? format(new Date(inv.dueDate), "yyyy-MM-dd")
              : "",
            items:
              inv.items?.map((it) => ({
                productId: "",
                quantity: it.quantity,
                price: it.unitPrice,
              })) || [],
          });
        }}
      >
        Edit
      </button>
      <button
        className="px-2 py-1 border rounded"
        onClick={() => onDelete(inv.id || inv._id)}
      >
        Delete
      </button>
      <select
        value={inv.status}
        onChange={(e) => onStatusChange(inv.id || inv._id, e.target.value as Status)}
        className="px-2 py-1 border rounded"
      >
        <option value="sent">Sent</option>
        <option value="paid">Paid</option>
        <option value="void">Void</option>
      </select>
    </td>
  </tr>
))}

            {filtered.length === 0 && (
              <tr><td className="px-6 py-8 text-center text-gray-500" colSpan={6}>No invoices found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 dark:border dark:border-gray-700 rounded-lg w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{editing ? "Edit Invoice" : "New Invoice"}</h2>
              <button className="p-2" onClick={() => { setShowCreate(false); setEditing(null); reset() }}><X size={18} /></button>
            </div>
            {error && <div className="m-4 px-3 py-2 rounded bg-red-50 border border-red-200 text-red-700">{error}</div>}
            <form onSubmit={handleSubmit(onCreateInvoice)} className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1">Customer Name</label>
                  <input className="w-full border rounded px-3 py-2" {...register("customerName", { required: "Required" })} />
                  {errors.customerName && <p className="text-sm text-red-600 mt-1">{errors.customerName.message}</p>}
                </div>
                <div>
                  <label className="block text-sm mb-1">Due Date</label>
                  <input type="date" className="w-full border rounded px-3 py-2" {...register("dueDate")} />
                </div>
              </div>

              <div className="border rounded">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs">Product</th>
                      <th className="px-3 py-2 text-left text-xs">Qty</th>
                      <th className="px-3 py-2 text-left text-xs">Price</th>
                      <th className="px-3 py-2 text-left text-xs">Total</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((f, idx) => (
                      <tr key={f.id}>
                        <td className="px-3 py-2">
                          <select className="w-full border rounded px-2 py-1" {...register(`items.${idx}.productId`, { required: "Select product", onChange: (e) => { const p = products.find(pr => pr.id === e.target.value); setValue(`items.${idx}.price`, Number(p?.price || 0), { shouldValidate: true, shouldDirty: true }) } })}>
                            <option value="">Select product</option>
                            {products.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
                          </select>
                        </td>
                        <td className="px-3 py-2"><input type="number" min={1} className="w-full border rounded px-2 py-1" {...register(`items.${idx}.quantity`, { valueAsNumber: true, min: 1 })} /></td>
                        <td className="px-3 py-2"><input type="number" step="0.01" className="w-full border rounded px-2 py-1" {...register(`items.${idx}.price`, { valueAsNumber: true, min: 0 })} /></td>
                        <td className="px-3 py-2 font-medium">{((watchedItems[idx]?.quantity || 0) * (watchedItems[idx]?.price || 0)).toFixed(2)}</td>
                        <td className="px-3 py-2">{fields.length > 1 && (<button type="button" className="text-red-600" onClick={() => remove(idx)}><Trash2 size={16} /></button>)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="p-2 bg-gray-50"><button type="button" className="text-blue-600" onClick={() => append({ productId: "", quantity: 1, price: 0 })}>+ Add Item</button></div>
              </div>

              <div className="flex justify-end items-center gap-4">
                <div className="text-sm">Subtotal: <span className="font-semibold">{subtotal.toFixed(2)}</span></div>
                <div className="text-sm">Tax: <span className="font-semibold">{tax.toFixed(2)}</span></div>
                <div className="text-base">Total: <span className="font-semibold">{total.toFixed(2)}</span></div>
              </div>

              <div className="flex justify-end gap-3">
                <button type="button" className="px-4 py-2 border rounded" onClick={() => { setShowCreate(false); setEditing(null); reset() }}>Cancel</button>
                <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded flex items-center gap-2"><Save size={18} /> {editing ? "Update" : "Create"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showQuickSale && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 dark:border dark:border-gray-700 rounded-lg w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Quick Sale</h2>
              <button className="p-2" onClick={() => { setShowQuickSale(false); resetSale() }}><X size={18} /></button>
            </div>
            {error && <div className="m-4 px-3 py-2 rounded bg-red-50 border border-red-200 text-red-700">{error}</div>}
            <form onSubmit={handleSubmitSale(onQuickSale)} className="p-4 space-y-4">
              <div>
                <label className="block text-sm mb-1">Customer (optional)</label>
                <input className="w-full border rounded px-3 py-2" {...registerSale("customerName")} />
              </div>

              <div className="border rounded">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs">Product</th>
                      <th className="px-3 py-2 text-left text-xs">Qty</th>
                      <th className="px-3 py-2 text-left text-xs">Price</th>
                      <th className="px-3 py-2 text-left text-xs">Total</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {saleFields.map((f, idx) => (
                      <tr key={f.id}>
                        <td className="px-3 py-2">
                          <select className="w-full border rounded px-2 py-1" {...registerSale(`items.${idx}.productId`, { required: "Select product", onChange: (e) => { const p = products.find(pr => pr.id === e.target.value); setValueSale(`items.${idx}.price`, Number(p?.price || 0), { shouldValidate: true, shouldDirty: true }) } })}>
                            <option value="">Select product</option>
                            {products.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
                          </select>
                        </td>
                        <td className="px-3 py-2"><input type="number" min={1} className="w-full border rounded px-2 py-1" {...registerSale(`items.${idx}.quantity`, { valueAsNumber: true, min: 1 })} /></td>
                        <td className="px-3 py-2"><input type="number" step="0.01" className="w-full border rounded px-2 py-1" {...registerSale(`items.${idx}.price`, { valueAsNumber: true, min: 0 })} /></td>
                        <td className="px-3 py-2 font-medium">{((watchedSaleItems[idx]?.quantity || 0) * (watchedSaleItems[idx]?.price || 0)).toFixed(2)}</td>
                        <td className="px-3 py-2">{saleFields.length > 1 && (<button type="button" className="text-red-600" onClick={() => removeSale(idx)}><Trash2 size={16} /></button>)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="p-2 bg-gray-50"><button type="button" className="text-blue-600" onClick={() => appendSale({ productId: "", quantity: 1, price: 0 })}>+ Add Item</button></div>
              </div>

              <div className="flex justify-end items-center gap-4">
                <div className="text-sm">Subtotal: <span className="font-semibold">{saleSubtotal.toFixed(2)}</span></div>
                <div className="text-sm">Tax: <span className="font-semibold">{saleTax.toFixed(2)}</span></div>
                <div className="text-base">Total: <span className="font-semibold">{saleTotal.toFixed(2)}</span></div>
              </div>

              <div className="flex justify-end gap-3">
                <button type="button" className="px-4 py-2 border rounded" onClick={() => { setShowQuickSale(false); resetSale() }}>Cancel</button>
                <button type="submit" disabled={loading} className="px-4 py-2 bg-green-600 text-white rounded flex items-center gap-2"><ShoppingCart size={18} /> Complete Sale</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading && (
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-b-transparent border-blue-600"></div>
        </div>
      )}
    </div>
  )
}

export default Invoices
